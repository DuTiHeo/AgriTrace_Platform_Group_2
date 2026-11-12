import { apiQuery, apiRequest } from './api_client';


export type NotificationType = 'task_assigned' | 'log_note' | 'reminder' | 'error_report' | 'error_report_response';
export type ApiNotification = {
  notification_id: string;
  user_id: string;
  content: string;
  // BE permits arbitrary notification types, including future additions.
  type: string | null;
  is_read: boolean;
  created_at: string;
};
export type NotificationFilters = {
  is_read?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
};
export type UnreadNotificationCount = { unread_count: number };
export type MarkAllNotificationsReadResult = { updated_count: number; message: string };

export const listNotifications = (token: string, filters: NotificationFilters = {}) =>
  apiRequest<ApiNotification[]>(token, `/notifications${apiQuery(filters)}`);
export const getNotification = (token: string, notificationId: string) =>
  apiRequest<ApiNotification>(token, `/notifications/${encodeURIComponent(notificationId)}`);
export const getUnreadNotificationCount = (token: string) =>
  apiRequest<UnreadNotificationCount>(token, '/notifications/unread-count');
export const markNotificationRead = (token: string, notificationId: string) =>
  apiRequest<ApiNotification>(token, `/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = (token: string) =>
  apiRequest<MarkAllNotificationsReadResult>(token, '/notifications/read-all', { method: 'PATCH' });
export const deleteNotification = (token: string, notificationId: string) =>
  apiRequest<void>(token, `/notifications/${encodeURIComponent(notificationId)}`, { method: 'DELETE' });
