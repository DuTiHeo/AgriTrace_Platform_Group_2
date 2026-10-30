import { apiJson, apiQuery, apiRequest } from './api_client';

export type ErrorReportStatus = 'new' | 'processing' | 'resolved' | 'rejected';
export type ErrorReportCategory = 'interface' | 'data' | 'performance' | 'bug' | 'other';

export type CreateErrorReport = {
  error_type?: string | null;
  description: string;
  /** Backend accepts a URL, not a local photo URI or multipart upload. */
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
