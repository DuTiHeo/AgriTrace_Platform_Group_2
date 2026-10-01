import { API_BASE_URL } from '@/constants/api';
import { fetch as expoFetch } from 'expo/fetch';

export type GPSPoint = {
  latitude: number;
  longitude: number;
  accuracy?: number | null
};
export type LogNote = {
  note_id: string;
  log_id: string;
  leader_id: string;
  leader_name: string | null;
  content: string;
  resolved: boolean;
  created_at: string
};
export type LogPhoto = {
  photo_id: string;
  log_id: string;
  url: string;
  created_at: string
};
export type FarmingLog = {
  log_id: string;
  season_id: string;
  user_id: string;
  user_name: string | null;
  team_id: string | null;
  org_id: string;
  activity_type: string;
  content: string | null;
  gps: GPSPoint;
  logged_at: string;
};
export type FarmingLogDetail = FarmingLog & {
  photos: LogPhoto[];
  notes: LogNote[]
};
export type Season = {
  season_id: string;
  plot_id: string;
  plot_code: string;
  crop_name: string;
  planting_date: string;
  status: string;
  org_id: string;
  assigned_team_names?: string[]
};
export type TeamMember = {
  user_id: string;
  full_name: string;
  phone: string;
  role: string;
  status: 'active' | 'locked'
};
export type UserDetail = TeamMember & {
  national_id: string | null;
  date_of_birth: string | null;
  address: string | null;
  org_id: string | null;
  team_id: string | null;
  created_at: string;
};
export type MemberTask = {
  task_id: string;
  worker_id: string;
  status: 'in_progress' | 'completed' | 'cancelled'
};
export type ApiTask = MemberTask & {
  team_id: string;
  team_name: string | null;
  team_leader_name?: string | null;
  worker_name: string | null;
  worker_phone: string | null;
  plot_id: string;
  plot_code: string | null;
  org_id: string | null;
  org_name: string | null;
  content: string;
  start_at: string | null;
  due_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type Plot = {
  plot_id: string;
  org_id: string;
  code: string;
  area: number | null;
  status: 'active' | 'inactive';
  current_season_id: string | null;
  current_crop_name: string | null
};
export type Crop = {
  crop_id: string;
  name: string;
  growth_days: number
};
export type CropDetail = Crop & {
  milestones: {
    milestone_id: string;
    task_type: string;
    description: string | null
  }[]
};
export type CreateLog = {
  season_id: string;
  activity_type: string;
  content?: string;
  gps: GPSPoint
};
export type TaskContent = {
  title: string;
  instructions?: string;
  startTime?: string;
  endTime?: string;
  tools?: string;
  started?: boolean;
  assignmentId?: string
};

const TASK_CONTENT_PREFIX = 'AGRITRACE_TASK_V1:';

export function encodeTaskContent(value: TaskContent) {
  return `${TASK_CONTENT_PREFIX}${JSON.stringify(value)}`;
}

export function decodeTaskContent(content: string): TaskContent {
  if (!content.startsWith(TASK_CONTENT_PREFIX))
    return {
      title: content,
      started: true
    };

  try {
    const value = JSON.parse(content.slice(TASK_CONTENT_PREFIX.length)) as Partial<TaskContent>;

    return typeof value.title === 'string' ? {
      ...value,
      title: value.title
    } : {
      title: content,
      started: true
    };
  } catch {
    return {
      title: content,
      started: true
    };
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number = 0) {
    super(message);
  }
}

async function request<T>(token: string, path: string, options: RequestInit = {}, timeoutMs = 15000, fetcher: typeof fetch = fetch): Promise<T> {
  if (!token)
    throw new ApiError('Vui lòng đăng nhập lại.', 401);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetcher(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        403: 'Bạn không có quyền thực hiện thao tác này.',
        404: 'Không tìm thấy nhật ký hoặc mùa vụ.',
        413: 'Ảnh quá lớn. Mỗi ảnh tối đa 5 MB.',
        422: 'Thông tin chưa hợp lệ. Kiểm tra mùa vụ, loại hoạt động và GPS.',
        429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
      };
      throw new ApiError(response.status >= 500 ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
        : (response.status === 400 && typeof body?.detail === 'string') ? body.detail
          : messages[response.status] ?? 'Không thực hiện được yêu cầu.', response.status);
    }

    if (body === null)
      throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ.');

    return body as T;
  } catch (error) {
    if (error instanceof ApiError)
      throw error;

    throw new ApiError(controller.signal.aborted ? 'Máy chủ phản hồi quá lâu. Vui lòng kiểm tra kết nối.' : 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.');
  } finally {
    clearTimeout(timer);
  }
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});
export const listLogs = (token: string, seasonId?: string) => request<FarmingLog[]>(token, `/farming-logs${seasonId ? `?season_id=${encodeURIComponent(seasonId)}` : ''}`);
export const getLog = (token: string, id: string) => request<FarmingLogDetail>(token, `/farming-logs/${encodeURIComponent(id)}`);
export const listSeasons = (token: string, teamId?: string | null) => request<Season[]>(token, `/seasons${teamId ? `?team_id=${encodeURIComponent(teamId)}` : ''}`);
export const listTeamMembers = (token: string) => request<TeamMember[]>(token, '/users?role=worker');
export const getUserDetail = (token: string, id: string) => request<UserDetail>(token, `/users/${encodeURIComponent(id)}`);
export const listMemberTasks = (token: string, userId: string) => request<MemberTask[]>(token, `/tasks?worker_id=${encodeURIComponent(userId)}&include_cancelled=true`);
export const listMyTasks = (token: string) => request<ApiTask[]>(token, '/tasks');
export const updateTaskStatus = (token: string, taskId: string, status: 'in_progress' | 'completed') => request<ApiTask>(token, `/tasks/${encodeURIComponent(taskId)}/status`, json('PATCH', {
  status
}));
export async function listPlots(token: string): Promise<Plot[]> {
  const plots = await request<Plot[]>(token, '/plots?status=active');
  return [...new Map(plots.map(plot => [plot.plot_id, plot])).values()];
}

