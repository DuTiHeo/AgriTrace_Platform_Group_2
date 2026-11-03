import { apiJson, apiQuery, apiRequest } from './api_client';

export type ErrorReportStatus = 'new' | 'processing' | 'resolved' | 'rejected';
export type ErrorReportCategory = 'interface' | 'data' | 'performance' | 'bug' | 'other';

export type CreateErrorReport = {
  error_type?: string | null;
  description: string;
  /** URL returned by the dedicated screenshot upload endpoint. */
  screenshot_url?: string | null;
};

export type ErrorReport = {
  report_id: string;
  user_id: string;
  user_full_name?: string | null;
  user_phone?: string | null;
  org_id: string;
  org_name?: string | null;
  error_type: string | null;
  description: string;
  screenshot_url: string | null;
  status: ErrorReportStatus;
  admin_response?: string | null;
  submitted_at: string;
  updated_at?: string | null;
};

export type ErrorReportFilters = {
  status?: ErrorReportStatus;
  error_type?: string;
  limit?: number;
  offset?: number;
};

// Worker/Leader: backend limits the list to reports authored by the caller.
export const listErrorReports = (token: string, filters: ErrorReportFilters = {}) =>
  apiRequest<ErrorReport[]>(token, `/error-reports${apiQuery(filters)}`);
export const getErrorReport = (token: string, reportId: string) =>
  apiRequest<ErrorReport>(token, `/error-reports/${encodeURIComponent(reportId)}`);
export const createErrorReport = (token: string, payload: CreateErrorReport) =>
  apiRequest<ErrorReport>(token, '/error-reports', apiJson('POST', payload));
// The author may delete only reports still in the 'new' state; enforced by BE.
export const deleteErrorReport = (token: string, reportId: string) =>
  apiRequest<void>(token, `/error-reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' });

export const errorReportKinds: { label: string; value: ErrorReportCategory }[] = [
  { label: 'Lỗi chức năng', value: 'bug' },
  { label: 'Lỗi hiển thị', value: 'interface' },
  { label: 'Lỗi dữ liệu', value: 'data' },
  { label: 'Lỗi hiệu năng', value: 'performance' },
  { label: 'Khác', value: 'other' },
];

export function buildErrorReportPayload(draft: { kind: string; text: string; photo?: string }): CreateErrorReport {
  const description = draft.text.trim();
  if (description.length < 5) throw new Error('Mô tả sự cố cần ít nhất 5 ký tự.');
  const screenshot = draft.photo?.trim();
  if (screenshot && (screenshot.length > 500 || !(/^https?:\/\/[^\s]+$/i.test(screenshot) || /^\/uploads\/error-reports\/[A-Za-z0-9._-]+$/.test(screenshot))))
    throw new Error('Ảnh minh họa chưa được tải lên máy chủ hoặc đường dẫn không hợp lệ.');
  return {
    error_type: errorReportKinds.find(kind => kind.label === draft.kind)?.value ?? 'other',
    description,
    ...(screenshot ? { screenshot_url: screenshot } : {}),
  };
}

export type ErrorScreenshotUpload = { screenshot_url: string; filename: string; size_bytes: number };
export const uploadErrorScreenshot = (token: string, body: FormData, fetcher: typeof fetch = fetch) =>
  apiRequest<ErrorScreenshotUpload>(token, '/error-reports/upload-screenshot', { method: 'POST', body }, 60000, fetcher);
