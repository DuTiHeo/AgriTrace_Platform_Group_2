import { useReports } from './report-context';
import { type AppNotice, localToday, useNotificationRead } from './notification-context';
import { useWorkSchedule } from './work-schedule-context';
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
import { createTask, listTeamMembers } from '@/sevices/farming-log.service';

export type Member = { id: string; name: string; phone: string; area: string; active: boolean };
export type Task = { id: string; title: string; instructions: string; memberIds: string[]; area: string; plotId?: string; due: string; status: 'todo' | 'doing' | 'done'; owner?: boolean; startDate?: string; startTime?: string; endTime?: string; tools?: string };
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
  const { leaderTasks, addAssignment } = useWorkSchedule();
  const { reports, addReportComment } = useReports();
  const tasks: Task[] = leaderTasks;
  const diaries: Diary[] = reports.map(r => ({ id: r.id, memberId: r.workerId, name: r.workerName, title: r.taskTitle, area: r.area, note: r.note, photos: r.photos, time: r.completedAt, gps: r.gps, comments: (r.comments ?? []).map(c => ({ name: c.author, text: c.text, time: c.time })) }));
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const { readIds } = useNotificationRead();
  const events: AppNotice[] = [
    ...tasks.map(t => ({ id: `task:${t.id}`, category: t.owner ? 'work' as const : 'schedule' as const, title: t.owner ? 'Chủ nông trại · Giao việc' : 'Lịch phân công', text: `${t.title} · ${t.area}`, timeLabel: `Hạn ${t.due}`, target: { pathname: t.owner ? '/(leader)' as const : '/(leader)/assignments' as const, params: { taskId: t.id } } })),
    ...diaries.map(d => ({ id: `diary:${d.id}`, category: 'work' as const, title: `${d.name} · Nhật ký`, text: d.title, timeLabel: new Date(d.time).toLocaleDateString('vi-VN'), target: { pathname: '/(leader)/diary-detail' as const, params: { id: d.id } } })),
  ];
  for (const t of tasks.filter(t => t.due < localToday() && t.status !== 'done')) events.unshift({ id: `overdue:${t.id}:${t.due}`, category: 'alert', title: 'Công việc quá hạn', text: t.title, timeLabel: `Hạn ${t.due}`, target: { pathname: t.owner ? '/(leader)' : '/(leader)/assignments', params: { taskId: t.id } } });
  const notices = events.map(n => ({ ...n, read: readIds.includes(n.id) }));
  const addTask = async (value: Omit<Task, 'id' | 'status'>) => {
    if (!accessToken || !user?.team_id || !value.plotId) throw new Error('Thiếu thông tin tổ hoặc lô đất để giao việc.');
    await Promise.all(value.memberIds.map(workerId => createTask(accessToken, {
      team_id: user.team_id!, worker_id: workerId, plot_id: value.plotId!, content: value.title, due_date: value.due,
    })));
    await addAssignment({ ...value, assigneePhones: members.filter(m => value.memberIds.includes(m.id)).map(m => m.phone) });
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
