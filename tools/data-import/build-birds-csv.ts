// Regenerates tools/data-import/birds.csv from GBIF's public API
// (https://www.gbif.org/developer/species), which aggregates official
// checklists worldwide — including Sweden's own Artportalen observations.
//
// - Species list: GBIF Backbone Taxonomy, class Aves, rank SPECIES,
//   status ACCEPTED. Extinct species are skipped.
// - Swedish name: the shortest `language: "swe"` vernacular name GBIF has
//   for that species (shortest tends to be the unqualified/primary name
//   rather than a regional variant like "östlig X"). Falls back to the
//   shortest English name, then the Latin name, if no Swedish name exists.
// - onSwedishList: true if the species has at least one GBIF occurrence
//   record tagged country=SE. This is a real-data proxy for "has been
//   recorded in Sweden", not the official Raritetskommittén-approved list.
// - visitor: within onSwedishList species, a Sweden occurrence count at or
//   below VISITOR_OCCURRENCE_THRESHOLD is treated as a rarity/vagrant. Pure
//   heuristic — retune the threshold (or hand-edit the CSV) if you have a
//   better source for Sweden's actual rarity classifications.
//
// Run: npx tsx tools/data-import/build-birds-csv.ts

import { writeFile } from "fs/promises";

const GBIF = "https://api.gbif.org/v1";
const BACKBONE_DATASET_KEY = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c";
const AVES_CLASS_KEY = 212;
const PAGE_SIZE = 300;
const PAGE_DELAY_MS = 150;
const VISITOR_OCCURRENCE_THRESHOLD = 50;
const OUTPUT_PATH = new URL("./birds.csv", import.meta.url);

type GbifVernacular = { vernacularName: string; language?: string };
type GbifSpecies = {
  key: number;
  canonicalName: string;
  family?: string;
  extinct?: boolean;
  vernacularNames?: GbifVernacular[];
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url: string, attempt = 1): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    if (attempt < 4) {
      await sleep(500 * attempt);
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`GBIF request failed (${res.status}): ${url}`);
  }
  return res.json();
}

async function fetchAllAvesSpecies(): Promise<GbifSpecies[]> {
  const species: GbifSpecies[] = [];
  let offset = 0;
  for (;;) {
    const url =
      `${GBIF}/species/search?rank=SPECIES&highertaxonKey=${AVES_CLASS_KEY}` +
      `&status=ACCEPTED&datasetKey=${BACKBONE_DATASET_KEY}&limit=${PAGE_SIZE}&offset=${offset}`;
    const page = await fetchJson(url);
    species.push(...page.results);
    console.log(`  fetched ${species.length}/${page.count} species...`);
    offset += PAGE_SIZE;
    if (offset >= page.count) break;
    await sleep(PAGE_DELAY_MS);
  }
  return species;
}

/** speciesKey -> number of GBIF occurrence records tagged country=SE. */
async function fetchSwedenOccurrenceCounts(): Promise<Map<number, number>> {
  const url =
    `${GBIF}/occurrence/search?country=SE&taxonKey=${AVES_CLASS_KEY}` +
    `&limit=0&facet=speciesKey&facetLimit=5000`;
  const data = await fetchJson(url);
  const counts = new Map<number, number>();
  for (const c of data.facets[0].counts) {
    counts.set(Number(c.name), c.count);
  }
  return counts;
}

function shortestName(names: GbifVernacular[] | undefined, language: string): string | null {
  const matches = (names ?? [])
    .filter((v) => v.language === language && v.vernacularName?.trim())
    .map((v) => v.vernacularName.trim());
  if (matches.length === 0) return null;
  return matches.sort((a, b) => a.length - b.length)[0];
}

/** The existing seed.ts parser is a naive comma-split with no escaping, so
 * strip characters that would break it instead of trying to escape them. */
function csvField(value: string): string {
  return `"${value.replace(/["\r\n]/g, "").replace(/,/g, " ")}"`;
}

async function main() {
  console.log("Fetching world bird species from the GBIF backbone taxonomy...");
  const allSpecies = await fetchAllAvesSpecies();

  console.log("Fetching Sweden occurrence counts...");
  const seCounts = await fetchSwedenOccurrenceCounts();

  const rows: string[] = [];
  const seenIds = new Set<string>();
  let skippedExtinct = 0;
  let skippedDuplicate = 0;
  let skippedIncomplete = 0;
  let missingSwedishName = 0;
  let rowIndex = 0;

  for (const sp of allSpecies) {
    if (sp.extinct) {
      skippedExtinct++;
      continue;
    }
    if (!sp.family || !sp.canonicalName) {
      skippedIncomplete++;
      continue;
    }

    const latin = sp.canonicalName.toLowerCase().trim();
    if (seenIds.has(latin)) {
      skippedDuplicate++;
      continue;
    }
    seenIds.add(latin);

    const sweName = shortestName(sp.vernacularNames, "swe");
    if (!sweName) missingSwedishName++;
    const swedish = (sweName ?? shortestName(sp.vernacularNames, "eng") ?? sp.canonicalName).toLowerCase();

    const family = sp.family.toLowerCase();
    const occurrenceCount = seCounts.get(sp.key);
    const onSwedishList = occurrenceCount !== undefined;
    const visitor = onSwedishList ? occurrenceCount! <= VISITOR_OCCURRENCE_THRESHOLD : true;

    rows.push(
      `${rowIndex},${csvField(latin)},${csvField(swedish)},${csvField(family)},${visitor ? 1 : 0},${onSwedishList ? 1 : 0}`,
    );
    rowIndex++;
  }

  await writeFile(OUTPUT_PATH, rows.join("\n") + "\n", "utf-8");

  console.log(`\nWrote ${rows.length} species to ${OUTPUT_PATH.pathname}`);
  console.log(`  on Sweden's list (>=1 SE occurrence record): ${seCounts.size}`);
  console.log(`  missing a Swedish vernacular name (used English/Latin instead): ${missingSwedishName}`);
  console.log(`  skipped as extinct: ${skippedExtinct}`);
  console.log(`  skipped as duplicate Latin name: ${skippedDuplicate}`);
  console.log(`  skipped as incomplete (no family/name): ${skippedIncomplete}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
