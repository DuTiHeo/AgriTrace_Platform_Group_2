import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { type ReportDraft, useReports } from '@/contexts/report-context';
import { getLogLocation, prepareLogPhoto, uploadDraftPhotos } from '@/sevices/log-media';
import { updateTaskStatus } from '@/sevices/farming-log.service';

export function useFarmingLogForm(draft: ReportDraft, updateDraft: (update: (old: ReportDraft) => ReportDraft) => void) {
  const { accessToken } = useAuth();
  const { seasons, createReport, storeDetail } = useReports();
  const [gpsStatus, setGpsStatus] = useState('Đang lấy vị trí hiện tại…');
  const locating = useRef(false);
  const activeSeasons = seasons.filter(season => ['growing', 'ready_to_harvest'].includes(season.status));

  const locate = useCallback(async () => {
    if (locating.current) return;
    locating.current = true;
    setGpsStatus('Đang lấy vị trí hiện tại…');
    try {
      const gps = await getLogLocation();
      updateDraft(old => ({ ...old, gps }));
      setGpsStatus(`Đã lấy vị trí: ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`);
    } catch (error) {
      setGpsStatus(error instanceof Error ? error.message : 'Không lấy được vị trí hiện tại.');
    } finally {
      locating.current = false;
    }
  }, [updateDraft]);

  useEffect(() => { if (!draft.gps) void locate(); }, [draft.gps, locate]);
  useEffect(() => {
    if (draft.seasonId || !activeSeasons.length) return;
    const season = activeSeasons[0];
    updateDraft(old => ({ ...old, seasonId: season.season_id }));
  }, [activeSeasons, draft.seasonId, updateDraft]);

  async function preparePhoto(uri: string) {
    return prepareLogPhoto(uri);
  }

  async function submit() {
    if (!accessToken) throw new Error('Vui lòng đăng nhập lại.');
    if (!draft.seasonId) throw new Error('Chưa có mùa vụ đang canh tác để ghi nhật ký.');
    if (!draft.gps) throw new Error('Chưa lấy được vị trí GPS. Vui lòng chờ hoặc thử lại.');
    const detail = draft.savedLogId
      ? { log_id: draft.savedLogId }
      : await createReport(draft);
    if (!draft.savedLogId) updateDraft(old => ({ ...old, savedLogId: detail.log_id }));
    if (draft.photos.length) {
      const withPhotos = await uploadDraftPhotos(accessToken, detail.log_id, draft.photos);
      storeDetail(withPhotos, accessToken);
    }
    if (draft.taskId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draft.taskId)) {
      await updateTaskStatus(accessToken, draft.taskId, 'completed');
    }
    return detail;
  }

  return { gpsStatus, locate, preparePhoto, submit, activeSeasons };
}
