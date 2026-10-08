import { localDateKey } from '@/utils/task-dates';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
import { decodeTaskContent, listMyTasks, type ApiTask } from '@/sevices/farming-log.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { taskExecutionError } from '@/sevices/journal-filter';

export type ScheduledTask = {
  id: string;
  title: string;
  instructions: string;
  memberIds: string[];
  area: string;
  plotId: string;
  due: string;
  dueAt?: string | null;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  tools?: string;
  started: boolean;
  owner?: boolean;
  assigneeStatuses: Record<string, {
    name: string | null;
    completed: boolean
  }>;
  status: 'doing' | 'done';
  displayStatus: 'in_progress' | 'incomplete' | 'completed' | 'completed_late';
  teamName?: string | null;
  leaderName?: string | null;
  workerName?: string | null;
  updatedAt?: string | null;
  rawContent: string;
  taskIds: string[];
  assignmentId?: string;
  createdAt?: string | null;
};

function mapTask(task: ApiTask): ScheduledTask {
  const content = decodeTaskContent(task.content);
  const startDate = localDateKey(task.start_at);
  const dueDate = localDateKey(task.due_at);
  const completedLate = task.status === 'completed' && !!dueDate && !!task.updated_at && localDateKey(task.updated_at) > dueDate;
  const overdue = !!dueDate && dueDate < localDateKey(new Date().toISOString());

  return {
    id: task.task_id,
    title: content.title,
    instructions: content.instructions ?? '',
    memberIds: [task.worker_id],
    area: task.plot_code ?? 'Chưa có mã lô',
    plotId: task.plot_id,
    due: dueDate,
    dueAt: task.due_at,
    startDate: startDate || localDateKey(task.created_at) || dueDate,
    startTime: content.startTime,
    endTime: content.endTime,
    tools: content.tools ?? '',
    started: false,
    assigneeStatuses: {
      [task.worker_id]: {
        name: task.worker_name,
        completed: task.status === 'completed'
      }
    },
    status: task.status === 'completed' ? 'done' : 'doing',
    displayStatus: task.status === 'completed' ? (completedLate ? 'completed_late' : 'completed') : (overdue ? 'incomplete' : 'in_progress'),
    teamName: task.team_name,
    leaderName: task.team_leader_name ?? null,
    workerName: task.worker_name,
    updatedAt: task.updated_at,
    rawContent: task.content,
    taskIds: [task.task_id],
    assignmentId: content.assignmentId,
    createdAt: task.created_at,
  };
}

function groupLeaderTasks(tasks: ScheduledTask[]) {
  const groups = new Map<string, ScheduledTask>();
  for (const task of tasks) {
    const legacyMinute = task.createdAt?.slice(0, 16) ?? task.startDate ?? '';
    const key = task.owner ? `owner:${task.id}` : task.assignmentId
      ? `assignment:${task.assignmentId}`
      : `legacy:${task.rawContent}|${task.plotId}|${task.due}|${legacyMinute}`;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        ...task
      });
      continue;
    }

    const allDone = current.status === 'done' && task.status === 'done';
    groups.set(key, {
      ...current,
      memberIds: [...new Set([
        ...current.memberIds,
        ...task.memberIds
      ])],
      assigneeStatuses: {
        ...current.assigneeStatuses,
        ...task.assigneeStatuses
      },
      taskIds: [
        ...current.taskIds,
        ...task.taskIds
      ],
      updatedAt: !current.updatedAt ? task.updatedAt : !task.updatedAt ? current.updatedAt
        : new Date(task.updatedAt) > new Date(current.updatedAt) ? task.updatedAt : current.updatedAt,
      workerName: null,
      status: allDone ? 'done' : 'doing',
      displayStatus: allDone
        ? ([
          current.displayStatus,
          task.displayStatus
        ].includes('completed_late') ? 'completed_late' : 'completed')
        : ([
          current.displayStatus,
          task.displayStatus
        ].includes('incomplete') ? 'incomplete' : 'in_progress'),
    });
  }

  return [...groups.values()];
}

