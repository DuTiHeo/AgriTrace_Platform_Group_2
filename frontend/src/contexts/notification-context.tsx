import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Href } from 'expo-router';
import { useAuth } from './auth-context';
export type NoticeCategory = 'work' | 'schedule' | 'alert';
export type AppNotice = {
  id: string;
  title: string;
  text: string;
  category: NoticeCategory;
  timeLabel: string;
  occurredAt?: string | null;
  target: Href
};

export function noticeTime(value: string | null | undefined) {
  if (!value)
    return 'Chưa có thời gian';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? 'Chưa có thời gian' : date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const Context = createContext<{
  readIds: string[];
  markRead: (ids: string[]) => void
} | null>(null);

export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const key = JSON.stringify([
    user?.phone,
    user?.role,
    user?.org_id,
    user?.team_id
  ]);
  const [reads, setReads] = useState<Record<string, string[]>>({});
  const readsRef = useRef<Record<string, string[]>>({});
  const hydration = useRef(new Map<string, Promise<void>>());
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    if (!user || hydration.current.has(key)) return;
    const operation = AsyncStorage.getItem(`notification-reads:${key}`).then(stored => {
      const saved: unknown = stored ? JSON.parse(stored) : [];
      const ids = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [];
      readsRef.current = { ...readsRef.current, [key]: [...new Set([...(readsRef.current[key] ?? []), ...ids])] };
      setReads(readsRef.current);
    }).catch(() => { /* Keep the current session's read state if local storage is unavailable. */ });
    hydration.current.set(key, operation);
  }, [key, user]);
  const markRead = (ids: string[]) => {
    readsRef.current = { ...readsRef.current, [key]: [...new Set([...(readsRef.current[key] ?? []), ...ids])] };
    setReads(readsRef.current);
    writes.current = writes.current.then(async () => {
      await hydration.current.get(key);
      await AsyncStorage.setItem(`notification-reads:${key}`, JSON.stringify(readsRef.current[key] ?? []));
    }).catch(() => { /* The notice remains read for this session. */ });
  };

  return <Context.Provider value={{
    readIds: reads[key] ?? [],
    markRead
  }}>
    {children}
  </Context.Provider>;
}

export function useNotificationRead() {
  const value = useContext(Context);

  if (!value)
    throw new Error('NotificationProvider missing');

  return value;
}

export function localToday() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function scheduleDateLabel(start: string | undefined, due: string) {
  const format = (value: string | undefined) => value ? value.split('-').reverse().join('/') : 'Chưa có';

  return `Từ ${format(start)}\nĐến ${format(due)}`;
}
