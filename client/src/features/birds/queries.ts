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

export { GET_BIRDS };