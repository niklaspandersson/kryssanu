import { createContext } from 'react';

export type SearchState = {
  searchString: string | null;
  rare: boolean;
};

type SearchContextPayload = SearchState & {
  startSearch: () => void;
  search: (str: string) => void;
  endSearch: () => void;
};

const InitialState: SearchContextPayload = {
  searchString: null,
  rare: false,
  startSearch: () => undefined,
  search: str => undefined,
  endSearch: () => undefined,
};

const SearchContext = createContext(InitialState);
export default SearchContext;
