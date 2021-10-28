import { useEffect, useRef } from 'react';
import View from "../components/View";
import * as Config from '../config';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const GOOGLE_AUTH = gql`
  mutation GoogleLogin($token: String!) {
    googleLogin(token: $token) {
      name
    }
  }
`;

function Welcome() {
  const [loginWithGoogle] = useMutation(GOOGLE_AUTH, { refetchQueries: ['GetUser'] });
  const googleSignInButton = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (Config.GOOGLE_CLIENT_ID && googleSignInButton.current) {
      window.google?.accounts.id.initialize({
        client_id: Config.GOOGLE_CLIENT_ID,
        callback: async (res) => {
          console.log(res);
          if (res.credential) {
            const token = res.credential;
            loginWithGoogle({ variables: { token } })
          }
        },
        ux_mode: "popup",

      });

      window.google?.accounts.id.renderButton(
        googleSignInButton.current,
        { theme: "filled_black", shape: "pill", size: "large" }
      );
    }
  }, [loginWithGoogle]);
  
  return (
    <View>
      <div ref={googleSignInButton} />
    </View>
  );
}

export default Welcome;