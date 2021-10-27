import { useEffect } from 'react';
import View from "../components/View";

function Welcome() {
  useEffect(() => {
    if (process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      window.google?.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: async (res) => {
          console.log(res);
          if (res.credential) {
            const idToken = res.credential;
            await fetch("/auth/google_login", {
              method: "POST",
              body: new URLSearchParams({ idToken }),
            });
          }
        },
        ux_mode: "popup",
      });

      window.google?.accounts.id.renderButton(
        document.getElementById("sign-in")!,
        { theme: "filled_black", shape: "pill", size: "large" }
      );
    }
  }, []);
  
  return (
    <View>
      <div id="sign-in" />
    </View>
  );
}

export default Welcome;