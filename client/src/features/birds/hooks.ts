import { useMutation, useQuery, gql } from '@apollo/client';
import { useCallback, useMemo } from 'react';
import { Bird, birdFilter, birdsByFamily } from '.';
import { useAppSelector } from '../../app/hooks';
import { GET_BIRDS, REGISTER_OBSERVATION } from './queries';

function useFilteredBirdByFamilies() {
  const { data } = useQuery(GET_BIRDS);
  const filter = useAppSelector(state => state.search);
  const families = useMemo(
    () => birdsByFamily(data?.birds ?? [], filter),
    [data?.birds, filter]
  );
  return families;
}

function useFilteredBirds() {
  const { data } = useQuery(GET_BIRDS);
  const filter = useAppSelector(state => state.search);
  const birds = useMemo<Bird[]>(
    () => (data?.birds ?? []).filter(birdFilter(filter)),
    [data?.birds, filter]
  );
  return birds;
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

export { useFilteredBirdByFamilies, useFilteredBirds, useRegisterObservation };
