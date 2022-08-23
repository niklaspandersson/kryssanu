import { useAppSelector } from '../app/hooks';
import { FamilyList } from '../components/List';
import Overlay from '../components/Overlay';
import SearchBar from '../features/search/SearchBar';

function Checklist() {
  const isSearching = useAppSelector(s => s.search.searchString !== null);
  return (
    <>
      <Overlay />
      {isSearching && <SearchBar />}
      <FamilyList />
    </>
  );
}

export default Checklist;
