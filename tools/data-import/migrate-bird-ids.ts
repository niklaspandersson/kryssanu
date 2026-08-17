// Moves existing observations onto Sverigelistan's AviList bird ids.
//
// Bird.id is the latin name, so every taxon AviList renamed, lumped or split
// changes primary key, and Observation.birdId has to follow. Run this AFTER
// `npm run db:seed` has loaded the new catalog, so the target rows exist.
//
// Ids are matched in three steps:
//   1. unchanged      — the latin name is identical in AviList (449 of 501)
//   2. swedish name   — the taxon kept its Swedish name but moved genus, or was
//                       lumped and now sits at subspecies rank (43 taxa;
//                       gråkråka -> corvus corone cornix, snösiska ->
//                       acanthis flammea exilipes)
//   3. RENAMES below  — the remainder, where the Swedish name changed too and
//                       a human had to confirm the taxon is really the same
//
// Whatever is left is no longer on Sverigelistan. Those Bird rows are kept so
// their observations stay intact — an observation is a historical record, and
// RK delisting a taxon does not mean the bird was never seen.
//
// Run: npx tsx tools/data-import/migrate-bird-ids.ts          (dry run)
//      npx tsx tools/data-import/migrate-bird-ids.ts --apply

import { readFile } from "fs/promises";
import { PrismaClient } from "@prisma/client";

const CATALOG_PATH = new URL("./birds.json", import.meta.url);

/** Hand-checked against the 2026 spreadsheet: same bird, new name. */
const RENAMES: Record<string, string> = {
  // Genus moves that also changed the Swedish name.
  "charadrius mongolus": "anarhynchus mongolus", // mongolpipare -> kamtjatkapipare
  "puffinus griseus": "ardenna grisea", // grå lira -> grålira
  // Lumped into another species; the taxon survives at subspecies rank.
  "puffinus mauretanicus": "puffinus yelkouan mauretanicus", // balearlira -> balearisk lira
};

/** No longer on Sverigelistan in any category. Listed explicitly so an
 * unexpected new gap shows up as an error rather than being silently kept.
 *   pterodroma feae       only survives inside the combined "madeira / feae /
 *                         deserta" row, which is not a loggable taxon
 *   calandrella rufescens not a rename — the Swedish records are now
 *                         Alaudala heinei (turkestanlärka), a different taxon,
 *                         so observations are left where they are
 */
const DELISTED = [
  "calandrella rufescens",
  "lanius meridionalis",
  "oxyura leucocephala",
  "pterodroma feae",
  "sylvia rueppelli",
  "turdus ruficollis",
];

interface Taxon {
  id: string;
  swedish: string;
}

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

const catalog: Taxon[] = JSON.parse(await readFile(CATALOG_PATH, "utf-8"));
const catalogIds = new Set(catalog.map((t) => t.id));
const bySwedish = new Map<string, string[]>();
for (const taxon of catalog) {
  bySwedish.set(taxon.swedish, [...(bySwedish.get(taxon.swedish) ?? []), taxon.id]);
}

const birds = await prisma.bird.findMany({ select: { id: true, swedish: true } });
const counts = new Map(
  (await prisma.observation.groupBy({ by: ["birdId"], _count: { _all: true } })).map(
    (row) => [row.birdId, row._count._all] as const,
  ),
);
console.log(`${birds.length} birds in the database, ${catalogIds.size} taxa in Sverigelistan.\n`);

const missingTargets = Object.values(RENAMES).filter((id) => !catalogIds.has(id));
if (missingTargets.length > 0) {
  console.error(`Rename targets missing from the catalog: ${missingTargets.join(", ")}`);
  console.error("Re-run tools/data-import/import-sverigelistan.ts first.");
  process.exit(1);
}

const renames: [string, string, string, number][] = [];
const delisted: [string, number][] = [];

for (const bird of birds) {
  if (catalogIds.has(bird.id)) continue; // id unchanged

  const observations = counts.get(bird.id) ?? 0;
  const override = RENAMES[bird.id];
  if (override) {
    renames.push([bird.id, override, "renames-table", observations]);
    continue;
  }

  const candidates = bySwedish.get(bird.swedish) ?? [];
  if (candidates.length === 1) {
    renames.push([bird.id, candidates[0]!, "swedish-name", observations]);
    continue;
  }
  if (candidates.length > 1) {
    // Never guess: a Swedish name shared by several taxa cannot identify one.
    console.error(`  ! ${bird.id} (${bird.swedish}) matches ${candidates.length} taxa: ${candidates.join(", ")}`);
  }
  delisted.push([bird.id, observations]);
}

const unexpected = delisted.filter(([id]) => !DELISTED.includes(id));
const affected = renames.reduce((sum, [, , , n]) => sum + n, 0);

console.log(`ids unchanged:        ${birds.length - renames.length - delisted.length}`);
console.log(`ids to rewrite:       ${renames.length}  (${affected} observations)`);
console.log(`no longer listed:     ${delisted.length}  (${delisted.reduce((s, [, n]) => s + n, 0)} observations, kept as-is)`);

for (const [from, to, how, observations] of renames) {
  if (observations > 0) console.log(`  ${from}  ->  ${to}  [${how}]  ${observations} obs`);
}
if (unexpected.length > 0) {
  console.log(`\n  ! ${unexpected.length} bird(s) fell off the list unexpectedly — check before applying:`);
  for (const [id, observations] of unexpected) console.log(`    ${id} (${observations} obs)`);
}

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write these changes.");
  await prisma.$disconnect();
  process.exit(0);
}
if (unexpected.length > 0) {
  console.error("\nRefusing to apply while unexpected delistings are present.");
  console.error("Add them to RENAMES or DELISTED once you have checked the spreadsheet.");
  await prisma.$disconnect();
  process.exit(1);
}

// One transaction: a half-migrated catalog would leave observations pointing at
// ids that no longer exist.
await prisma.$transaction(async (tx) => {
  for (const [from, to] of renames) {
    await tx.observation.updateMany({ where: { birdId: from }, data: { birdId: to } });
    await tx.bird.delete({ where: { id: from } });
  }
  // Kept, not deleted — their observations are still valid history. Flagging
  // them is what keeps them out of search when logging something new.
  await tx.bird.updateMany({
    where: { id: { in: delisted.map(([id]) => id) } },
    data: { delisted: true },
  });
});

console.log(`\nRewrote ${affected} observations and removed ${renames.length} superseded bird rows.`);
console.log(`Flagged ${delisted.length} bird(s) as no longer listed.`);
await prisma.$disconnect();
