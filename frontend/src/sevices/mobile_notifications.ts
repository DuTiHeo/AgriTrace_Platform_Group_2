import type { AppNotice } from '@/contexts/notification_context';
import { decodeTaskContent } from './farming_log.service';
import { getTaskTypeLabel } from '@/constants/task_types';
import { listNotifications, type ApiNotification, type NotificationType } from './notification_api';

export type NotificationFilter = 'all' | NotificationType;
export const notificationFilters: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'task_assigned', label: 'Giao công việc' },
  { value: 'log_note', label: 'Ghi chú nhật ký' },
  { value: 'reminder', label: 'Nhắc nhở' },
  { value: 'error_report', label: 'Báo lỗi' },
  { value: 'error_report_response', label: 'Phản hồi báo lỗi' },
];

export function getNotificationFilters(role: string | undefined) {
  return role === 'leader'
    ? notificationFilters.filter(item => item.value !== 'error_report' && item.value !== 'error_report_response')
    : notificationFilters;
}

export async function loadAllNotifications(token: string, filter: NotificationFilter) {
  const result = new Map<string, ApiNotification>();
  const pageSize = 200;
  for (let offset = 0; ; offset += pageSize) {
    const page = await listNotifications(token, { limit: pageSize, offset, ...(filter === 'all' ? {} : { type: filter }) });
    let added = 0;
    for (const item of page) { if (!result.has(item.notification_id)) added++; result.set(item.notification_id, item); }
    if (page.length < pageSize) break;
    if (!added) throw new Error('Máy chủ trả lặp trang thông báo. Vui lòng thử lại.');
  }
  return [...result.values()];
}

export function mapApiNotification(item: ApiNotification, role: 'worker' | 'leader'): AppNotice {
  const type = item.type;
  const titles: Record<string, string> = {
    task_assigned: 'Bạn được giao công việc', log_note: 'Nhận xét nhật ký canh tác',
    reminder: 'Nhắc nhở mùa vụ', error_report: 'Báo lỗi hệ thống', error_report_response: 'Phản hồi báo lỗi',
  };
  let text = item.content;
  const taskPrefix = text.indexOf('AGRITRACE_TASK_V1:');
  if (type === 'task_assigned' && taskPrefix >= 0) {
    const task = decodeTaskContent(text.slice(taskPrefix));
    text = task.title.startsWith('AGRITRACE_TASK_V1:') ? 'Bạn có công việc mới.'
      : [getTaskTypeLabel(task.title), task.instructions].filter(Boolean).join(' · ');
  }
  const date = new Date(item.created_at);
  return {
    id: item.notification_id, type, read: item.is_read,
    title: titles[type ?? ''] ?? 'Thông báo hệ thống', text,
    category: type === 'reminder' ? 'schedule' : type === 'task_assigned' || type === 'log_note' ? 'work' : 'alert',
    occurredAt: item.created_at,
    timeLabel: Number.isNaN(date.getTime()) ? 'Chưa có thời gian' : date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    // The notification DTO does not include task_id, log_id or report_id.
    // Open the related list instead of guessing an entity from its text.
    target: type === 'task_assigned' ? (role === 'worker' ? '/worker/schedule' : '/leader')
      : type === 'log_note' ? { pathname: role === 'worker' ? '/worker/diary' : '/leader/diary', params: { fromNotification: 'true' } }
      : type === 'reminder' ? (role === 'worker' ? '/worker/schedule' : '/leader/areas')
      : type === 'error_report' || type === 'error_report_response' ? '/account/issues' : null,
  };
}