function useScheduleState() {
  const { user, accessToken } = useAuth();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const loadSequence = useRef(0);
  const pendingLoad = useRef<{ token: string; promise: Promise<void> } | null>(null);
  const currentToken = useRef(accessToken);
  useLayoutEffect(() => {
    currentToken.current = accessToken;
    return () => { currentToken.current = null; };
  }, [accessToken]);

  const registerCreatedTasks = useCallback((created: ApiTask[]) => {
    ++loadSequence.current;
    pendingLoad.current = null;
    const mapped = created.map(task => ({ ...mapTask(task), owner: task.worker_phone === user?.phone }));
    setTasks(old => groupLeaderTasks([...mapped, ...old.filter(task => !created.some(item => task.taskIds.includes(item.task_id)))]));
  }, [user?.phone]);

  const loadTasks = useCallback(async () => {
    if (!accessToken || !user || ![
      'leader',
      'worker'
    ].includes(user.role))
      return;

    if (pendingLoad.current?.token === accessToken) return pendingLoad.current.promise;
    setError('');
    const sequence = ++loadSequence.current;
    const operation = (async () => {
    try {
      const [result, stored] = await Promise.all([
        listMyTasks(accessToken),
        AsyncStorage.getItem(`worker-started-tasks:${user.phone}`),
      ]);
      const saved: unknown = stored ? JSON.parse(stored) : [];
      if (sequence !== loadSequence.current || currentToken.current !== accessToken) return;
      const startedIds = new Set(Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : []);
      const mapped = result.filter(task => task.status !== 'cancelled').map(task => ({
        ...mapTask(task),
        started: startedIds.has(task.task_id) || task.status === 'completed',
        owner: user.role === 'leader' && task.worker_phone === user.phone,
      }));
      setTasks(user.role === 'leader' ? groupLeaderTasks(mapped) : mapped);
      setReady(true);
    } catch (e) {
      if (sequence !== loadSequence.current || currentToken.current !== accessToken) return;
      setError(e instanceof Error ? e.message : 'Không tải được danh sách công việc.');
    }
    })();
    pendingLoad.current = { token: accessToken, promise: operation };
    try { await operation; }
    finally { if (pendingLoad.current?.promise === operation) pendingLoad.current = null; }
  }, [
    accessToken,
    user
  ]);

  useEffect(() => {
    // Clear the previous account's schedule before loading the new account's tasks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasks([]);
    setReady(false);
    void loadTasks();
  }, [loadTasks]);

  const startTask = useCallback(async (taskId: string) => {
    if (!user || ![
      'worker',
      'leader'
    ].includes(user.role)
      || !tasks.some(task => task.id === taskId && task.status !== 'done' && (user.role === 'worker' || task.owner)))
      return;

    const task = tasks.find(item => item.id === taskId)!;
    const blocked = taskExecutionError(task);

    if (blocked) {
      setError(blocked);

      return;
    }

    try {
      const key = `worker-started-tasks:${user.phone}`;
      const stored = await AsyncStorage.getItem(key);
      const saved: unknown = stored ? JSON.parse(stored) : [];
      const ids = Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : [];
      await AsyncStorage.setItem(key, JSON.stringify([...new Set([
        ...ids,
        taskId
      ])]));
      setTasks(old => old.map(task => task.id === taskId ? {
        ...task,
        started: true
      } : task));
    } catch {
      setError('Không lưu được trạng thái bắt đầu. Vui lòng thử lại.');
    }
  }, [
    tasks,
    user
  ]);

  return {
    workerTasks: user?.role === 'worker' ? tasks : [],
    leaderTasks: user?.role === 'leader' ? tasks : [],
    ready,
    error,
    retry: loadTasks,
    loadWorkerTasks: loadTasks,
    loadTasks,
    startTask,
    registerCreatedTasks,
  };
}

const Context = createContext<ReturnType<typeof useScheduleState> | null>(null);

export function WorkScheduleProvider({ children }: PropsWithChildren) {
  return <Context.Provider value={useScheduleState()}>
    {children}
  </Context.Provider>;
}

export function useWorkSchedule() {
  const value = useContext(Context);

  if (!value)
    throw new Error('WorkScheduleProvider missing');

  return value;
}
