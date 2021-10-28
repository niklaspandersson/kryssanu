import styled, { StyledFC } from "styled-components";
import { useUser } from "../../features/user";
import { Checklist, Welcome } from "../../views";
import ApplicationHeader from "../ApplicationHeader";

const App: StyledFC = ({ className }) => {
  const user = useUser();
  return (
    <div className={className}>
      <ApplicationHeader />
      {user ? <Checklist /> : <Welcome />}
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
