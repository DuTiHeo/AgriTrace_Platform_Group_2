import { useReports } from './report-context';
import { type AppNotice, localToday, useNotificationRead } from './notification-context';
import { useWorkSchedule } from './work-schedule-context';
import { type TaskPriority } from '@/components/common/task-priority';
import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { Asset } from 'expo-asset';

export type Member = { id: string; name: string; phone: string; area: string; active: boolean; joined: string };
export type Task = { id: string; title: string; instructions: string; memberIds: string[]; area: string; due: string; status: 'todo' | 'doing' | 'done'; owner?: boolean; priority?: TaskPriority; startTime?: string; endTime?: string; tools?: string };
export type Diary = { id: string; memberId: string; name: string; title: string; area: string; note: string; photos: string[]; time: string; comments: { name: string; text: string; time: string }[] };
export type Draft = { title: string; area: string; note: string; photos: string[]; taskId?: string };
export const areas = ['Khu A · Lô 01', 'Khu A · Lô 02', 'Khu B · Lô 01', 'Khu C · Lô 01'];
export const blankDraft = (): Draft => ({ title: '', area: areas[0], note: '', photos: [] });
const day = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const photo = Asset.fromModule(require('@/assets/images/base.png')).uri;
const initialMembers: Member[] = [
  { id: 'm1', name: 'Nguyễn Văn Minh', phone: '0945555666', area: areas[0], active: true, joined: '2025-06-01' },
  { id: 'm2', name: 'Trần Thị Hoa', phone: '0945777888', area: areas[1], active: true, joined: '2025-07-12' },
  { id: 'm3', name: 'Phạm Thị Ngân', phone: '0967001111', area: areas[2], active: true, joined: '2025-08-05' },
  { id: 'm4', name: 'Lê Văn Tú', phone: '0956999000', area: areas[3], active: false, joined: '2025-05-18' },
];
const initialTasks: Task[] = [
  { id: 't1', title: 'Tưới nước hằng ngày', instructions: 'Kiểm tra độ ẩm đất. Tưới đều và chụp ảnh sau khi hoàn thành.', memberIds: ['m1'], area: areas[0], due: day(), status: 'todo' },
  { id: 't2', title: 'Bón phân hữu cơ', instructions: 'Bón phân theo hướng dẫn, giữ sạch lối đi.', memberIds: ['m1', 'm2'], area: areas[1], due: day(1), status: 'todo' },
  { id: 't3', title: 'Kiểm tra sâu bệnh', instructions: 'Quan sát mặt dưới lá và ghi nhận vị trí có sâu bệnh.', memberIds: ['m3'], area: areas[2], due: day(), status: 'doing' },
  { id: 't4', title: 'Thu gom cỏ', instructions: 'Thu gom cỏ sau khi làm sạch luống.', memberIds: ['m4'], area: areas[3], due: day(-1), status: 'done' },
  { id: 'o1', title: 'Kiểm tra tổng hợp khu A', instructions: 'Kiểm tra hệ thống tưới và tình hình sinh trưởng. Chụp ảnh báo cáo hiện trạng.', memberIds: [], area: areas[0], due: day(), status: 'doing', owner: true },
  { id: 'o2', title: 'Rà soát vật tư trong kho', instructions: 'Ghi nhận số lượng vật tư và các hạng mục cần bổ sung.', memberIds: [], area: areas[2], due: day(1), status: 'todo', owner: true },
];
const initialDiaries: Diary[] = [
  { id: 'd1', memberId: 'm1', name: 'Nguyễn Văn Minh', title: 'Tưới nước buổi sáng', area: areas[0], note: 'Đã kiểm tra hệ thống tưới, áp lực nước ổn định. Các luống rau đủ ẩm.', photos: [photo, photo], time: new Date().toISOString(), comments: [{ name: 'Tổ trưởng', text: 'Theo dõi thêm độ ẩm vào cuối buổi nhé.', time: new Date().toISOString() }] },
  { id: 'd2', memberId: 'm2', name: 'Trần Thị Hoa', title: 'Chăm sóc luống rau', area: areas[1], note: 'Đã dọn cỏ quanh gốc và kiểm tra lá. Chưa phát hiện sâu bệnh.', photos: [photo, photo], time: new Date().toISOString(), comments: [] },
];
function useLeaderState() {
  const [members, setMembers] = useState(initialMembers);
  const [sampleTasks, setTasks] = useState(initialTasks);
  const { leaderTasks, addAssignment } = useWorkSchedule();
  const { reports, addReportComment } = useReports();
  const tasks: Task[] = [...leaderTasks.map(t => {
    const latest = t.assigneePhones.map(phone => reports.find(r => r.taskId === t.id && r.workerPhone.replace(/^84/, '0') === phone.replace(/^84/, '0')));
    return { ...t, status: latest.some(r => r?.review === 'rejected') ? 'todo' as const : latest.length > 0 && latest.every(r => r && r.review !== 'rejected') ? 'done' as const : t.status };
  }), ...sampleTasks];
  const [localDiaries, setDiaries] = useState(initialDiaries);
  const diaries: Diary[] = [...reports.map(r => ({ id: r.id, memberId: r.workerPhone, name: r.workerName, title: r.taskTitle, area: r.area, note: r.note, photos: r.photos, time: r.completedAt, comments: (r.comments ?? []).map(c => ({ name: c.author, text: c.text, time: c.time })) })), ...localDiaries];
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const { readIds } = useNotificationRead();
  const events: AppNotice[] = [
    ...tasks.map(t => ({ id: `task:${t.id}`, category: t.owner ? 'work' as const : 'schedule' as const, title: t.owner ? 'Chủ nông trại · Giao việc' : 'Lịch phân công', text: `${t.title} · ${t.area}`, timeLabel: `Hạn ${t.due}`, target: { pathname: t.owner ? '/(leader)' as const : '/(leader)/assignments' as const, params: { taskId: t.id } } })),
    ...diaries.map(d => ({ id: `diary:${d.id}`, category: 'work' as const, title: `${d.name} · Nhật ký`, text: d.title, timeLabel: new Date(d.time).toLocaleDateString('vi-VN'), target: { pathname: '/(leader)/diary-detail' as const, params: { id: d.id } } })),
  ];
  for (const t of tasks.filter(t => t.due < localToday() && t.status !== 'done')) events.unshift({ id: `overdue:${t.id}:${t.due}`, category: 'alert', title: 'Công việc quá hạn', text: t.title, timeLabel: `Hạn ${t.due}`, target: { pathname: t.owner ? '/(leader)' : '/(leader)/assignments', params: { taskId: t.id } } });
  const notices = events.map(n => ({ ...n, read: readIds.includes(n.id) }));
  const addTask = (value: Omit<Task, 'id' | 'status'>) => addAssignment({ ...value, priority: value.priority ?? 'medium', assigneePhones: members.filter(m => value.memberIds.includes(m.id)).map(m => m.phone) });
  const updateMember = (id: string, phone: string, active: boolean) => setMembers(old => old.map(m => m.id === id ? { ...m, phone, active } : m));
  const addComment = (id: string, text: string, name: string) => reports.some(r => r.id === id) ? addReportComment(id, text) : setDiaries(old => old.map(d => d.id === id ? { ...d, comments: [...d.comments, { text, name, time: new Date().toISOString() }] } : d));
  const postDraft = (name: string) => {
    if (draft.photos.length < 2 || !draft.title.trim()) return;
    setDiaries(old => [{ id: `d-${Date.now()}`, memberId: 'self', name, title: draft.title.trim(), area: draft.area, note: draft.note, photos: draft.photos, time: new Date().toISOString(), comments: [] }, ...old]);
    if (draft.taskId) setTasks(old => old.map(t => t.id === draft.taskId ? { ...t, status: 'done' } : t));
    setDraft(blankDraft());
  };
  return { members, tasks, diaries, draft, setDraft, addTask, updateMember, addComment, postDraft, notices };
}
const Context = createContext<ReturnType<typeof useLeaderState> | null>(null);
export function LeaderProvider({ children }: PropsWithChildren) {
  const value = useLeaderState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLeader() { const value = useContext(Context); if (!value) throw new Error('LeaderProvider missing'); return value; }
