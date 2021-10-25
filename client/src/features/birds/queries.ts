import { gql } from '@apollo/client';

const GET_BIRDS = gql`
query GetBirds {
    birds {
      id
      name
      family
      rare
    }
  }
`;

const REGISTER_OBSERVATION = gql`
  mutation AddObservation($data: ObservationInput!) {
    addObservation(data: $data) {
      birdId
    }
  }
`;

export { GET_BIRDS, REGISTER_OBSERVATION };