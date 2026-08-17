// Builds tools/data-import/birds.json from Sverigelistan — BirdLife Sveriges
// "Förteckning över Sveriges fågeltaxa", the official Swedish bird list.
//
// Taxonomy and Swedish names come from Taxonomikommittén (TK) and follow
// AviList; categories and status come from Raritetskommittén (RK). This is the
// single source of truth for the bird catalog.
//
// Values are read straight from the spreadsheet with two exceptions, both of
// which exist because it records each category and status once, on whichever
// row owns it: resolveMetadata below propagates them between a species and its
// subspecies, and MISSING_METADATA covers the single taxon that has neither.
//
// The list is published once a year. To sync:
//   1. check https://birdlife.se/tk/vastpalearktislistan/sverige-underarter/
//      for the new .xlsx link and update SOURCE_URL,
//   2. run this script, which caches the download next to the output,
//   3. run `npm run db:seed`,
//   4. run tools/data-import/migrate-bird-ids.ts to move observations of any
//      taxon that AviList renamed, lumped or split.
//
// Sheet layout (see the legend at the foot of the spreadsheet):
//   col 1 RK      X = reviewed by Raritetskommittén
//   col 2 KAT.    fyndkategori A-E, per AERC definitions
//   col 3 STATUS  H häckfågel, h oklar/oregelbunden häckning,
//                 F flyttfågel, T tillfällig, R raritet (<100 fynd).
//                 Blank on kategori E taxa, which we store as I, see INTRODUCED.
//   col 4 FYND    number of records, when below 100
//   col 5 name    ORDER (uppercase) / Family / Genus species / + subspecies
//   col 6 svenskt namn      col 7 engelskt namn      col 8 noter
//
// Run: npx tsx tools/data-import/import-sverigelistan.ts

import { readFile, writeFile } from "fs/promises";
import { readSheet } from "./xlsx.js";

const SOURCE_URL = "https://cdn.birdlife.se/wp-content/uploads/2026/04/Sverigelista-2026.xlsx";
const CACHE_PATH = new URL("./sverigelista.xlsx", import.meta.url);
const OUTPUT_PATH = new URL("./birds.json", import.meta.url);

/** Section headings in column 1 that switch which fyndkategori block we are in.
 * Matching on the heading rather than a row number keeps this working when next
 * year's edition shifts rows around. */
const SECTIONS: [RegExp, string][] = [
  [/^OFFICIELLA SVENSKA FÅGELLISTAN/i, "A-C"],
  [/^ARTER I KATEGORI D/i, "D"],
  [/^ARTER I KATEGORI E/i, "E"],
];
/** Everything from here down is the AviList reference, legend and footnotes. */
const END_OF_LIST = /^REFERENS FÖR AVILIST/i;

/** Fyndkategori, strongest first: A is the main list, E an escape. A species
 * listed in several categories through its subspecies takes the strongest. */
const KATEGORI_ORDER = ["A", "B", "C", "D", "E"];
/**
 * Status given to every kategori E taxon. Raritetskommittén assigns escapes and
 * introductions no Swedish status of their own — H/h/F/T/R all describe how a
 * wild bird occurs here — so this one value is ours, not the spreadsheet's, and
 * exists so status is never empty.
 */
const INTRODUCED = "I";
/** Status, most established first — the order the spreadsheet's own legend
 * uses, with I appended. A species takes the most established status among its
 * subspecies, so Branta bernicla (T, F, T) is F rather than T. */
const STATUS_ORDER = ["H", "h", "F", "T", "R", INTRODUCED];

/**
 * Taxa the spreadsheet leaves without a category or status that cannot be
 * filled by rolling up subspecies, because there are none.
 *
 * Falco vespertinus is the only one in the 2026 edition, and it looks like an
 * oversight: its row is blank where every neighbouring monotypic species
 * carries values. The values below are inferred, NOT read from the source —
 * aftonfalk is on the main list (A), and since the row carries neither an RK
 * mark nor a record count it is not a raritet, nor does it breed here, which
 * leaves T (tillfällig). Re-check this against each new edition.
 */
const MISSING_METADATA: Record<string, { kategori: string; status: string }> = {
  "falco vespertinus": { kategori: "A", status: "T" },
};

interface Taxon {
  id: string;
  /** The species a subspecies belongs to; null on species. Rank is this field:
   * a bird with a parent is a subspecies. */
  parentId: string | null;
  swedish: string;
  english: string | null;
  family: string;
  familyLatin: string;
  orderLatin: string;
  orderSwedish: string;
  /** Fyndkategori A-E. Rolled up from subspecies on species rows the
   * spreadsheet leaves blank, so this is never null. */
  kategori: string;
  /** H / h / F / T / R, see the header comment, or I for kategori E taxa.
   * Rolled up as kategori is, so never null. */
  status: string;
  extinct: boolean;
}

