import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { Bird, birdFilter, birdsByFamily } from '.';
import { useAppSelector } from '../../app/hooks';
import { GET_BIRDS } from './queries';

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
export { useFilteredBirdByFamilies, useFilteredBirds };
