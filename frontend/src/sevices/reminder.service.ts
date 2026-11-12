import { apiJson, apiQuery, apiRequest } from './api_client';

export type ReminderStatus = 'scheduled' | 'sent' | 'seen';
export type ReminderChannel = 'push' | 'sms' | 'email';
export type CreateReminder = {
  season_id: string;
  milestone_type: string;
  /** Calendar date in YYYY-MM-DD format. */
  remind_date: string;
  channel?: ReminderChannel;
  status?: ReminderStatus;
};
export type UpdateReminder = {
  milestone_type?: string | null;
  remind_date?: string | null;
  channel?: ReminderChannel | null;
  status?: ReminderStatus | null;
};
export type Reminder = {
  reminder_id: string;
  season_id: string;
  milestone_type: string;
  remind_date: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  plot_code?: string | null;
  crop_name?: string | null;
  created_at?: string | null;
};
export type ReminderFilters = {
  season_id?: string;
  status?: ReminderStatus;
  channel?: ReminderChannel;
  from_date?: string;
  to_date?: string;
};

// Worker/Leader: backend scopes access to the caller's farm.
export const listReminders = (token: string, filters: ReminderFilters = {}) =>
  apiRequest<Reminder[]>(token, `/reminders${apiQuery(filters)}`);
export const getReminder = (token: string, reminderId: string) =>
  apiRequest<Reminder>(token, `/reminders/${encodeURIComponent(reminderId)}`);
// Creating and editing reminder content requires Leader permissions in the app.
export const createReminder = (token: string, payload: CreateReminder) =>
  apiRequest<Reminder>(token, '/reminders', apiJson('POST', payload));
export const updateReminder = (token: string, reminderId: string, payload: UpdateReminder) =>
  apiRequest<Reminder>(token, `/reminders/${encodeURIComponent(reminderId)}`, apiJson('PATCH', payload));
export const updateReminderStatus = (token: string, reminderId: string, status: ReminderStatus) =>
  apiRequest<Reminder>(token, `/reminders/${encodeURIComponent(reminderId)}/status`, apiJson('PATCH', { status }));