/** A taxon mid-parse, before blank categories have been rolled up. */
type ParsedTaxon = Omit<Taxon, "kategori" | "status"> & {
  kategori: string | null;
  status: string | null;
};

async function loadWorkbook(): Promise<Buffer> {
  try {
    const cached = await readFile(CACHE_PATH);
    console.log(`Using cached ${CACHE_PATH.pathname} (${cached.length} bytes)`);
    return cached;
  } catch {
    console.log(`Downloading ${SOURCE_URL}...`);
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(CACHE_PATH, buffer);
    console.log(`  cached ${buffer.length} bytes to ${CACHE_PATH.pathname}`);
    return buffer;
  }
}

function main(rows: string[][]): { taxa: ParsedTaxon[]; skipped: string[] } {
  const taxa: ParsedTaxon[] = [];
  const skipped: string[] = [];

  let section: string | null = null;
  let orderLatin = "";
  let orderSwedish = "";
  let familyLatin = "";
  let family = "";

  for (const row of rows) {
    // Columns 1 (RK) and 4 (FYND) are read past: the catalog does not store
    // who reviews a taxon or how many records it has.
    const [, kategori = "", status = "", , latin = "", swedish = "", english = "", notes = ""] =
      row.map((cell) => cell ?? "");

    if (END_OF_LIST.test(row[0] ?? "")) break;
    const heading = SECTIONS.find(([pattern]) => pattern.test(row[0] ?? ""));
    if (heading) {
      section = heading[1];
      continue;
    }
    if (section === null || !latin) continue;
    if (kategori === "KAT." || latin === "[Scientific Name]") continue; // repeated headers

    // "Pterodroma madeira / feae / deserta" — records not determined to a
    // single taxon. They are not birds anyone can log, so they are dropped.
    if (latin.includes("/")) {
      skipped.push(`${latin} (${swedish})`);
      continue;
    }

    const words = latin.split(/\s+/);
    if (latin === latin.toUpperCase()) {
      orderLatin = latin.toLowerCase();
      orderSwedish = swedish.toLowerCase();
      continue;
    }
    if (words.length === 1) {
      familyLatin = latin.toLowerCase();
      family = swedish.toLowerCase();
      continue;
    }
    if (words.length !== 2 && words.length !== 3) {
      skipped.push(`${latin} (unexpected rank)`);
      continue;
    }

    const id = latin.toLowerCase();

    // A species is listed once per section it has records in — Neophron
    // percnopterus appears under A-C for ssp. percnopterus and again under D
    // for ssp. gingianus. Merge rather than emit it twice; the subspecies rows
    // carry the categories that differ.
    const existing = taxa.find((t) => t.id === id);
    if (existing) {
      existing.kategori ??= kategori || null;
      existing.status ??= status || null;
      continue;
    }

    taxa.push({
      id,
      parentId: words.length === 3 ? words.slice(0, 2).join(" ").toLowerCase() : null,
      swedish: swedish.toLowerCase(),
      english: english || null,
      family,
      familyLatin,
      orderLatin,
      orderSwedish,
      // Left null for now: a blank species row takes its values from its
      // subspecies in resolveMetadata below. The section is not a substitute,
      // since a species' subspecies can sit in different categories.
      kategori: kategori || null,
      status: status || null,
      extinct: notes.includes("†"),
    });
  }

  return { taxa, skipped };
}

/** The strongest value present, by the given precedence. */
function strongest(values: string[], order: string[]): string | null {
  const ranked = values
    .filter((value) => order.includes(value))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return ranked[0] ?? null;
}

/**
 * Fills in the categories and statuses the spreadsheet leaves blank. It records
 * each value once, on whichever row it belongs to, so this has to work in both
 * directions:
 *
 *   up   — a species with subspecies is left blank and takes the strongest
 *          value among them (Branta bernicla is blank; its subspecies are
 *          T, F and T, so it becomes F)
 *   down — a subspecies is blank where the species carries the value for the
 *          whole group (the three Lanius senator subspecies are each R with no
 *          category, while the species row is A, so they become A)
 *
 * Reports how many rows each direction filled, and which taxa are still
 * missing a value afterwards — the caller should refuse to write those.
 */
