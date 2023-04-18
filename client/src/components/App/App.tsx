import styled, { StyledFC } from 'styled-components';
import { SearchContext } from '../../features/search';
import useSearchState from '../../features/search/useSearchState';
import { useUser } from '../../features/user';
import { Listview, Welcome } from '../../views';
import ApplicationHeader from '../ApplicationHeader';

const App: StyledFC = ({ className }) => {
  const user = useUser();
  const searchState = useSearchState();
  return (
    <div className={className}>
      <ApplicationHeader />
      <SearchContext.Provider value={searchState}>
        <main>{user ? <Listview /> : <Welcome />}</main>
      </SearchContext.Provider>
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
