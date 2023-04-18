import useGoogleLogin from './useGoogleLogin';
function Welcome() {
  const googleSignInButton = useGoogleLogin();

  return (
    <>
      <div id="login-google" ref={googleSignInButton} />
    </>
  );
}

export default Welcome;
