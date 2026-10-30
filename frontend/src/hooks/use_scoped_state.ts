import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

/** Reset local state when its route or filter changes, before rendering stale values. */
export function useScopedState<T>(initialValue: T, scope: string) {
  const [state, setState] = useState({ scope, value: initialValue });

  if (state.scope !== scope) {
    setState({ scope, value: initialValue });
  }

  const setValue: Dispatch<SetStateAction<T>> = useCallback(update => {
    setState(old => {
      if (old.scope !== scope) return old;

      return {
        scope,
        value: typeof update === 'function'
          ? (update as (value: T) => T)(old.value)
          : update,
      };
    });
  }, [scope]);

  return [state.scope === scope ? state.value : initialValue, setValue] as const;
}
