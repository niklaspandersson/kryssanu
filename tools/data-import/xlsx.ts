// Minimal .xlsx reader — enough to read a single sheet of text cells.
//
// An .xlsx is a ZIP of XML parts. Node ships an inflater but no ZIP reader, so
// this walks the central directory itself rather than pulling in a dependency
// just to run the yearly bird import.

import { inflateRawSync } from "zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const STORED = 0;
const DEFLATED = 8;

/** Unpacks a ZIP archive into a map of entry name -> uncompressed bytes. */
function unzip(buffer: Buffer): Map<string, Buffer> {
  // The end-of-central-directory record sits at the tail, after a comment of
  // unknown length, so scan backwards for its signature.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a ZIP archive (no end-of-central-directory record)");

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  const entries = new Map<string, Buffer>();
  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(offset) !== CENTRAL_SIGNATURE) {
      throw new Error(`Corrupt ZIP central directory at entry ${i}`);
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf-8", offset + 46, offset + 46 + nameLength);

    // The local header repeats the name and extra fields, and its own extra
    // length may differ from the central one, so read it rather than assume.
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(start, start + compressedSize);

    if (method === STORED) entries.set(name, Buffer.from(raw));
    else if (method === DEFLATED) entries.set(name, inflateRawSync(raw));
    else throw new Error(`Unsupported ZIP compression method ${method} for ${name}`);

    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodeXml(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return ENTITIES[entity] ?? match;
  });
}

/** Concatenates every <t> in a fragment — shared strings split styled text
 * across multiple runs, and we only care about the plain text.
 *
 * Attribute captures are lazy throughout this file: a greedy [^>]* swallows the
 * slash of a self-closing <t/>, after which the match runs on to the next
 * closing tag and eats everything in between. */
function textOf(fragment: string): string {
  let out = "";
  for (const match of fragment.matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)) {
    out += decodeXml(match[1] ?? "");
  }
  return out;
}

/** "BC" -> 54. Column references are base-26 with A=1. */
function columnIndex(reference: string): number {
  const letters = /^[A-Z]+/.exec(reference)?.[0] ?? "A";
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

/** Reads a worksheet as rows of trimmed strings. Empty cells become "". */
export function readSheet(buffer: Buffer, sheetPath = "xl/worksheets/sheet1.xml"): string[][] {
  const entries = unzip(buffer);

  const sharedXml = entries.get("xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sharedXml) {
    for (const match of sharedXml.toString("utf-8").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(textOf(match[1]!));
    }
  }

  const sheetXml = entries.get(sheetPath);
  if (!sheetXml) throw new Error(`No ${sheetPath} in workbook`);

  const rows: string[][] = [];
  for (const rowMatch of sheetXml.toString("utf-8").matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const cells: string[] = [];
    for (const cellMatch of (rowMatch[1] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attributes = cellMatch[1]!;
      const body = cellMatch[2] ?? "";
      const reference = /r="([A-Z]+\d+)"/.exec(attributes)?.[1] ?? "A1";
      const type = /t="([^"]+)"/.exec(attributes)?.[1];

      let value: string;
      if (type === "s") {
        const index = Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "-1");
        value = shared[index] ?? "";
      } else if (type === "inlineStr") {
        value = textOf(body);
      } else {
        value = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "");
      }

      const index = columnIndex(reference);
      while (cells.length < index) cells.push("");
      cells[index] = value.trim();
    }
    rows.push(cells);
  }
  return rows;
}