function resolveMetadata(taxa: ParsedTaxon[]): {
  unresolved: ParsedTaxon[];
  filledUp: number;
  filledDown: number;
  overridden: number;
  introduced: number;
} {
  const byId = new Map(taxa.map((t) => [t.id, t]));
  const children = new Map<string, ParsedTaxon[]>();
  for (const taxon of taxa) {
    if (!taxon.parentId) continue;
    children.set(taxon.parentId, [...(children.get(taxon.parentId) ?? []), taxon]);
  }

  const incomplete = (t: ParsedTaxon) => !t.kategori || !t.status;
  let filledUp = 0;
  let filledDown = 0;
  let overridden = 0;

  for (const taxon of taxa) {
    const subspecies = children.get(taxon.id) ?? [];
    if (subspecies.length === 0) continue;
    const before = incomplete(taxon);
    taxon.kategori ??= strongest(
      subspecies.map((s) => s.kategori ?? ""),
      KATEGORI_ORDER,
    );
    taxon.status ??= strongest(
      subspecies.map((s) => s.status ?? ""),
      STATUS_ORDER,
    );
    if (before && !incomplete(taxon)) filledUp++;
  }

  // Second pass, so a subspecies can inherit a value its species only just
  // received from its siblings.
  for (const taxon of taxa) {
    const parent = taxon.parentId ? byId.get(taxon.parentId) : undefined;
    if (parent) {
      const before = incomplete(taxon);
      taxon.kategori ??= parent.kategori;
      taxon.status ??= parent.status;
      if (before && !incomplete(taxon)) filledDown++;
    }
    const override = MISSING_METADATA[taxon.id];
    if (override) {
      taxon.kategori ??= override.kategori;
      taxon.status ??= override.status;
      overridden++;
    }
  }

  // Escapes and introductions get the one status we define ourselves; nothing
  // in the spreadsheet's legend describes them.
  let introduced = 0;
  for (const taxon of taxa) {
    if (taxon.kategori === "E" && !taxon.status) {
      taxon.status = INTRODUCED;
      introduced++;
    }
  }

  const unresolved = taxa.filter((t) => !t.kategori || !t.status);
  return { unresolved, filledUp, filledDown, overridden, introduced };
}

const rows = readSheet(await loadWorkbook());
console.log(`Read ${rows.length} spreadsheet rows.\n`);

const { taxa, skipped } = main(rows);

const orphans = taxa.filter((t) => t.parentId && !taxa.some((p) => p.id === t.parentId));
for (const orphan of orphans) {
  console.log(`  ! subspecies with no species row: ${orphan.id}`);
}

const duplicates = taxa.filter((t, i) => taxa.findIndex((o) => o.id === t.id) !== i);
for (const duplicate of duplicates) {
  console.log(`  ! duplicate id: ${duplicate.id}`);
}

const { unresolved, filledUp, filledDown, overridden, introduced } = resolveMetadata(taxa);
if (unresolved.length > 0) {
  console.error(`\n${unresolved.length} taxa have no fyndkategori or status to inherit from anywhere:`);
  for (const taxon of unresolved) {
    console.error(`  ${taxon.id} (${taxon.swedish}) kategori=${taxon.kategori} status=${taxon.status}`);
  }
  console.error("Add them to MISSING_METADATA once you have checked the spreadsheet.");
  process.exit(1);
}

await writeFile(OUTPUT_PATH, JSON.stringify(taxa as Taxon[], null, 2) + "\n", "utf-8");

const species = taxa.filter((t) => !t.parentId);
const subspecies = taxa.filter((t) => t.parentId);
const count = (key: "kategori" | "status") =>
  Object.entries(
    taxa.reduce<Record<string, number>>((acc, t) => {
      const value = t[key];
      if (value) acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort()
    .map(([value, n]) => `${value}=${n}`)
    .join(" ");

console.log(`\nWrote ${taxa.length} taxa to ${OUTPUT_PATH.pathname}`);
console.log(`  species: ${species.length}   subspecies: ${subspecies.length}`);
console.log(`  families: ${new Set(taxa.map((t) => t.family)).size}   orders: ${new Set(taxa.map((t) => t.orderLatin)).size}`);
console.log(`  fyndkategori: ${count("kategori")}`);
console.log(`  status:       ${count("status")}`);
console.log(`  species completed from their subspecies: ${filledUp}`);
console.log(`  subspecies completed from their species:  ${filledDown}`);
console.log(`  filled from MISSING_METADATA:             ${overridden}`);
console.log(`  kategori E taxa given status I:            ${introduced}`);
console.log(`  skipped (undetermined/combined taxa): ${skipped.length}`);
for (const entry of skipped) console.log(`    ${entry}`);
