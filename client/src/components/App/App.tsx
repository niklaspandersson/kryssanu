import styled, { StyledFC } from "styled-components";
import ApplicationHeader from "../ApplicationHeader";
import BirdList from "../BirdList";

const App: StyledFC = ({className}) => {
  return (
    <div className={className}>
      <ApplicationHeader />
      <BirdList />
    </div>
  );
}

export default styled(App)`
  position: relative;
`;
