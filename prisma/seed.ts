import { type Bird, PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';

async function importBirds(path: string) {
  const text = await readFile(path, 'utf-8');
  const rows = text.split('\n').filter(r => r.trim());
  const birds: Bird[] = rows.map(row => {
    const parts = row.split(',');
    const latin = parts[1]!.slice(1, -1).toLocaleLowerCase();
    const swedish = parts[2]!.slice(1, -1).toLocaleLowerCase();
    const family = parts[3]!.slice(1, -1).toLocaleLowerCase();
    const visitor = parts[4] === '1';
    return { id: latin, swedish, family, visitor };
  });
  return birds;
}

const prisma = new PrismaClient();

async function main() {
  const birds = await importBirds('tools/data-import/birds.csv');
  console.log(`Seeding ${birds.length} birds...`);
  const res = await prisma.bird.createMany({
    data: birds,
    // skipDuplicates: true,
  });
  console.log(`Created ${res.count} new birds.`);
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
