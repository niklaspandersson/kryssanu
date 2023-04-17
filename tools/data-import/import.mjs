import { readFile, writeFile } from 'fs/promises';

async function main() {
  const birds = await importBirds("birds.csv");
  const observations = await importObservations("niklas-observations.csv");
  observations.forEach(o => {
    delete o.id;
    o.birdId = birds.get(o.birdId).latin;
    o.date = o.date ? new Date(o.date) : "1970-01-01T00:00:00.000Z";
  })
  // console.dir(observations);
  await writeFile("observations.json", JSON.stringify(observations, undefined, 2), "utf-8");
}

async function importObservations(path) {
  const regex = /(\d+),'([\w\såäöÅÄÖ,]*)',(NULL|'[\d-\s:.]+'),(NULL|'[\w\såäöÅÄÖ,]+'),(\d+)/g;

  const text = await readFile(path, "utf-8");
  const rows = text.split("\n");
  const observations = rows.map(row => {
    const match = row.matchAll(regex);
    const parts = [...match][0];
    const id = parseInt(parts[1], 10);
    const date = parts[3];
    const note = parts[4];
    return ({
      id,
      location: parts[2].toLocaleLowerCase().trim(),
      date: (date === "NULL") ? null : date.slice(1, -1).toLocaleLowerCase(),
      note: (note === "NULL") ? null : note.slice(1, -1).toLocaleLowerCase().trim(),
      birdId: parseInt(parts[5], 10)
    })
  });
  return observations;
}

async function importBirds(path) {
  const text = await readFile(path, "utf-8");
  const rows = text.split("\n");
  const birdTuples = rows.map(row => {
    const parts = row.split(",");
    const id = parseInt(parts[0], 10);
    return ([id, {
      id,
      latin: parts[1].slice(1, -1).toLocaleLowerCase(),
      swedish: parts[2].slice(1, -1).toLocaleLowerCase()
    }])
  });
  return new Map(birdTuples);
}

main().then(() => console.log("Done!"));