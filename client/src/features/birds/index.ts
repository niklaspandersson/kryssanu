import birdsReducer from './birdsSlice';
import { RootState } from '../../app/store';
import { Bird, Family } from './types';

function birdFilter(match:string|null = null) {
  const str = match?.toLocaleLowerCase();
  return (str)
    ? (bird:Bird) => (bird.name.includes(str) || bird.family.includes(str))
    : (bird:Bird) => true;
}

export function selectBirds(state: RootState) {
  return state.birds.birds;
}

export function selectBirdsByFamily(state:RootState) {
  const birds = selectBirds(state).filter(birdFilter(state.search.searchString));
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

export default birdsReducer;