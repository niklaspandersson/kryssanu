import { useEffect, useRef } from 'react';
import View from '../../components/View';
import * as Config from '../../config';
import { useMutation } from '@apollo/client';
import { LOGIN_WITH_GOOGLE } from './graphql';

function Welcome() {
  const [loginWithGoogle] = useMutation(LOGIN_WITH_GOOGLE, {
    refetchQueries: ['GetUser'],
  });
  const googleSignInButton = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (Config.GOOGLE_CLIENT_ID && googleSignInButton.current) {
      window.google?.accounts.id.initialize({
        client_id: Config.GOOGLE_CLIENT_ID,
        callback: async res => {
          if (res.credential) {
            const token = res.credential;
            loginWithGoogle({ variables: { token } });
          }
        },
        ux_mode: 'popup',
      });

      window.google?.accounts.id.renderButton(googleSignInButton.current, {
        theme: 'filled_black',
        shape: 'pill',
        size: 'large',
      });
    }
  }, [loginWithGoogle, googleSignInButton]);

  return (
    <View>
      <div id="login-google" ref={googleSignInButton} />
    </View>
  );
}

export default Welcome;
