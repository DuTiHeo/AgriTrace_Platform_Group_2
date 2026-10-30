import { API_BASE_URL } from '@/constants/api';

export class ApiError extends Error {
  constructor(message: string, public status: number = 0) {
    super(message);
  }
}

export async function apiRequest<T>(token: string, path: string, options: RequestInit = {}, timeoutMs = 15000, fetcher: typeof fetch = fetch): Promise<T> {
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
    if (response.status === 204 && response.ok) return undefined as T;
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        403: 'Bạn không có quyền thực hiện thao tác này.',
        404: 'Không tìm thấy dữ liệu yêu cầu.',
        413: 'Ảnh quá lớn. Mỗi ảnh tối đa 5 MB.',
        422: 'Thông tin gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
        429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
      };
      throw new ApiError(response.status >= 500 ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
        : (typeof body?.detail === 'string' && [400, 404, 422].includes(response.status)) ? body.detail
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

export const apiJson = (method: string, body: unknown): RequestInit => ({
  method,
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
});

export function apiQuery(filters: object = {}): string {
  const query = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  return query ? `?${query}` : '';
}

