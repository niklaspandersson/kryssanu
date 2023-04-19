import { gql, useQuery } from '@apollo/client';
import { Observation } from '../Listview/types';

const GET_OBSERVATIONS = gql`
  query GetObservations($birdId: String!) {
    observations(birdId: $birdId) {
      date
      listId
    }
  }
`;

export default function useObservations(birdId: string) {
  const { data } = useQuery(GET_OBSERVATIONS, {
    variables: {
      birdId,
    },
  });
  return data?.observations as Observation[];
}
