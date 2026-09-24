import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
import { type TaskPriority } from '@/components/common/task-priority';
export type ScheduledTask = {
  id: string; title: string; instructions: string; memberIds: string[]; area: string; due: string;
  priority: TaskPriority; startTime?: string; endTime?: string; tools?: string;
  status: 'todo' | 'doing' | 'done'; assigneePhones: string[];
  leaderPhone: string; orgId: string | null; teamId: string | null;
};
const KEY = 'agrifarm.work-schedule.v1';
const normalizePhone = (phone: string) => phone.replace(/\D/g, '').replace(/^84(?=\d{9}$)/, '0');
function validTask(value: unknown): value is ScheduledTask {
  if (!value || typeof value !== 'object') return false;
  const t = value as ScheduledTask;
  return ['id','title','instructions','area','due','leaderPhone'].every(key => typeof (value as Record<string, unknown>)[key] === 'string')
    && /^\d{4}-\d{2}-\d{2}$/.test(t.due)
    && ['high','medium','low'].includes(t.priority) && ['todo','doing','done'].includes(t.status)
    && Array.isArray(t.memberIds) && t.memberIds.every(x => typeof x === 'string')
    && Array.isArray(t.assigneePhones) && t.assigneePhones.every(x => typeof x === 'string')
    && (t.orgId === null || typeof t.orgId === 'string') && (t.teamId === null || typeof t.teamId === 'string')
    && [t.startTime, t.endTime, t.tools].every(x => x === undefined || typeof x === 'string');
}
function useScheduleState() {
  const { user } = useAuth();
  const [all, setAll] = useState<ScheduledTask[]>([]);
  const current = useRef<ScheduledTask[]>([]);
  const saving = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setReady(false); setError('');
    AsyncStorage.getItem(KEY).then(raw => {
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed) || !parsed.every(validTask)) throw new Error('Invalid schedule');
      if (active) { current.current = parsed; setAll(parsed); setReady(true); }
    }).catch(() => { if (active) setError('Không đọc được lịch đã lưu trên thiết bị. Vui lòng thử lại.'); });
    return () => { active = false; };
  }, [reload]);
  const addAssignment = async (input: Omit<ScheduledTask, 'id' | 'status' | 'leaderPhone' | 'orgId' | 'teamId'>) => {
    if (!ready) throw new Error('Lịch chưa tải xong. Vui lòng thử lại.');
    if (!user || user.role !== 'leader') throw new Error('Chỉ tổ trưởng được giao việc.');
    if (saving.current) throw new Error('Đang lưu phân công. Vui lòng chờ.');
    saving.current = true;
    try {
      const task: ScheduledTask = { ...input, id: `assigned-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, status: 'todo', leaderPhone: user.phone, orgId: user.org_id, teamId: user.team_id };
      const next = [task, ...current.current];
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      current.current = next; setAll(next);
    } catch { throw new Error('Không lưu được phân công trên thiết bị. Vui lòng thử lại.'); }
    finally { saving.current = false; }
  };
  const inScope = (task: ScheduledTask) => !!user && task.orgId === user.org_id && task.teamId === user.team_id;
  const workerTasks = user?.role === 'worker' ? all.filter(task => inScope(task) && task.assigneePhones.some(phone => normalizePhone(phone) === normalizePhone(user.phone))) : [];
  const leaderTasks = user?.role === 'leader' ? all.filter(task => inScope(task) && task.leaderPhone === user.phone) : [];
  const retry = useCallback(() => setReload(value => value + 1), []);
  return { workerTasks, leaderTasks, ready, error, retry, addAssignment };
}
const Context = createContext<ReturnType<typeof useScheduleState> | null>(null);
export function WorkScheduleProvider({ children }: PropsWithChildren) {
  const value = useScheduleState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkSchedule() {
  const value = useContext(Context);
  if (!value) throw new Error('WorkScheduleProvider missing');
  return value;
}
