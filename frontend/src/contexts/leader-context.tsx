import { useReports } from './report-context';
import { type AppNotice, localToday, noticeTime, scheduleDateLabel, useNotificationRead } from './notification-context';
import { useWorkSchedule } from './work-schedule-context';
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
import { createTask, encodeTaskContent, listTeamMembers } from '@/sevices/farming-log.service';

export type Member = { id: string; name: string; phone: string; area: string; active: boolean };
export type Task = { id: string; title: string; instructions: string; memberIds: string[]; area: string; plotId?: string; due: string; status: 'doing' | 'done'; displayStatus: 'in_progress' | 'incomplete' | 'completed' | 'completed_late'; owner?: boolean; started?: boolean; assigneeStatuses?: Record<string, { name: string | null; completed: boolean }>; startDate?: string; tools?: string; rawContent: string; taskIds: string[]; assignmentId?: string };
export type Diary = { id: string; memberId: string; name: string; title: string; area: string; note: string; photos: string[]; time: string; gps?: { latitude: number; longitude: number }; comments: { name: string; text: string; time: string }[] };
export type Draft = { title: string; area: string; note: string; photos: string[]; taskId?: string; seasonId?: string; gps?: { latitude: number; longitude: number }; savedLogId?: string };
export const blankDraft = (): Draft => ({ title: '', area: '', note: '', photos: [] });
function useLeaderState() {
  const { accessToken, user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersError, setMembersError] = useState('');
  const loadMembers = useCallback(async () => {
    if (!accessToken) return;
    setMembersError('');
    try {
      const result = await listTeamMembers(accessToken);
      setMembers(result.map(member => ({
        id: member.user_id,
        name: member.full_name,
        phone: member.phone,
        area: 'Thành viên trong tổ',
        active: member.status === 'active',
      })));
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : 'Không tải được thành viên.');
    }
  }, [accessToken]);
  useEffect(() => { void loadMembers(); }, [loadMembers]);
  const { leaderTasks, leaderCompletedTasks, loadTasks } = useWorkSchedule();
  const { reports, addReportComment } = useReports();
  const tasks: Task[] = leaderTasks;
  const diaries: Diary[] = reports.map(r => ({ id: r.id, memberId: r.workerId, name: r.workerName, title: r.taskTitle, area: r.area, note: r.note, photos: r.photos, time: r.completedAt, gps: r.gps, comments: (r.comments ?? []).map(c => ({ name: c.author, text: c.text, time: c.time })) }));
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const { readIds } = useNotificationRead();
  const events: AppNotice[] = [
    ...leaderCompletedTasks.map(task => {
      const diary = reports.find(report => report.taskId === task.id);
      const assignment = tasks.find(item => item.taskIds.includes(task.id));
      return {
        id: `completed:${task.id}`, category: 'work' as const,
        title: `${task.workerName || members.find(member => member.id === task.memberIds[0])?.name || 'Công nhân'} đã hoàn thành công việc`,
        text: `${task.title} · ${task.area}`,
        occurredAt: task.updatedAt, timeLabel: noticeTime(task.updatedAt),
        target: diary
          ? { pathname: '/(leader)/diary-detail' as const, params: { id: diary.id } }
          : { pathname: '/(leader)/assignments' as const, params: { taskId: assignment?.id ?? task.id } },
      };
    }),
    ...tasks.map(t => ({ id: `task:${t.id}`, category: t.owner ? 'work' as const : 'schedule' as const, title: t.owner ? 'Chủ nông trại · Giao việc' : 'Lịch phân công', text: `${t.title} · ${t.area}`, occurredAt: leaderTasks.find(task => task.id === t.id)?.createdAt, timeLabel: t.owner ? noticeTime(leaderTasks.find(task => task.id === t.id)?.createdAt) : scheduleDateLabel(t.startDate, t.due), target: { pathname: t.owner ? '/(leader)' as const : '/(leader)/assignments' as const, params: { taskId: t.id } } })),
    ...diaries.map(d => ({ id: `diary:${d.id}`, category: 'work' as const, title: `${d.name} · Nhật ký`, text: d.title, occurredAt: d.time, timeLabel: noticeTime(d.time), target: { pathname: '/(leader)/diary-detail' as const, params: { id: d.id } } })),
  ];
  for (const t of tasks.filter(t => t.due < localToday() && t.status !== 'done')) events.unshift({ id: `overdue:${t.id}:${t.due}`, category: 'alert', title: 'Công việc quá hạn', text: t.title, timeLabel: `Hạn ${t.due}`, target: { pathname: t.owner ? '/(leader)' : '/(leader)/assignments', params: { taskId: t.id } } });
  const notices = events.map(n => ({ ...n, read: readIds.includes(n.id) }));
  const addTask = async (value: Omit<Task, 'id' | 'status' | 'displayStatus' | 'rawContent' | 'taskIds' | 'assignmentId'>) => {
    if (!accessToken || !user?.team_id || !value.plotId || !value.startDate) throw new Error('Thiếu thông tin tổ, lô đất hoặc ngày bắt đầu để giao việc.');
    const assignmentId = `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await Promise.all(value.memberIds.map(workerId => createTask(accessToken, {
      team_id: user.team_id!, worker_id: workerId, plot_id: value.plotId!,
      start_at: `${value.startDate}T00:00:00+07:00`, due_at: `${value.due}T23:59:59+07:00`,
      content: encodeTaskContent({ title: value.title, instructions: value.instructions, tools: value.tools, assignmentId }),
    })));
    await loadTasks();
  };
  const addComment = (id: string, text: string, _name: string) => addReportComment(id, text);
  return { members, membersError, loadMembers, tasks, diaries, draft, setDraft, addTask, addComment, notices };
}
const Context = createContext<ReturnType<typeof useLeaderState> | null>(null);
export function LeaderProvider({ children }: PropsWithChildren) {
  const value = useLeaderState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLeader() { const value = useContext(Context); if (!value) throw new Error('LeaderProvider missing'); return value; }
