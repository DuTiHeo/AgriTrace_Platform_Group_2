export type NotificationCategory =
  | "task"
  | "farming_log"
  | "season"
  | "harvest"
  | "system";

export type NotificationPriority = "info" | "warning" | "action";

export type OwnerNotification = {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  target: string;
  actionLabel: string;
};

export const notificationCategoryLabels: Record<
  NotificationCategory,
  string
> = {
  task: "Công việc",
  farming_log: "Nhật ký",
  season: "Mùa vụ",
  harvest: "Thu hoạch",
  system: "Hệ thống",
};

