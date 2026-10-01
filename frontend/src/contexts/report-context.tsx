import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import * as api from '@/sevices/farming-log.service';
import { latestReview, reviewContent } from '@/sevices/log-review';
import { sessionUserId } from '@/sevices/session-user';
import { notificationLogs } from '@/sevices/notification-events';

export type ReportDraft = {
  taskTitle: string;
  taskId?: string;
  plotId?: string;
  area: string;
  note: string;
  photos: string[];
  seasonId?: string;
  gps?: api.GPSPoint;
  savedLogId?: string;
};
export type WorkReport = ReportDraft & {
  id: string;
  completedAt: string;
  workerPhone: string;
  workerName: string;
  workerId: string;
  orgId: string | null;
  teamId: string | null;
  leaderPhone?: string;
  review?: 'passed' | 'rejected';
  reviewedBy?: string;
  comments?: {
    id: string;
    author: string;
    text: string;
    time: string;
    resolved: boolean
  }[];
};
export const reviewLabel = (report: Pick<WorkReport, 'review'>) => report.review === 'rejected' ? 'Không đạt' : report.review === 'passed' ? 'Đạt' : 'Đã ghi nhận';

function mapReport(log: api.FarmingLog, detail?: api.FarmingLogDetail, season?: api.Season): WorkReport {
    return {
      id: log.log_id,
      seasonId: log.season_id,
      taskTitle: log.activity_type,
      area: season ? api.seasonLabel(season) : 'Mùa vụ ' + log.season_id,
      note: log.content ?? '',
      gps: log.gps,
      completedAt: log.logged_at,
      workerId: log.user_id,
      workerPhone: '',
      workerName: log.user_name ?? 'Người ghi nhật ký',
      orgId: log.org_id,
      teamId: log.team_id,
      photos: detail?.photos.map(p => api.photoUrl(p.url)) ?? [],
      comments: detail?.notes.map(n => ({
        id: n.note_id,
        author: n.leader_name ?? 'Người quản lý',
        text: n.content,
        time: n.created_at,
        resolved: n.resolved
      })),
      ...latestReview(detail?.notes ?? []),
    };
}

