import { accountService } from "./accountService";
import { httpClient, resolveMediaUrl } from "./httpClient";
import type { FarmingLog, FarmingLogNote, FarmingLogPhoto } from "../types/farmingLog";

type LogPhotoDto = {
  photo_id: string;
  url: string;
  created_at: string;
};

type LogNoteDto = {
  note_id: string;
  leader_id: string;
  leader_name: string | null;
  content: string;
  resolved: boolean;
  created_at: string;
};

type FarmingLogDto = {
  log_id: string;
  plot_id?: string;
  season_id: string;
  user_id: string;
  user_name: string | null;
  team_id: string | null;
  org_id: string;
  activity_type: string;
  content: string | null;
  gps: { latitude: number; longitude: number };
  logged_at: string;
  photos?: LogPhotoDto[];
  notes?: LogNoteDto[];
};

function mapPhoto(photo: LogPhotoDto): FarmingLogPhoto {
  return {
    id: photo.photo_id,
    url: resolveMediaUrl(photo.url),
    caption: "",
  };
}

function mapNote(note: LogNoteDto, ownerId: string): FarmingLogNote {
  return {
    id: note.note_id,
    authorId: note.leader_id,
    authorName: note.leader_name ?? "",
    authorRole: note.leader_id === ownerId ? "owner" : "leader",
    content: note.content,
    resolved: note.resolved,
    createdAt: note.created_at,
    resolvedAt: null,
  };
}

async function mapLog(log: FarmingLogDto, ownerId: string): Promise<FarmingLog> {

  return {
    id: log.log_id,
    farmId: log.org_id,
    seasonId: log.season_id,
    plotId: log.plot_id ?? "",
    teamId: log.team_id,
    workerId: log.user_id,
    workerName: log.user_name ?? "",
    activityType: log.activity_type,
    content: log.content ?? "",
    gps: log.gps,
    loggedAt: log.logged_at,
    photos: (log.photos ?? []).map(mapPhoto),
    notes: (log.notes ?? []).map((note) => mapNote(note, ownerId)),
  };
}

async function getLogDetail(logId: string) {
  return httpClient.get<FarmingLogDto>(`/farming-logs/${logId}`);
}

export const farmingLogService = {
  async getAll(farmId?: string): Promise<FarmingLog[]> {
    const query = farmId && farmId !== "all"
      ? `?org_id=${encodeURIComponent(farmId)}`
      : "";
    const [summaries, owner] = await Promise.all([
      httpClient.get<FarmingLogDto[]>(`/farming-logs${query}`),
      accountService.getAccount(),
    ]);
    const seasons = await httpClient.get<Array<{ season_id: string; plot_id: string }>>("/seasons");
    const plots = new Map(seasons.map((season) => [season.season_id, season.plot_id]));
    const logs = await Promise.all(summaries.map(async (summary) => {
      const detail = await getLogDetail(summary.log_id);
      detail.plot_id = plots.get(detail.season_id);
      return mapLog(detail, owner.id);
    }));
    return logs.sort((first, second) => Date.parse(second.loggedAt) - Date.parse(first.loggedAt));
  },

  async getById(id: string): Promise<FarmingLog | null> {
    try {
      const [log, owner] = await Promise.all([getLogDetail(id), accountService.getAccount()]);
      const season = await httpClient.get<{ plot_id: string }>(`/seasons/${log.season_id}`);
      log.plot_id = season.plot_id;
      return mapLog(log, owner.id);
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404) return null;
      throw error;
    }
  },

  async create(input: {
    seasonId: string;
    activityType: string;
    content?: string;
    gps: { latitude: number; longitude: number };
  }): Promise<FarmingLog> {
    const [log, owner] = await Promise.all([
      httpClient.post<FarmingLogDto>("/farming-logs", {
        season_id: input.seasonId,
        activity_type: input.activityType,
        content: input.content?.trim() || null,
        gps: input.gps,
      }),
      accountService.getAccount(),
    ]);
    window.dispatchEvent(new Event("farming-logs-updated"));
    return mapLog(log, owner.id);
  },

  async uploadPhotos(logId: string, files: File[]): Promise<FarmingLogPhoto[]> {
    if (files.length === 0) throw new Error("Chọn ít nhất một ảnh để tải lên.");
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const photos = await httpClient.post<LogPhotoDto[]>(`/farming-logs/${logId}/photos`, formData);
    window.dispatchEvent(new Event("farming-logs-updated"));
    return photos.map(mapPhoto);
  },

  async addNote(logId: string, content: string): Promise<FarmingLogNote> {
    const normalizedContent = content.trim();
    if (!normalizedContent) throw new Error("Vui lòng nhập nội dung ghi chú.");
    const [note, owner] = await Promise.all([
      httpClient.post<LogNoteDto>("/log-notes", { log_id: logId, content: normalizedContent }),
      accountService.getAccount(),
    ]);
    window.dispatchEvent(new Event("farming-logs-updated"));
    return mapNote(note, owner.id);
  },

  async setNoteResolved(
    _logId: string,
    noteId: string,
    resolved: boolean,
  ): Promise<FarmingLogNote> {
    const [note, owner] = await Promise.all([
      httpClient.patch<LogNoteDto>(`/log-notes/${noteId}`, { resolved }),
      accountService.getAccount(),
    ]);
    window.dispatchEvent(new Event("farming-logs-updated"));
    return mapNote(note, owner.id);
  },
};
