import { useAppSelector } from "../app/hooks";
import { FamilyList } from "../components/List";
import Overlay from "../components/Overlay";
import View from "../components/View";
import SearchBar from "../features/search/SearchBar";

function Checklist() {
  const isSearching = useAppSelector((s) => s.search.searchString !== null);
  return (
    <View>
      <Overlay />
      {isSearching && <SearchBar />}
      <FamilyList />
    </View>
  );
}

export default Checklist;