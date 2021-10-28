import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface SearchState {
  searchString: string | null;
  rare: boolean;
}

const initialState: SearchState = {
  searchString: null,
  rare: false,
};

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    search: (state, action: PayloadAction<string>) => {
      state.searchString = action.payload;
    },
    startSearch: state => {
      state.searchString = '';
    },
    endSearch: state => {
      state.searchString = null;
    },
  },
});

export const { search, startSearch, endSearch } = searchSlice.actions;

export function selectSearchString(state: RootState) {
  return state.search.searchString;
}

export default searchSlice.reducer;
