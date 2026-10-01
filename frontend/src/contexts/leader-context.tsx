import { buildLeaderNotices } from '@/sevices/notification-events';
import { DEFAULT_WORK_START_TIME, DEFAULT_WORK_END_TIME } from '@/constants/work-hours';
import { useReports } from './report-context';
import { useNotificationRead } from './notification-context';
import { useWorkSchedule } from './work-schedule-context';
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
import { createTask, encodeTaskContent, listTeamMembers, listMyTasks } from '@/sevices/farming-log.service';

export type Member = {
  id: string;
  name: string;
  phone: string;
  area: string;
  active: boolean
};
export type Task = {
  id: string;
  title: string;
  instructions: string;
  memberIds: string[];
  area: string;
  plotId?: string;
  due: string;
  status: 'doing' | 'done';
  displayStatus: 'in_progress' | 'incomplete' | 'completed' | 'completed_late';
  owner?: boolean;
  started?: boolean;
  assigneeStatuses?: Record<string, {
    name: string | null;
    completed: boolean
  }>;
  startDate?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string | null;
  tools?: string;
  rawContent: string;
  taskIds: string[];
  assignmentId?: string
};
export type Diary = {
  id: string;
  memberId: string;
  name: string;
  title: string;
  area: string;
  note: string;
  photos: string[];
  time: string;
  gps?: {
    latitude: number;
    longitude: number
  };
  comments: {
    name: string;
    text: string;
    time: string
  }[]
};
export type Draft = {
  title: string;
  area: string;
  note: string;
  photos: string[];
  taskId?: string;
  seasonId?: string;
  gps?: {
    latitude: number;
    longitude: number
  };
  savedLogId?: string
};
export const blankDraft = (): Draft => ({
  title: '',
  area: '',
  note: '',
  photos: []
});

function useLeaderState() {
  const { accessToken, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersError, setMembersError] = useState('');
  const loadMembers = useCallback(async () => {
    if (!accessToken)
      return;

    setMembersError('');

    try {
      const [result, assignedTasks] = await Promise.all([listTeamMembers(accessToken), listMyTasks(accessToken)]);
      setMembers(result.map(member => ({
        id: member.user_id,
        name: member.full_name,
        phone: member.phone,
        area: [...new Map(assignedTasks.filter(task => task.worker_id === member.user_id && task.status === 'in_progress')
          .map(task => [task.plot_id, task.plot_code])).values()].filter(Boolean).join(', ') || 'Chưa có khu vực được giao',
        active: member.status === 'active',
      })));
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : 'Không tải được thành viên.');
    }
  }, [accessToken]);
  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);
  const { leaderTasks, loadTasks, registerCreatedTasks } = useWorkSchedule();
  const { reports, notificationReports, addReportComment } = useReports();
  const tasks: Task[] = leaderTasks;
  const diaries: Diary[] = reports.map(r => ({
    id: r.id,
    memberId: r.workerId,
    name: r.workerName,
    title: r.taskTitle,
    area: r.area,
    note: r.note,
    photos: r.photos,
    time: r.completedAt,
    gps: r.gps,
    comments: (r.comments ?? []).map(c => ({
      name: c.author,
      text: c.text,
      time: c.time
    }))
  }));
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const { readIds } = useNotificationRead();
  const events = buildLeaderNotices(leaderTasks, notificationReports);
  const notices = events.map(n => ({
    ...n,
    read: readIds.includes(n.id)
  }));
  const addTask = async (value: Omit<Task, 'id' | 'status' | 'displayStatus' | 'rawContent' | 'taskIds' | 'assignmentId'>) => {
    if (!accessToken || !user?.team_id || !value.plotId || !value.startDate)
      throw new Error('Thiếu thông tin tổ, lô đất hoặc ngày bắt đầu để giao việc.');

    const assignmentId = `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const createdTasks = await Promise.all(value.memberIds.map(workerId => createTask(accessToken, {
      team_id: user.team_id!,
      worker_id: workerId,
      plot_id: value.plotId!,
      start_at: `${value.startDate}T${DEFAULT_WORK_START_TIME}:00+07:00`,
      due_at: `${value.due}T${DEFAULT_WORK_END_TIME}:00+07:00`,
      content: encodeTaskContent({
        title: value.title,
        instructions: value.instructions,
        tools: value.tools,
        startTime: DEFAULT_WORK_START_TIME,
        endTime: DEFAULT_WORK_END_TIME,
        assignmentId
      }),
    })));
    registerCreatedTasks(createdTasks);
    await loadTasks();
  };
  const addComment = (id: string, text: string, _name: string) => addReportComment(id, text);

  return {
    members,
    membersError,
    loadMembers,
    tasks,
    diaries,
    draft,
    setDraft,
    addTask,
    addComment,
    notices
  };
}

const Context = createContext<ReturnType<typeof useLeaderState> | null>(null);

export function LeaderProvider({ children }: PropsWithChildren) {
  const value = useLeaderState();

  return <Context.Provider value={value}>
    {children}
  </Context.Provider>;
}

export function useLeader() {
  const value = useContext(Context);

  if (!value)
    throw new Error('LeaderProvider missing');

  return value;
}
