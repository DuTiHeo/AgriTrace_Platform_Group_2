import { useNavigation } from 'expo-router';

type HistoryEntry = {
  type: string;
  key: string;
};

/** Replace a completed tab flow without losing the screen that opened it. */

export function useFinishTabFlow() {
  const navigation = useNavigation();

  return (name: string) => {
    const state = navigation.getState();
    if (!state) throw new Error('Navigation is not ready.');
    if (!state.routeNames.includes(name))
      throw new Error('A completed tab flow must target a sibling tab.');

    const route = state.routes.find(item => item.name === name);
    const history = (state.history as HistoryEntry[] | undefined)?.filter(item => item.type === 'route');
    if (route && history?.at(-2)?.key === route.key) {
      navigation.dispatch({ type: 'GO_BACK', target: state.key });
      return;
    }

    // The router creates an unvisited tab and removes the completed form from Back history.
    // Seeded Expo states can omit both `type` and the unvisited route in `routes`.
    navigation.dispatch({
      type: 'REPLACE',
      target: state.key,
      payload: { name, params: route?.params },
    });
  };
}
