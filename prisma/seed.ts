import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';

/** One taxon as written by tools/data-import/import-sverigelistan.ts. */
interface Taxon {
  id: string;
  parentId: string | null;
  swedish: string;
  english: string | null;
  family: string;
  familyLatin: string;
  orderLatin: string;
  orderSwedish: string;
  kategori: string;
  status: string;
  extinct: boolean;
}

async function readCatalog(path: string): Promise<Taxon[]> {
  return JSON.parse(await readFile(path, 'utf-8'));
}

const prisma = new PrismaClient();

async function main() {
  const taxa = await readCatalog('tools/data-import/birds.json');
  console.log(`Seeding ${taxa.length} birds...`);

  // Species before subspecies: parentId is a self-relation, so the species row
  // has to exist before a subspecies can point at it.
  const ordered = [...taxa.filter(t => !t.parentId), ...taxa.filter(t => t.parentId)];

  let count = 0;
  for (const taxon of ordered) {
    // delisted is absent from the catalog on purpose: it is owned by
    // tools/data-import/migrate-bird-ids.ts, which marks taxa that dropped off
    // the list, and a reseed must not resurrect them.
    await prisma.bird.upsert({
      where: { id: taxon.id },
      create: taxon,
      update: taxon,
    });
    count++;
  }
  console.log(`Upserted ${count} birds.`);

  const stale = await prisma.bird.findMany({
    where: { id: { notIn: taxa.map(t => t.id) }, delisted: false },
    select: { id: true, swedish: true },
  });
  if (stale.length > 0) {
    console.log(`\n${stale.length} bird(s) in the database are not on the current list:`);
    for (const bird of stale) console.log(`  ${bird.id} (${bird.swedish})`);
    console.log('Run tools/data-import/migrate-bird-ids.ts to remap or flag them.');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async e => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
