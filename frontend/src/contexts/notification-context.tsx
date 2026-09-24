import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { type Href } from 'expo-router';
import { useAuth } from './auth-context';
export type NoticeCategory = 'work' | 'schedule' | 'alert';
export type AppNotice = { id: string; title: string; text: string; category: NoticeCategory; timeLabel: string; target: Href };
const Context = createContext<{ readIds: string[]; markRead: (ids: string[]) => void } | null>(null);
export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const key = JSON.stringify([user?.phone, user?.role, user?.org_id, user?.team_id]);
  const [reads, setReads] = useState<Record<string, string[]>>({});
  const markRead = (ids: string[]) => setReads(old => ({ ...old, [key]: [...new Set([...(old[key] ?? []), ...ids])] }));
  return <Context.Provider value={{ readIds: reads[key] ?? [], markRead }}>{children}</Context.Provider>;
}
export function useNotificationRead() { const value = useContext(Context); if (!value) throw new Error('NotificationProvider missing'); return value; }
export function localToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
