import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchBirds } from "./birdsAPI";
import { BirdsState } from "./types";

const initialState: BirdsState = {
  birds: [],
  status: 'idle',
}

export const fetchAllAsync = createAsyncThunk(
  'birds/fetchAll',
  fetchBirds
)

export const birdsSlice = createSlice({
  name: 'birds',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllAsync.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllAsync.fulfilled, (state, action) => {
        state.status = 'idle';
        state.birds = action.payload;
      })
      .addCase(fetchAllAsync.rejected, (state) => {
        state.status = 'failed';
      });
  }
});

export default birdsSlice.reducer;