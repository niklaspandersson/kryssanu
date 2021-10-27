import styled, { StyledFC } from "styled-components";
import { Checklist, Welcome } from "../../views";
import ApplicationHeader from "../ApplicationHeader";

const App: StyledFC = ({ className }) => {
  const isSignedIn = false;
  return (
    <div className={className}>
      <ApplicationHeader />
      {isSignedIn ? <Checklist /> : <Welcome />}
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
