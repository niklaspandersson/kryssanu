import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface SearchState {
  searchString: string|null
};

const initialState: SearchState = {
  searchString: null
};

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    search: (state, action:PayloadAction<string>) => {
      state.searchString = action.payload
    },
    startSearch: (state) => {
      state.searchString = ""
    },
    endSearch: (state) => {
      state.searchString = null;
    },
  },
});

export const { search, startSearch, endSearch } = searchSlice.actions;

export default searchSlice.reducer;