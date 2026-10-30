import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth_context';
import { type ReportDraft, useReports } from '@/contexts/report_context';
import { getLogLocation, prepareLogPhoto, uploadDraftPhotos } from '@/sevices/log_media';
import { updateTaskStatus, locatePlot } from '@/sevices/farming_log.service';
import { useWorkSchedule } from '@/contexts/work_schedule_context';
import { taskExecutionError } from '@/sevices/journal_filter';

export function useFarmingLogForm(draft: ReportDraft, updateDraft: (update: (old: ReportDraft) => ReportDraft) => void) {
  const { accessToken } = useAuth();
  const { seasons, createReport, storeDetail } = useReports();
  const { loadWorkerTasks, workerTasks, leaderTasks } = useWorkSchedule();
  const [gpsStatus, setGpsStatus] = useState('Đang lấy vị trí hiện tại…');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const locating = useRef(false);
  const activeSeasons = seasons.filter(season => [
    'growing',
    'ready_to_harvest'
  ].includes(season.status));

  const locate = useCallback(async () => {
    if (locating.current)
      return;

    locating.current = true;
    setIsLocating(true);
    setLocationError(null);
    setGpsStatus('Đang lấy vị trí GPS từ vệ tinh…');

    try {
      const gps = await getLogLocation();
      updateDraft(old => ({
        ...old,
        gps
      }));
      const accuracy = typeof gps.accuracy === 'number' ? ` · sai số ±${Math.round(gps.accuracy)}m` : '';
      setGpsStatus(`Đang đối soát không gian GPS (${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)})${accuracy}…`);

      if (accessToken) {
        try {
          const located = await locatePlot(accessToken, gps.latitude, gps.longitude);
          updateDraft(old => ({
            ...old,
            area: located.code,
            plotId: located.plot_id,
            seasonId: located.current_season_id || undefined,
          }));
          const cropInfo = located.current_crop_name ? ` · Cây trồng: ${located.current_crop_name}` : '';
          setGpsStatus(`Đã định vị: Lô ${located.code}${cropInfo}${accuracy}`);
          setLocationError(null);
        } catch (plotErr) {
          // EX-15: GPS nằm ngoài mọi lô đất của nông trại
          updateDraft(old => ({
            ...old,
            area: '',
            plotId: undefined,
            seasonId: undefined,
          }));
          const msg = plotErr instanceof Error ? plotErr.message : 'Vị trí GPS của bạn không nằm trong bất kỳ lô đất nào thuộc nông trại.';
          setLocationError(msg);
          setGpsStatus(`Ngoài vùng canh tác: ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không lấy được vị trí GPS hiện tại.';
      setLocationError(msg);
      setGpsStatus('Không thể xác định tọa độ GPS');
    } finally {
      locating.current = false;
      setIsLocating(false);
    }
  }, [accessToken, updateDraft]);

  // Tự động định vị khi mở màn hình nếu chưa có GPS
  useEffect(() => {
    if (draft.gps)
      return;

    const timeout = setTimeout(() => {
      void locate();
    }, 0);

    return () => clearTimeout(timeout);
  }, [draft.gps, locate]);

  useEffect(() => {
    if (draft.seasonId || !draft.plotId || !activeSeasons.length)
      return;

    const season = activeSeasons.find(item => item.plot_id === draft.plotId);
    if (season) {
      updateDraft(old => ({
        ...old,
        seasonId: season.season_id
      }));
    }
  }, [
    activeSeasons,
    draft.plotId,
    draft.seasonId,
    updateDraft
  ]);

  async function preparePhoto(uri: string) {
    return prepareLogPhoto(uri);
  }

  async function submit() {
    if (!accessToken)
      throw new Error('Vui lòng đăng nhập lại.');

    const checkExecutionDate = () => {
      if (!draft.taskId)
        return;

      const task = [
        ...workerTasks,
        ...leaderTasks
      ].find(item => item.id === draft.taskId || item.taskIds.includes(draft.taskId!));

      if (!task)
        throw new Error('Không tìm thấy công việc. Vui lòng tải lại lịch làm việc.');

      const blocked = taskExecutionError(task);

      if (blocked)
        throw new Error(blocked);
    };
    checkExecutionDate();

    if (!draft.gps)
      throw new Error('Chưa lấy được vị trí GPS. Vui lòng chờ hoặc thử lại.');

    if (!draft.plotId || !draft.area) {
      throw new Error('Không thể xác định vị trí làm việc. Vị trí GPS của bạn không nằm trong bất kỳ lô đất nào thuộc nông trại.');
    }

    if (!draft.seasonId) {
      throw new Error('Lô đất này hiện chưa có mùa vụ đang canh tác (growing/ready_to_harvest). Vui lòng liên hệ tổ trưởng hoặc chủ nông trại.');
    }

    const detail = draft.savedLogId
      ? {
        log_id: draft.savedLogId
      }
      : await createReport(draft);

    if (!draft.savedLogId)
      updateDraft(old => ({
        ...old,
        savedLogId: detail.log_id
      }));

    if (draft.photos.length) {
      const withPhotos = await uploadDraftPhotos(accessToken, detail.log_id, draft.photos);
      storeDetail(withPhotos, accessToken);
    }

    if (draft.taskId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draft.taskId)) {
      checkExecutionDate();
      await updateTaskStatus(accessToken, draft.taskId, 'completed');
      await loadWorkerTasks();
    }

    return detail;
  }

  return {
    gpsStatus,
    locationError,
    isLocating,
    locate,
    preparePhoto,
    submit,
    activeSeasons
  };
}
