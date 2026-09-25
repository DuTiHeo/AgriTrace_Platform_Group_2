import { useReports } from './report-context';
import { type AppNotice, localToday, useNotificationRead } from './notification-context';
import { useWorkSchedule } from './work-schedule-context';
import { type TaskPriority } from '@/components/common/task-priority';
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth-context';
import { createTask, listTeamMembers } from '@/sevices/farming-log.service';

export type Member = { id: string; name: string; phone: string; area: string; active: boolean; joined: string };
export type Task = { id: string; title: string; instructions: string; memberIds: string[]; area: string; plotId?: string; due: string; status: 'todo' | 'doing' | 'done'; owner?: boolean; priority?: TaskPriority; startTime?: string; endTime?: string; tools?: string };
export type Diary = { id: string; memberId: string; name: string; title: string; area: string; note: string; photos: string[]; time: string; gps?: { latitude: number; longitude: number }; comments: { name: string; text: string; time: string }[] };
export type Draft = { title: string; area: string; note: string; photos: string[]; taskId?: string; seasonId?: string; gps?: { latitude: number; longitude: number }; savedLogId?: string };
export const areas = ['Khu A · Lô 01', 'Khu A · Lô 02', 'Khu B · Lô 01', 'Khu C · Lô 01'];
export const blankDraft = (): Draft => ({ title: '', area: '', note: '', photos: [] });
const day = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const initialTasks: Task[] = [
  { id: 't1', title: 'Tưới nước hằng ngày', instructions: 'Kiểm tra độ ẩm đất. Tưới đều và chụp ảnh sau khi hoàn thành.', memberIds: ['m1'], area: areas[0], due: day(), status: 'todo' },
  { id: 't2', title: 'Bón phân hữu cơ', instructions: 'Bón phân theo hướng dẫn, giữ sạch lối đi.', memberIds: ['m1', 'm2'], area: areas[1], due: day(1), status: 'todo' },
  { id: 't3', title: 'Kiểm tra sâu bệnh', instructions: 'Quan sát mặt dưới lá và ghi nhận vị trí có sâu bệnh.', memberIds: ['m3'], area: areas[2], due: day(), status: 'doing' },
  { id: 't4', title: 'Thu gom cỏ', instructions: 'Thu gom cỏ sau khi làm sạch luống.', memberIds: ['m4'], area: areas[3], due: day(-1), status: 'done' },
  { id: 'o1', title: 'Kiểm tra tổng hợp khu A', instructions: 'Kiểm tra hệ thống tưới và tình hình sinh trưởng. Chụp ảnh báo cáo hiện trạng.', memberIds: [], area: areas[0], due: day(), status: 'doing', owner: true },
  { id: 'o2', title: 'Rà soát vật tư trong kho', instructions: 'Ghi nhận số lượng vật tư và các hạng mục cần bổ sung.', memberIds: [], area: areas[2], due: day(1), status: 'todo', owner: true },
];
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
        joined: '',
      })));
    } catch (error) {
      setMembersError(error instanceof Error ? error.message : 'Không tải được thành viên.');
    }
  }, [accessToken]);
  useEffect(() => { void loadMembers(); }, [loadMembers]);
  const [sampleTasks] = useState(initialTasks);
  const { leaderTasks, addAssignment } = useWorkSchedule();
  const { reports, addReportComment } = useReports();
  const tasks: Task[] = [...leaderTasks, ...sampleTasks];
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
    await addAssignment({ ...value, priority: value.priority ?? 'medium', assigneePhones: members.filter(m => value.memberIds.includes(m.id)).map(m => m.phone) });
  };
  const updateMember = (id: string, phone: string, active: boolean) => setMembers(old => old.map(m => m.id === id ? { ...m, phone, active } : m));
  const addComment = (id: string, text: string, _name: string) => addReportComment(id, text);
  return { members, membersError, loadMembers, tasks, diaries, draft, setDraft, addTask, updateMember, addComment, notices };
}
const Context = createContext<ReturnType<typeof useLeaderState> | null>(null);
export function LeaderProvider({ children }: PropsWithChildren) {
  const value = useLeaderState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLeader() { const value = useContext(Context); if (!value) throw new Error('LeaderProvider missing'); return value; }
