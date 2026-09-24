import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useWorkSchedule } from './work-schedule-context';

export type ReportDraft = { taskTitle: string; taskId?: string; area: string; note: string; photos: string[] };
export type WorkReport = ReportDraft & {
  id: string; completedAt: string; workerPhone: string; workerName: string;
  orgId: string | null; teamId: string | null; leaderPhone?: string;
  review?: 'passed' | 'rejected'; reviewedBy?: string;
  comments?: { id: string; author: string; text: string; time: string }[];
};
export const reviewLabel = (report: Pick<WorkReport, 'review'>) => report.review === 'rejected' ? 'Không đạt · Cần làm lại' : report.review === 'passed' ? 'Đạt' : 'Chờ đánh giá';
const KEY = 'agrifarm.reports.v1';
const phoneKey = (phone: string) => phone.replace(/\D/g, '').replace(/^84(?=\d{9}$)/, '0');
function useReportState() {
  const { user } = useAuth();
  const { workerTasks } = useWorkSchedule();
  const [all, setAll] = useState<WorkReport[]>([]);
  const current = useRef<WorkReport[]>([]);
  const busy = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ReportDraft>>({});
  useEffect(() => { setDrafts({}); }, [user?.phone]);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY).then(raw => {
      const data = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(data) || !data.every(r => typeof r.id === 'string' && typeof r.workerPhone === 'string' && Array.isArray(r.photos))) throw new Error();
      if (active) { current.current = data; setAll(data); setReady(true); }
    }).catch(() => { if (active) setError('Không đọc được nhật ký đã lưu. Vui lòng mở lại ứng dụng.'); });
    return () => { active = false; };
  }, []);
  const visible = (r: WorkReport) => !!user && r.orgId === user.org_id && r.teamId === user.team_id && (user.role === 'worker' ? phoneKey(r.workerPhone) === phoneKey(user.phone) : user.role === 'leader' && (!r.leaderPhone || phoneKey(r.leaderPhone) === phoneKey(user.phone)));
  const reports = all.filter(visible);
  async function save(update: (old: WorkReport[]) => WorkReport[]) {
    if (!ready || busy.current) throw new Error('Nhật ký đang tải hoặc đang lưu. Vui lòng thử lại.');
    busy.current = true;
    try {
      const next = update(current.current);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
      current.current = next; setAll(next);
    } finally { busy.current = false; }
  }
  async function createReport(input: ReportDraft) {
    if (!user || user.role !== 'worker') throw new Error('Vui lòng đăng nhập bằng tài khoản công nhân.');
    const task = workerTasks.find(t => t.id === input.taskId);
    if (input.taskId && !task) throw new Error('Công việc không còn được phân công cho bạn.');
    if (!input.taskTitle.trim() || !input.area.trim() || input.photos.length < 2) throw new Error('Nhập đủ thông tin và chụp ít nhất 2 ảnh.');
    const report: WorkReport = { ...input, id: 'report-' + Date.now() + '-' + Math.random().toString(36).slice(2), completedAt: new Date().toISOString(), workerPhone: user.phone, workerName: user.full_name, orgId: user.org_id, teamId: user.team_id, leaderPhone: task?.leaderPhone };
    if (FileSystem.documentDirectory) {
      const directory = FileSystem.documentDirectory + 'reports/' + report.id + '/';
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      report.photos = await Promise.all(input.photos.map(async (uri, index) => {
        const destination = directory + index + '.jpg';
        await FileSystem.copyAsync({ from: uri, to: destination });
        return destination;
      }));
    }
    await save(old => {
      const latest = old.find(r => r.taskId === input.taskId && phoneKey(r.workerPhone) === phoneKey(user.phone));
      if (input.taskId && latest && latest.review !== 'rejected') throw new Error('Công việc đã có báo cáo. Chỉ gửi lại khi tổ trưởng đánh giá không đạt.');
      return [report, ...old];
    });
    return report;
  }
  async function reviewReport(id: string, review: 'passed' | 'rejected') {
    if (user?.role !== 'leader') throw new Error('Chỉ tổ trưởng được đánh giá.');
    await save(old => {
      const report = old.find(r => r.id === id && visible(r));
      if (!report) throw new Error('Không tìm thấy báo cáo thuộc tổ của bạn.');
      if (report.taskId && old.find(r => r.taskId === report.taskId && phoneKey(r.workerPhone) === phoneKey(report.workerPhone))?.id !== id) throw new Error('Đã có báo cáo mới hơn. Hãy đánh giá báo cáo mới nhất.');
      return old.map(r => r.id === id ? { ...r, review, reviewedBy: user.full_name } : r);
    });
  }
  async function addReportComment(id: string, text: string) {
    if (user?.role !== 'leader') throw new Error('Chỉ tổ trưởng được nhận xét.');
    await save(old => old.map(r => r.id === id && visible(r) ? { ...r, comments: [...(r.comments ?? []), { id: String(Date.now()), author: user.full_name, text, time: new Date().toISOString() }] } : r));
  }
  return { reports, drafts, setDrafts, createReport, reviewReport, addReportComment, ready, error, getReport: (id: string | undefined) => reports.find(r => r.id === id) };
}
const ReportContext = createContext<ReturnType<typeof useReportState> | null>(null);
export function ReportProvider({ children }: PropsWithChildren) { const value = useReportState(); return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>; }
export function useReports() { const value = useContext(ReportContext); if (!value) throw new Error('ReportProvider missing'); return value; }
