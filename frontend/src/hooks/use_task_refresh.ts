import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';

export function useTaskRefresh(refresh: () => Promise<void>) {
  useFocusEffect(useCallback(() => {
    let active = true;
    let refreshing = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = async () => {
      if (!active || refreshing || AppState.currentState !== 'active') return;
      if (timer) clearTimeout(timer);
      refreshing = true;
      try { await refresh(); }
      finally {
        refreshing = false;
        if (active) timer = setTimeout(() => { void update(); }, 10000);
      }
    };
    void update();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void update();
    });
    return () => { active = false; if (timer) clearTimeout(timer); subscription.remove(); };
  }, [refresh]));
}
