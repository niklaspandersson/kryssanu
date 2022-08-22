import fs from 'fs/promises';

async function main() {
  const birds = JSON.parse(
    await fs.readFile('../data/sweden.json', { encoding: 'utf8' })
  );
  const imageData = JSON.parse(
    await fs.readFile('../data/result1.json', { encoding: 'utf8' })
  );

  imageData.forEach(data => {
    const birdIndex = birds.findIndex(
      bird => bird.latin.toLocaleLowerCase() === data.latin
    );
    delete data.categories;
    delete data.latin;
    birds[birdIndex].image = data;
  });

  await fs.writeFile('../data/sweden-aggregated.json', JSON.stringify(birds));
}

main()
  .then(() => console.log('Done!'))
  .catch(e => console.error(e));
