import { type Bird, PrismaClient, Observation } from '@prisma/client';
import { readFile } from 'fs/promises';

async function importBirds(path: string) {
  const text = await readFile(path, 'utf-8');
  const rows = text.split('\n');
  const birds: Bird[] = rows.map(row => {
    const parts = row.split(',');
    const latin = parts[1]!.slice(1, -1).toLocaleLowerCase();
    const swedish = parts[2]!.slice(1, -1).toLocaleLowerCase();
    const family = parts[3]!.slice(1, -1).toLocaleLowerCase();
    const visitor = parts[4] === '1';
    return {
      id: latin,
      swedish,
      family,
      visitor,
    };
  });
  return birds;
}

async function importObservations(path: string) {
  const observationsText = await readFile(path, 'utf-8');
  const observations = JSON.parse(observationsText) as Observation[];

  return observations;
}

const prisma = new PrismaClient();
async function main() {
  // const birds = await importBirds('tools/data-import/birds.csv');
  // // console.log(birds);
  // const res = await prisma.bird.createMany({
  //   data: birds,
  // });

  const observations = await importObservations(
    'tools/data-import/observations.json'
  );
  const user = await prisma.user.findFirst({
    select: { id: true },
    where: { email: 'niklaspandersson.se@gmail.com' },
  });
  const userId = user!.id;
  // observations.forEach(o => {
  //   o.date = new Date(o.date || '2017-01-01T00:00:00.000Z');
  //   o.userId = userId;
  // });
  // console.log(observations);
  // const res = await prisma.observation.createMany({
  //   data: observations,
  // });
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
