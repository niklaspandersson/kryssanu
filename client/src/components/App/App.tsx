import {  useEffect } from 'react';
import styled, { StyledFC } from "styled-components";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchAllAsync } from "../../features/birds/birdsSlice";
import SearchBar from "../../features/search/SearchBar";
import ApplicationHeader from "../ApplicationHeader";
import List from "../List/FamilyList";
import Overlay from "../Overlay";

const App: StyledFC = ({className}) => {
  const dispatch = useAppDispatch();
  const isSearching = useAppSelector(s => s.search.searchString !== null);
  useEffect(() => {
    dispatch(fetchAllAsync());
  }, [dispatch]);

  return (
    <div className={className}>
      <ApplicationHeader />
      <main>
        <Overlay />
        { isSearching && <SearchBar /> }
        <List />
      </main>
    </div>
  );
}

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
