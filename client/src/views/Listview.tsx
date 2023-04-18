import { FamilyList } from '../components/List';
import Overlay from '../components/Overlay';
import { SearchBar, useSearch } from '../features/search';

function Listview() {
  const { searchString } = useSearch();
  const isSearching = searchString !== null;
  return (
    <>
      <Overlay />
      {isSearching && <SearchBar />}
      <FamilyList />
    </>
  );
}

export default Listview;
