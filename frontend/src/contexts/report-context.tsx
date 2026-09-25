import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import * as api from '@/sevices/farming-log.service';
import { latestReview, reviewContent } from '@/sevices/log-review';

export type ReportDraft = {
  taskTitle: string; taskId?: string; area: string; note: string; photos: string[];
  seasonId?: string; gps?: api.GPSPoint; savedLogId?: string;
};
export type WorkReport = ReportDraft & {
  id: string; completedAt: string; workerPhone: string; workerName: string; workerId: string;
  orgId: string | null; teamId: string | null; leaderPhone?: string;
  review?: 'passed' | 'rejected'; reviewedBy?: string;
  comments?: { id: string; author: string; text: string; time: string; resolved: boolean }[];
};
export const reviewLabel = (report: Pick<WorkReport, 'review'>) => report.review === 'rejected' ? 'Không đạt' : report.review === 'passed' ? 'Đạt' : 'Đã ghi nhận';

function useReportState() {
  const { accessToken, user } = useAuth();
  const session = useRef(accessToken);
  session.current = accessToken;
  const [cacheOwner, setCacheOwner] = useState(accessToken);
  const [logs, setLogs] = useState<api.FarmingLog[]>([]);
  const [details, setDetails] = useState<Record<string, api.FarmingLogDetail>>({});
  const [seasons, setSeasons] = useState<api.Season[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seasonsError, setSeasonsError] = useState('');
  const [drafts, updateDrafts] = useState<Record<string, ReportDraft>>({});
  const setDrafts: typeof updateDrafts = useCallback(update => {
    if (session.current === accessToken) updateDrafts(update);
  }, [accessToken]);
  const listSequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!accessToken) return;
    const sequence = ++listSequence.current;
    setLoading(true); setError('');
    const [listResult, seasonResult] = await Promise.allSettled([api.listLogs(accessToken), api.listSeasons(accessToken)]);
    if (session.current !== accessToken || sequence !== listSequence.current) return;
    if (listResult.status === 'fulfilled') { setLogs(listResult.value); setReady(true); }
    else setError(listResult.reason instanceof Error ? listResult.reason.message : 'Không tải được nhật ký.');
    if (seasonResult.status === 'fulfilled') { setSeasons(seasonResult.value); setSeasonsError(''); }
    else setSeasonsError(seasonResult.reason instanceof Error ? seasonResult.reason.message : 'Không tải được mùa vụ.');
    setLoading(false);
  }, [accessToken]);
  useEffect(() => {
    session.current = accessToken;
    setCacheOwner(accessToken);
    setLogs([]); setDetails({}); setSeasons([]); updateDrafts({}); setReady(false); setError(''); setSeasonsError(''); setLoading(false);
    void refresh();
    return () => { ++listSequence.current; session.current = null; };
  }, [refresh, accessToken]);

  const storeDetail = useCallback((detail: api.FarmingLogDetail, token: string) => {
    if (session.current !== token) return;
    setDetails(old => ({ ...old, [detail.log_id]: detail }));
    setLogs(old => old.some(log => log.log_id === detail.log_id)
      ? old.map(log => log.log_id === detail.log_id ? detail : log) : [detail, ...old]);
  }, []);
  const loadReport = useCallback(async (id: string) => {
    if (!accessToken) throw new Error('Vui lòng đăng nhập lại.');
    const detail = await api.getLog(accessToken, id);
    storeDetail(detail, accessToken);
    return detail;
  }, [accessToken, storeDetail]);

  const reports: WorkReport[] = (cacheOwner === accessToken ? logs : []).map(log => {
    const detail = details[log.log_id];
    const season = seasons.find(s => s.season_id === log.season_id);
    return {
      id: log.log_id, seasonId: log.season_id, taskTitle: log.activity_type,
      area: season ? api.seasonLabel(season) : 'Mùa vụ ' + log.season_id,
      note: log.content ?? '', gps: log.gps, completedAt: log.logged_at,
      workerId: log.user_id, workerPhone: '', workerName: log.user_name ?? 'Người ghi nhật ký',
      orgId: log.org_id, teamId: log.team_id,
      photos: detail?.photos.map(p => api.photoUrl(p.url)) ?? [],
      comments: detail?.notes.map(n => ({ id: n.note_id, author: n.leader_name ?? 'Người quản lý', text: n.content, time: n.created_at, resolved: n.resolved })),
      ...latestReview(detail?.notes ?? []),
    };
  });

  async function createReport(input: ReportDraft) {
    if (!accessToken || !user || !['worker', 'leader'].includes(user.role)) throw new Error('Chỉ công nhân và tổ trưởng được tạo nhật ký.');
    if (!input.seasonId || !input.gps || !input.taskTitle.trim() || !input.area.trim() || !input.note.trim()) throw new Error('Vui lòng điền đủ tên công việc, khu vực, nội dung nhật ký và GPS.');
    const detail = await api.createLog(accessToken, {
      season_id: input.seasonId, activity_type: input.taskTitle.trim(), content: input.note.trim() || undefined, gps: input.gps,
    });
    if (session.current !== accessToken) throw new Error('Phiên đăng nhập đã thay đổi.');
    storeDetail(detail, accessToken);
    return detail;
  }
  async function addReportComment(id: string, text: string) {
    if (!accessToken || !user || !['leader', 'owner'].includes(user.role)) throw new Error('Bạn không có quyền thêm ghi chú.');
    const note = await api.createNote(accessToken, id, text.trim());
    if (session.current === accessToken) {
      setDetails(old => old[id] ? { ...old, [id]: { ...old[id], notes: [...old[id].notes, note] } } : old);
      if (!details[id]) storeDetail(await api.getLog(accessToken, id), accessToken);
    }
    return note;
  }
  async function setNoteResolved(id: string, noteId: string, resolved: boolean) {
    if (!accessToken) throw new Error('Vui lòng đăng nhập lại.');
    const note = await api.resolveNote(accessToken, noteId, resolved);
    if (session.current === accessToken) setDetails(old => old[id] ? { ...old, [id]: { ...old[id], notes: old[id].notes.map(n => n.note_id === noteId ? note : n) } } : old);
  }
  async function reviewReport(id: string, review: 'passed' | 'rejected') {
    if (user?.role !== 'leader') throw new Error('Chỉ tổ trưởng được đánh giá nhật ký.');
    return addReportComment(id, reviewContent(review));
  }
  return { reports, drafts: cacheOwner === accessToken ? drafts : {}, setDrafts, createReport, reviewReport, addReportComment, setNoteResolved, ready, loading, error, seasonsError, seasons: cacheOwner === accessToken ? seasons : [], refresh, loadReport, storeDetail,
    getReport: (id: string | undefined) => reports.find(r => r.id === id), hasDetail: (id: string) => !!details[id] };
}
const ReportContext = createContext<ReturnType<typeof useReportState> | null>(null);
export function ReportProvider({ children }: PropsWithChildren) {
  const value = useReportState();
  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}
export function useReports() { const value = useContext(ReportContext); if (!value) throw new Error('ReportProvider missing'); return value; }
