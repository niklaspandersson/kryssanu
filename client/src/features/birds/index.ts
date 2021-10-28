import { Bird, Family } from './types';
import { SearchState } from '../search/searchSlice';

export function birdFilter(filter: SearchState) {
  const str = filter.searchString?.toLocaleLowerCase();
  const rareFilter = filter.rare ? (_:Bird) => true : (bird:Bird) => !bird.rare;
  return (str)
    ? (bird:Bird) => rareFilter(bird) && (bird.name.includes(str) || bird.family.includes(str))
    : (bird:Bird) => rareFilter(bird);
}

export function birdsByFamily(allBirds: Bird[], filter:SearchState) {
  const birds = allBirds.filter(birdFilter(filter));
  const families = birds.reduce<Record<string, Bird[]>>((agg, bird) => {
    if(!agg[bird.family])
      agg[bird.family] = [];
    agg[bird.family].push(bird);
    return agg;
  }, {});
  return Object.entries(families).reduce<Family[]>((agg, [family, birds]) => {
    agg.push({
      name: family,
      birds: birds.sort((a,b) => a.name.localeCompare(b.name)),
    })
    return agg;
  }, []);
}

export type { Bird, Family };