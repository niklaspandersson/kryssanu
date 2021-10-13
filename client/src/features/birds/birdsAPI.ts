import { Bird } from "./types"


export async function fetchBirds() {
  const res = await fetch('birds.json');
  const list = await res.json() as any[];

  return list.filter(b => !b.rare).map<Bird>(b => ({
    name: b.swedish,
    family: b.family?.toLocaleLowerCase(),
  }));
}