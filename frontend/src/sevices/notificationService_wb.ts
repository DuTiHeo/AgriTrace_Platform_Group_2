import type { OwnerNotification } from "../features/owner/notification_wb";
import { httpClient } from "./httpClient_wb";
type NotificationDto = { notification_id: string; content: string; type: string | null; is_read: boolean; created_at: string };
function mapNotification(dto: NotificationDto): OwnerNotification {
  const category = dto.type === "task_assigned" ? "task" : dto.type === "log_note" ? "farming_log" : dto.type === "reminder" ? "season" : "system";
  const target = dto.type?.startsWith("error_report") ? "/support" : category === "task" ? "/tasks" : category === "farming_log" ? "/farming-logs" : category === "season" ? "/seasons" : "/notifications";
  return { id: dto.notification_id, category, priority: "info", title: dto.type === "task_assigned" ? "Công việc mới" : dto.type === "log_note" ? "Ghi chú nhật ký canh tác" : dto.type === "reminder" ? "Nhắc nhở mùa vụ" : dto.type === "error_report_response" ? "Phản hồi báo lỗi" : "Thông báo hệ thống", message: dto.content, createdAt: dto.created_at, readAt: dto.is_read ? dto.created_at : null, target, actionLabel: "Xem thông tin liên quan" };
}
function notify() { window.dispatchEvent(new Event("notifications-updated")); }
export const notificationService = {
  async getAll(): Promise<OwnerNotification[]> {
    const result: OwnerNotification[] = [];
    for (let offset = 0; ; offset += 200) {
      const page = await httpClient.get<NotificationDto[]>(`/notifications?limit=200&offset=${offset}`, { cacheTtl: 0 });
      result.push(...page.map(mapNotification));
      if (page.length < 200) break;
    }
    return result;
  },
  async getUnreadCount(): Promise<number> { return (await httpClient.get<{ unread_count: number }>("/notifications/unread-count", { cacheTtl: 0 })).unread_count; },
  async markRead(id: string) { const result = await httpClient.patch<NotificationDto>(`/notifications/${encodeURIComponent(id)}/read`); notify(); return mapNotification(result); },
  async markAllRead() { await httpClient.patch("/notifications/read-all"); notify(); },
  async delete(id: string) { await httpClient.delete(`/notifications/${encodeURIComponent(id)}`); notify(); },
};
