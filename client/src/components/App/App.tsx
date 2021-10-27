import React, { useEffect } from "react";
import styled, { StyledFC } from "styled-components";
import { useAppSelector } from "../../app/hooks";
import SearchBar from "../../features/search/SearchBar";
import ApplicationHeader from "../ApplicationHeader";
import List from "../List/FamilyList";
import Overlay from "../Overlay";

function MainContents() {
  const isSearching = useAppSelector((s) => s.search.searchString !== null);
  return (
    <main>
      <Overlay />
      {isSearching && <SearchBar />}
      <List />
    </main>
  );
}

function SignIn() {
  useEffect(() => {
    if (process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      window.google?.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        login_uri: "https://kryssa.nu:3000/login_redirect/",
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
  });
  return (
    <main>
      <div id="sign-in" />
    </main>
  );
}

const App: StyledFC = ({ className }) => {
  const isSignedIn = false;
  return (
    <div className={className}>
      <ApplicationHeader />
      {isSignedIn ? <MainContents /> : <SignIn />}
    </div>
  );
};

export default styled(App)`
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  main {
    position: relative;
    display: flex;
    overflow-y: hidden;
    flex-flow: column nowrap;
  }
`;
