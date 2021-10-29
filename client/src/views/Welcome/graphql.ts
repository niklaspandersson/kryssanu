import { gql } from '@apollo/client';

export const LOGIN_WITH_GOOGLE = gql`
  mutation GoogleLogin($token: String!) {
    googleLogin(token: $token) {
      name
    }
  }
`;
