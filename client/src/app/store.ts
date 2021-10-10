import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import birdsReducer from '../features/birds';
import searchReducer from '../features/search/searchSlice';

export const store = configureStore({
  reducer: {
    birds: birdsReducer,
    search: searchReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