export async function listAssignedPlots(token: string, user: { role: string; team_id?: string | null } | null): Promise<Plot[]> {
  if (!user || !user.team_id) return [];
  const plots = await listPlots(token);
  const assignedIds = user.role === 'worker'
    ? new Set((await listMyTasks(token)).filter(task => task.status === 'in_progress').map(task => task.plot_id))
    : new Set((await listSeasons(token, user.team_id)).filter(season => ['growing', 'ready_to_harvest'].includes(season.status)).map(season => season.plot_id));
  return plots.filter(plot => assignedIds.has(plot.plot_id));
}
export const listCrops = (token: string) => request<Crop[]>(token, '/crops');
export const getCrop = (token: string, cropId: string) => request<CropDetail>(token, `/crops/${encodeURIComponent(cropId)}`);

export async function listTaskTypes(token: string) {
  const crops = await listCrops(token);
  const details = await Promise.all(crops.map(crop => getCrop(token, crop.crop_id)));

  return [...new Set(details.flatMap(crop => crop.milestones.map(item => item.task_type.trim())).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
}

export type TaskPayload = {
  team_id?: string;
  worker_id?: string;
  plot_id?: string;
  content?: string;
  start_at?: string;
  due_at?: string;
  status?: 'in_progress' | 'completed' | 'cancelled'
};
export const createTask = (token: string, payload: Required<Pick<TaskPayload, 'team_id' | 'worker_id' | 'plot_id' | 'content' | 'start_at' | 'due_at'>> & TaskPayload) => request<ApiTask>(token, '/tasks', json('POST', payload));
export const updateTask = (token: string, taskId: string, payload: TaskPayload) => request<ApiTask>(token, `/tasks/${encodeURIComponent(taskId)}`, json('PATCH', payload));
export const cancelTask = (token: string, taskId: string) => request<ApiTask>(token, `/tasks/${encodeURIComponent(taskId)}`, {
  method: 'DELETE'
});

export async function getMemberActivity(token: string, userId: string) {
  const [logs, tasks] = await Promise.all([
    listLogs(token),
    listMemberTasks(token, userId)
  ]);

  return {
    totalLogs: logs.filter(log => log.user_id === userId).length,
    completedTasks: tasks.filter(task => task.worker_id === userId && task.status === 'completed').length,
  };
}

export const getLogAuthor = (token: string, id: string) => getUserDetail(token, id);
export const createLog = (token: string, payload: CreateLog) => request<FarmingLogDetail>(token, '/farming-logs', json('POST', payload));
export const createNote = (token: string, logId: string, content: string) => request<LogNote>(token, '/log-notes', json('POST', {
  log_id: logId,
  content
}));
export const resolveNote = (token: string, noteId: string, resolved: boolean) => request<LogNote>(token, `/log-notes/${encodeURIComponent(noteId)}`, json('PATCH', {
  resolved
}));
// Expo File trong FormData cần expo/fetch trên thiết bị native.
export const uploadPhotos = (token: string, logId: string, body: FormData) => request<LogPhoto[]>(token, `/farming-logs/${encodeURIComponent(logId)}/photos`, {
  method: 'POST',
  body
}, 60000, expoFetch as typeof fetch);
export const photoUrl = (path: string) => /^https?:\/\//i.test(path) ? path : `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
export const seasonLabel = (season: Season) => `${season.plot_code} · ${season.crop_name} · ${season.planting_date}`;
