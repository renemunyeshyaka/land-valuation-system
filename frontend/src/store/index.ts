import { configureStore } from '@reduxjs/toolkit';

// Example slice (replace with your actual slices)
import { exampleSlice } from './exampleSlice';

export const store = configureStore({
  reducer: {
    example: exampleSlice.reducer,
    // add other reducers here
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
