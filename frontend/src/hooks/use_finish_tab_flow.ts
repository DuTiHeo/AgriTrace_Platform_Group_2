import { useNavigation } from 'expo-router';

type HistoryEntry = {
  type: string;
  key: string;
  params?: object
};

/** Replace a completed tab flow without losing the screen that opened it. */

export function useFinishTabFlow() {
  const navigation = useNavigation();

  return (name: string) => {
    const state = navigation.getState();
    if (!state) throw new Error('Navigation is not ready.');
    navigation.dispatch((() => {
      const index = state.routes.findIndex(route => route.name === name);

      if (state.type !== 'tab' || index < 0 || !('history' in state)) {
        throw new Error('A completed tab flow must target a sibling tab.');
      }

      const route = state.routes[index];
      const history = (state.history as HistoryEntry[]).slice(0, -1);
      // If the flow came from this tab, return to that entry instead of duplicating it.

      if (history[history.length - 1]?.key !== route.key) {
        history.push({
          type: 'route',
          key: route.key,
          params: route.params
        });
      }

      return {
        type: 'RESET',
        target: state.key,
        payload: {
          ...state,
          index,
          history
        },
      };
    })());
  };
}
