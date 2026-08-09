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
    const onSwedishList = parts[5] === undefined ? true : parts[5] === '1';
    return { id: latin, swedish, family, visitor, onSwedishList };
  });
  return birds;
}

const prisma = new PrismaClient();

async function main() {
  const birds = await importBirds('tools/data-import/birds.csv');
  console.log(`Seeding ${birds.length} birds...`);
  let count = 0;
  for (const bird of birds) {
    await prisma.bird.upsert({
      where: { id: bird.id },
      create: bird,
      update: bird,
    });
    count++;
  }
  console.log(`Upserted ${count} birds.`);
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
