import { webApi } from "./webApi_wb";
import type { ReminderScheduleCreate, ReminderScheduleUpdate } from "./backend_api_types_wb";
export const reminderService = {
  getAll: (seasonId: string) => webApi.reminderSchedules.listReminders({ query: { season_id: seasonId }, cacheTtl: 0 }),
  create: (body: ReminderScheduleCreate) => webApi.reminderSchedules.createReminder({ body }),
  update: (id: string, body: ReminderScheduleUpdate) => webApi.reminderSchedules.updateReminder({ path: { reminder_id: id }, body }),
  async markSeen(id: string) { return webApi.reminderSchedules.updateReminderStatus({ path: { reminder_id: id }, body: { status: "seen" } }); },
  delete: (id: string) => webApi.reminderSchedules.deleteReminder({ path: { reminder_id: id } }),
  async dispatch(seasonId: string) {
    const result = await webApi.reminderSchedules.dispatchDueRemindersEndpoint({ query: { season_id: seasonId } });
    window.dispatchEvent(new Event("notifications-updated"));
    return result;
  },
};
