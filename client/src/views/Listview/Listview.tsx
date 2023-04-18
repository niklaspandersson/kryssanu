import styled, { StyledFC } from 'styled-components';
import Header from './Header';
import FamilyList from './FamilyList';
import Overlay from '../../components/Overlay';
import { SearchBar, useSearchState } from './Search';
import { useState } from 'react';
import SideMenu from './SideMenu';

const StyledHeader = styled(Header)`
  display: flex;
  background: ${({ theme }) => theme.header.background};
  padding: ${({ theme }) => theme.header.padding};
  box-shadow: ${({ theme }) =>
    `0px ${theme.panels.shadow.distance} ${theme.panels.shadow.spread} ${theme.panels.shadow.color}`};
`;

const Listview: StyledFC = ({ className }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { search, startSearch, endSearch, ...filter } = useSearchState();
  const isSearching = filter.searchString !== null;
  return (
    <div className={className}>
      <StyledHeader showMenu={() => setShowMenu(true)} />
      {showMenu && <SideMenu close={() => setShowMenu(false)} />}
      <Overlay onStartSearch={startSearch} />
      {isSearching && <SearchBar onSearch={search} onEndSearch={endSearch} />}
      <FamilyList filter={filter} />
    </div>
  );
};

export default styled(Listview)`
  display: grid;
  overflow-y: hidden;
  grid-template-rows: auto 1fr;
`;
