import type { OwnerNotification } from "../types/notification";
// No notification routes in the group's backend yet.
export const notificationService = {
  async getAll(): Promise<OwnerNotification[]> { return []; },
  async getUnreadCount(): Promise<number> { return 0; },
};