function useReportState() {
  const { accessToken, user } = useAuth();
  const { workerTasks, leaderTasks, ready: scheduleReady } = useWorkSchedule();
  const assignedPlotKey = [...new Set((user?.role === 'worker' ? workerTasks : user?.role === 'leader' ? leaderTasks : [])
    .map(task => task.plotId)
    .filter(Boolean))].sort().join('|');
  const session = useRef(accessToken);
  session.current = accessToken;
  const [notificationReports, setNotificationReports] = useState<WorkReport[]>([]);
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const notificationSequence = useRef(0);
  const refreshNotifications = useCallback(async () => {
    if (!accessToken) return;
    const sequence = ++notificationSequence.current;
    try {
      const userId = sessionUserId(accessToken);
      if (!userId) throw new Error('Không xác định được tài khoản nhận thông báo. Vui lòng đăng nhập lại.');
      const allLogs = notificationLogs(await api.listLogs(accessToken), user?.role, user?.team_id, userId);
      const results = user?.role === 'worker'
        ? await Promise.allSettled(allLogs.map(log => api.getLog(accessToken, log.log_id)))
        : allLogs.map(() => ({ status: 'rejected' as const }));
      if (session.current !== accessToken || sequence !== notificationSequence.current) return;
      setNotificationReports(allLogs.map((log, index) => {
        const result = results[index];
        return mapReport(log, result.status === 'fulfilled' ? result.value : undefined);
      }));
      setNotificationsError(user?.role === 'worker' && results.some(result => result.status === 'rejected') ? 'Một số nhận xét hoặc đánh giá chưa tải được. Vui lòng thử lại.' : '');
      setNotificationsReady(true);
    } catch (e) {
      if (session.current === accessToken && sequence === notificationSequence.current)
        setNotificationsError(e instanceof Error ? e.message : 'Không tải được thông báo nhật ký.');
    }
  }, [accessToken, user?.role, user?.team_id]);
  useEffect(() => {
    ++notificationSequence.current;
    setNotificationReports([]);
    setNotificationsReady(false);
    setNotificationsError('');
    void refreshNotifications();
  }, [refreshNotifications]);
  const [cacheOwner, setCacheOwner] = useState(accessToken);
  const [logs, setLogs] = useState<api.FarmingLog[]>([]);
  const [details, setDetails] = useState<Record<string, api.FarmingLogDetail>>({});
  const detailsRef = useRef<Record<string, api.FarmingLogDetail>>({});
  const pendingDetails = useRef(new Set<string>());
  const [seasons, setSeasons] = useState<api.Season[]>([]);
  const seasonsRef = useRef<api.Season[]>([]);
  const [selectedSeasonId, updateSelectedSeasonId] = useState<string | null>('all');
  const selectedSeasonRef = useRef<string | null>('all');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seasonsError, setSeasonsError] = useState('');
  const [drafts, updateDrafts] = useState<Record<string, ReportDraft>>({});
  const setDrafts: typeof updateDrafts = useCallback(update => {
    if (session.current === accessToken)
      updateDrafts(update);
  }, [accessToken]);
  const listSequence = useRef(0);
  const logsScope = useRef<string | null>(null);
  const lastLoadedAt = useRef(0);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const loadSeasonLogs = useCallback(async (seasonId: string) => {
    if (!accessToken)
      return;

    const sequence = ++listSequence.current;
    setLoading(true);
    setError('');

    if (logsScope.current !== seasonId) {
      setLogs([]);
      setDetails({});
      detailsRef.current = {};
      pendingDetails.current.clear();
      logsScope.current = seasonId;
    }

    try {
      const scopedSeasons = seasonId.startsWith('plot:')
        ? seasonsRef.current.filter(season => season.plot_id === seasonId.slice(5))
        : seasonsRef.current;
      const seasonLogs = seasonId.startsWith('plot:') || (seasonId === 'all' && user?.role === 'worker')
        ? (await Promise.all(scopedSeasons.map(season => api.listLogs(accessToken, season.season_id))))
          .flat().sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
        : await api.listLogs(accessToken, seasonId === 'all' ? undefined : seasonId);

      if (session.current !== accessToken || sequence !== listSequence.current)
        return;

      setDetails({});
      detailsRef.current = {};
      pendingDetails.current.clear();
      setLogs(seasonLogs);
      setReady(true);
      lastLoadedAt.current = Date.now();
    } catch (loadError) {
      if (session.current === accessToken && sequence === listSequence.current) {
        setError(loadError instanceof Error ? loadError.message : 'Không tải được nhật ký.');
      }
    } finally {
      if (session.current === accessToken && sequence === listSequence.current)
        setLoading(false);
    }
  }, [
    accessToken,
    user?.role
  ]);
  const refresh = useCallback((options: {
    skipIfFresh?: boolean
  } = {}) => {
    if (!accessToken)
      return Promise.resolve();

    if ([
      'worker',
      'leader'
    ].includes(user?.role ?? '') && !scheduleReady)
      return Promise.resolve();

    if (refreshInFlight.current)
      return refreshInFlight.current;

    if (options.skipIfFresh && Date.now() - lastLoadedAt.current < 3000)
      return Promise.resolve();

    const token = accessToken;
    const operation = (async () => {
      setLoading(true);
      setSeasonsError('');

      try {
        const availableSeasons = await api.listSeasons(token, user?.team_id);

        if (session.current !== token)
          return;

        const assignedPlotIds = new Set(assignedPlotKey ? assignedPlotKey.split('|') : []);
        const seasonList = [
          'worker',
          'leader'
        ].includes(user?.role ?? '')
          ? availableSeasons.filter(season => (user?.role === 'leader' || assignedPlotIds.has(season.plot_id))
            && (user?.role !== 'worker' || [
              'growing',
              'ready_to_harvest'
            ].includes(season.status)))
          : availableSeasons;
        seasonsRef.current = seasonList;
        setSeasons(seasonList);
        const current = selectedSeasonRef.current;

        if (current === 'all') {
          await loadSeasonLogs('all');

          return;
        }

        const chosen = seasonList.find(season => `plot:${season.plot_id}` === current)
          ?? seasonList.find(season => [
            'growing',
            'ready_to_harvest'
          ].includes(season.status))
          ?? seasonList[0];

        if (!chosen) {
          selectedSeasonRef.current = null;
          updateSelectedSeasonId(null);
          setLogs([]);
          setDetails({});
          detailsRef.current = {};
          pendingDetails.current.clear();
          setReady(true);
          setLoading(false);
          lastLoadedAt.current = Date.now();

          return;
        }

        const selection = `plot:${chosen.plot_id}`;
        selectedSeasonRef.current = selection;
        updateSelectedSeasonId(selection);
        await loadSeasonLogs(selection);
      } catch (seasonError) {
        if (session.current === token) {
          setSeasonsError(seasonError instanceof Error ? seasonError.message : 'Không tải được mùa vụ.');
          setLoading(false);
        }
      }
    })();
    refreshInFlight.current = operation;
    void operation.finally(() => {
      if (refreshInFlight.current === operation)
        refreshInFlight.current = null;
    });

    return operation;
  }, [
    accessToken,
    assignedPlotKey,
    loadSeasonLogs,
    scheduleReady,
    user?.role,
    user?.team_id
  ]);
  const selectSeason = useCallback((seasonId: string) => {
    if (!seasonId || seasonId === selectedSeasonRef.current)
      return;

    selectedSeasonRef.current = seasonId;
    updateSelectedSeasonId(seasonId);
    void loadSeasonLogs(seasonId);
  }, [loadSeasonLogs]);
  useEffect(() => {
    session.current = accessToken;
    setCacheOwner(accessToken);
    selectedSeasonRef.current = 'all';
    lastLoadedAt.current = 0;
    refreshInFlight.current = null;
    seasonsRef.current = [];
    logsScope.current = null;
    setLogs([]);
    setDetails({});
    detailsRef.current = {};
    pendingDetails.current.clear();
    setSeasons([]);
    updateSelectedSeasonId('all');
    updateDrafts({});
    setReady(false);
    setError('');
    setSeasonsError('');
    setLoading(false);
    void refresh();

    return () => {
      ++listSequence.current;
      session.current = null;
    };
  }, [
    refresh,
    accessToken
  ]);

  const storeDetail = useCallback((detail: api.FarmingLogDetail, token: string) => {
    if (session.current !== token)
      return;

    detailsRef.current = {
      ...detailsRef.current,
      [detail.log_id]: detail
    };
    setDetails(old => ({
      ...old,
      [detail.log_id]: detail
    }));
    setLogs(old => old.some(log => log.log_id === detail.log_id)
      ? old.map(log => log.log_id === detail.log_id ? detail : log) : [
        detail,
        ...old
      ]);
  }, []);
  const ensureReportDetails = useCallback(async (ids: string[]) => {
    if (!accessToken)
      return;

    const uniqueIds = [...new Set(ids)].filter(id => id && !detailsRef.current[id] && !pendingDetails.current.has(id));

    if (!uniqueIds.length)
      return;

    uniqueIds.forEach(id => pendingDetails.current.add(id));
    const token = accessToken;
    const seasonAtRequest = selectedSeasonRef.current;
    const results = await Promise.allSettled(uniqueIds.map(id => api.getLog(token, id)));
    uniqueIds.forEach(id => pendingDetails.current.delete(id));

    if (session.current !== token || selectedSeasonRef.current !== seasonAtRequest)
      return;

    const loaded: Record<string, api.FarmingLogDetail> = {};
    for (const result of results) {
      if (result.status === 'fulfilled')
        loaded[result.value.log_id] = result.value;
    }

    if (Object.keys(loaded).length) {
      detailsRef.current = {
        ...detailsRef.current,
        ...loaded
      };
      setDetails(old => ({
        ...old,
        ...loaded
      }));
    }

    if (results.some(result => result.status === 'rejected')) {
      setError('Một số hình ảnh hoặc ghi chú chưa tải được. Vui lòng thử tải lại.');
    }
  }, [accessToken]);
  const loadReport = useCallback(async (id: string) => {
    if (!accessToken)
      throw new Error('Vui lòng đăng nhập lại.');

    const cached = detailsRef.current[id];

    if (cached) {
      storeDetail(cached, accessToken);
      return cached;
    }

    const detail = await api.getLog(accessToken, id);
    storeDetail(detail, accessToken);

    return detail;
  }, [
    accessToken,
    storeDetail
  ]);

  const reports: WorkReport[] = (cacheOwner === accessToken ? logs : []).map(log => mapReport(log, details[log.log_id], seasons.find(s => s.season_id === log.season_id)));

  async function createReport(input: ReportDraft) {
    if (!accessToken || !user || ![
      'worker',
      'leader'
    ].includes(user.role))
      throw new Error('Chỉ công nhân và tổ trưởng được tạo nhật ký.');

    if (!input.seasonId || !input.gps || !input.taskTitle.trim() || !input.area.trim() || !input.note.trim())
      throw new Error('Vui lòng điền đủ tên công việc, khu vực, nội dung nhật ký và GPS.');

    const detail = await api.createLog(accessToken, {
      season_id: input.seasonId,
      activity_type: input.taskTitle.trim(),
      content: input.note.trim() || undefined,
      gps: {
        latitude: input.gps.latitude,
        longitude: input.gps.longitude
      },
    });

    if (session.current !== accessToken)
      throw new Error('Phiên đăng nhập đã thay đổi.');

    selectedSeasonRef.current = input.seasonId;
    updateSelectedSeasonId(input.seasonId);
    setLogs([]);
    setDetails({});
    detailsRef.current = {};
    pendingDetails.current.clear();
    storeDetail(detail, accessToken);
    lastLoadedAt.current = Date.now();

    return detail;
  }

  async function addReportComment(id: string, text: string) {
    if (!accessToken || !user || ![
      'leader',
      'owner'
    ].includes(user.role))
      throw new Error('Bạn không có quyền thêm ghi chú.');

    const note = await api.createNote(accessToken, id, text.trim());

    if (session.current === accessToken) {
      const existing = detailsRef.current[id];

      if (existing) {
        const updated = {
          ...existing,
          notes: [
            ...existing.notes,
            note
          ]
        };
        detailsRef.current = {
          ...detailsRef.current,
          [id]: updated
        };
        setDetails(old => ({
          ...old,
          [id]: updated
        }));
      } else {
        storeDetail(await api.getLog(accessToken, id), accessToken);
      }
    }

    return note;
  }

  async function setNoteResolved(id: string, noteId: string, resolved: boolean) {
    if (!accessToken)
      throw new Error('Vui lòng đăng nhập lại.');

    const note = await api.resolveNote(accessToken, noteId, resolved);

    if (session.current === accessToken) {
      const existing = detailsRef.current[id];

      if (existing) {
        const updated = {
          ...existing,
          notes: existing.notes.map(n => n.note_id === noteId ? note : n)
        };
        detailsRef.current = {
          ...detailsRef.current,
          [id]: updated
        };
        setDetails(old => ({
          ...old,
          [id]: updated
        }));
      }
    }
  }

  async function reviewReport(id: string, review: 'passed' | 'rejected') {
    if (user?.role !== 'leader')
      throw new Error('Chỉ tổ trưởng được đánh giá nhật ký.');

    return addReportComment(id, reviewContent(review));
  }

  return {
    notificationReports,
    notificationsReady,
    notificationsError,
    refreshNotifications,
    reports,
    drafts: cacheOwner === accessToken ? drafts : {},
    setDrafts,
    createReport,
    reviewReport,
    addReportComment,
    setNoteResolved,
    ready,
    loading,
    error,
    seasonsError,
    seasons: cacheOwner === accessToken ? seasons : [],
    selectedSeasonId,
    selectSeason,
    refresh,
    ensureReportDetails,
    loadReport,
    storeDetail,
    getReport: (id: string | undefined) => reports.find(r => r.id === id),
    hasDetail: (id: string) => !!details[id]
  };
}

const ReportContext = createContext<ReturnType<typeof useReportState> | null>(null);

export function ReportProvider({ children }: PropsWithChildren) {
  const value = useReportState();

  return <ReportContext.Provider value={value}>
    {children}
  </ReportContext.Provider>;
}

export function useReports() {
  const value = useContext(ReportContext);

  if (!value)
    throw new Error('ReportProvider missing');

  return value;
}
