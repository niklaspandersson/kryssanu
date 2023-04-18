import { useMutation, useQuery, gql } from '@apollo/client';
import { useCallback, useMemo } from 'react';
import { GET_BIRDS, REGISTER_OBSERVATION } from './queries';
import { Bird, Family, SearchState } from './types';

function birdFilter(filter: SearchState) {
  const str = filter.searchString?.toLocaleLowerCase();
  const rareFilter = filter.rare
    ? (_: Bird) => true
    : (bird: Bird) => !bird.rare;
  return str
    ? (bird: Bird) =>
        rareFilter(bird) &&
        (bird.name.includes(str) || bird.family.includes(str))
    : (bird: Bird) => rareFilter(bird);
}

function birdsByFamily(allBirds: Bird[], filter: SearchState) {
  const birds = allBirds.filter(birdFilter(filter));
  const families = birds.reduce<Record<string, Bird[]>>((agg, bird) => {
    if (!agg[bird.family]) agg[bird.family] = [];
    agg[bird.family].push(bird);
    return agg;
  }, {});
  return Object.entries(families).reduce<Family[]>((agg, [family, birds]) => {
    agg.push({
      name: family,
      birds: birds.sort((a, b) => a.name.localeCompare(b.name)),
    });
    return agg;
  }, []);
}

function useFilteredBirdByFamilies(filter: SearchState) {
  const { data } = useQuery(GET_BIRDS);
  const families = useMemo(
    () => birdsByFamily(data?.birds ?? [], filter),
    [data?.birds, filter]
  );
  return families;
}

const UPDATE_BIRD_OBSERVED = gql`
  fragment UpdateBird on Bird {
    observed
  }
`;
function useRegisterObservation(birdId: string) {
  const [registerObservation] = useMutation(REGISTER_OBSERVATION);
  const doRegisterObservation = useCallback(() => {
    registerObservation({
      variables: {
        data: { birdId },
      },
      update(cache) {
        cache.writeFragment({
          fragment: UPDATE_BIRD_OBSERVED,
          data: {
            observed: true,
          },
          id: `Bird:${birdId}`,
        });
      },
    });
  }, [registerObservation, birdId]);

  return doRegisterObservation;
}

export { useFilteredBirdByFamilies, useRegisterObservation };
