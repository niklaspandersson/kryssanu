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
    window.google?.accounts.id.initialize({
      client_id:
        "142613352055-mqn3r2g8qu40ldglfpa3j6eghokug6uh.apps.googleusercontent.com",
      login_uri: "https://kryssa.nu:8000/login_redirect/",
      callback: (res) => console.log(res),
      ux_mode: "redirect",
    });

    window.google?.accounts.id.renderButton(
      document.getElementById("sign-in")!,
      { theme: "filled_black", shape: "pill", size: "large" }
    );
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
