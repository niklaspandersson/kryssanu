import { useMemo, useReducer } from 'react';
import { SearchState } from './context';

type Action = {
  type: string;
} & Partial<SearchState>;

const reducer = (prev: SearchState, action: Action) => {
  switch (action.type) {
    case 'set-string':
      return { ...prev, searchString: action.searchString! };
  }
  return prev;
};
const useSearchState = () => {
  const [state, dispatch] = useReducer(reducer, {
    rare: false,
    searchString: null,
  });

  const actions = useMemo(
    () => ({
      search: (str: string) =>
        dispatch({ type: 'set-string', searchString: str }),
      startSearch: () => dispatch({ type: 'set-string', searchString: '' }),
      endSearch: () => dispatch({ type: 'set-string', searchString: null }),
    }),
    [dispatch]
  );

  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};

export default useSearchState;
