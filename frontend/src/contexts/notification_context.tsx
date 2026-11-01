import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { type Href } from 'expo-router';
import { useAuth } from './auth_context';
import { localDateKey } from '@/utils/task_dates';
import { getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead, type ApiNotification } from '@/sevices/notification_api';
import { getNotificationFilters, loadAllNotifications, mapApiNotification, type NotificationFilter } from '@/sevices/mobile_notifications';

export type NoticeCategory = 'work' | 'schedule' | 'alert';
export type AppNotice = {
  id: string;
  type?: string | null;
  read?: boolean;
  title: string;
  text: string;
  category: NoticeCategory;
  timeLabel: string;
  occurredAt?: string | null;
  target: Href | null;
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

export function useNotificationState() {
  const { user, accessToken } = useAuth();
  const role = user?.role;
  const enabled = !!accessToken && (role === 'worker' || role === 'leader');
  const session = useRef(accessToken);
  useLayoutEffect(() => {
    session.current = accessToken;
    return () => { session.current = null; };
  }, [accessToken]);
  const [owner, setOwner] = useState<string | null>(null);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [selectedFilter, setFilter] = useState<NotificationFilter>('all');
  const filter = getNotificationFilters(role).some(item => item.value === selectedFilter) ? selectedFilter : 'all';
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionToken, setActionToken] = useState<string | null>(null);
  const sequence = useRef(0);
  const pendingLoad = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const mutations = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!accessToken || !enabled) return;
    const key = `${accessToken}:${filter}`;
    if (pendingLoad.current?.key === key) return pendingLoad.current.promise;
    const request = ++sequence.current;
    setLoading(true); setError('');
    const operation = (async () => {
      try {
        const [result, count] = await Promise.all([loadAllNotifications(accessToken, filter), getUnreadNotificationCount(accessToken)]);
        if (session.current !== accessToken || request !== sequence.current) return;
        setOwner(key); setItems(result); setUnread(count.unread_count); setReady(true);
      } catch (cause) {
        if (session.current === accessToken && request === sequence.current) {
          setOwner(key); setItems([]); setReady(true);
          setError(cause instanceof Error ? cause.message : 'Không tải được thông báo.');
        }
      } finally {
        if (session.current === accessToken && request === sequence.current) setLoading(false);
      }
    })();
    pendingLoad.current = { key, promise: operation };
    try { await operation; }
    finally { if (pendingLoad.current?.promise === operation) pendingLoad.current = null; }
  }, [accessToken, enabled, filter]);

  useEffect(() => {
    const sequenceRef = sequence;
    ++sequenceRef.current; pendingLoad.current = null;
    const initial = setTimeout(() => { void refresh(); }, 0);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { ++sequenceRef.current; clearTimeout(initial); clearInterval(timer); subscription.remove(); };
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    if (!accessToken || !enabled || mutations.current.has(accessToken)) return false;
    const item = items.find(item => item.notification_id === id);
    if (!item) return false;
    if (item.is_read) return true;
    mutations.current.add(accessToken); setActionToken(accessToken); setActionError('');
    try {
      const updated = await markNotificationRead(accessToken, id);
      if (session.current !== accessToken) return false;
      ++sequence.current; pendingLoad.current = null; setLoading(false);
      setItems(old => old.map(item => item.notification_id === id ? updated : item));
      if (updated.is_read) setUnread(count => Math.max(0, count - 1));
      await refresh();
      return true;
    } catch (cause) {
      if (session.current === accessToken) setActionError(cause instanceof Error ? cause.message : 'Không đánh dấu được thông báo đã đọc.');
      return false;
    } finally {
      mutations.current.delete(accessToken);
      if (session.current === accessToken) setActionToken(null);
    }
  }, [accessToken, enabled, items, refresh]);

  const markAllRead = useCallback(async () => {
    if (!accessToken || !enabled || mutations.current.has(accessToken)) return false;
    mutations.current.add(accessToken); setActionToken(accessToken); setActionError('');
    try {
      await markAllNotificationsRead(accessToken);
      if (session.current !== accessToken) return false;
      ++sequence.current; pendingLoad.current = null; setLoading(false);
      setItems(old => old.map(item => ({ ...item, is_read: true }))); setUnread(0);
      await refresh();
      return true;
    } catch (cause) {
      if (session.current === accessToken) setActionError(cause instanceof Error ? cause.message : 'Không cập nhật được thông báo.');
      return false;
    } finally {
      mutations.current.delete(accessToken);
      if (session.current === accessToken) setActionToken(null);
    }
  }, [accessToken, enabled, refresh]);

  const scope = accessToken ? `${accessToken}:${filter}` : null;
  const ownsCounter = !!accessToken && !!owner?.startsWith(`${accessToken}:`);
  const notices = useMemo(() => owner === scope && (role === 'worker' || role === 'leader')
    ? items.map(item => mapApiNotification(item, role)) : [], [scope, owner, items, role]);
  return {
    notices, unread: ownsCounter ? unread : 0,
    readIds: notices.filter(item => item.read).map(item => item.id),
    filter, setFilter, refresh, retry: refresh,
    ready: owner === scope && ready, loading,
    error: owner === scope ? error : '', actionError: ownsCounter ? actionError : '',
    busy: actionToken === accessToken && !!accessToken, markRead, markAllRead,
  };
}

const Context = createContext<ReturnType<typeof useNotificationState> | null>(null);
export function NotificationProvider({ children }: PropsWithChildren) {
  return <Context.Provider value={useNotificationState()}>{children}</Context.Provider>;
}
export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('NotificationProvider missing');
  return value;
}

export function localToday() {
  return localDateKey(new Date());
}

export function scheduleDateLabel(start: string | undefined, due: string) {
  const format = (value: string | undefined) => value ? value.split('-').reverse().join('/') : 'Chưa có';

  return `Từ ${format(start)}\nĐến ${format(due)}`;
}
