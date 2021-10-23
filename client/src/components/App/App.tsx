import styled, { StyledFC } from "styled-components";
import { useAppSelector } from "../../app/hooks";
import SearchBar from "../../features/search/SearchBar";
import ApplicationHeader from "../ApplicationHeader";
import List from "../List/FamilyList";
import Overlay from "../Overlay";

const App: StyledFC = ({ className }) => {
  const isSearching = useAppSelector((s) => s.search.searchString !== null);

  return (
    <div className={className}>
      <ApplicationHeader />
      <main>
        <Overlay />
        {isSearching && <SearchBar />}
        <List />
      </main>
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
