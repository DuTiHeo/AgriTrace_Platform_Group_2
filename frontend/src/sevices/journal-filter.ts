export type JournalPeriod = 'all' | 'today' | 'week' | 'month';

export function taskExecutionError(task: { startDate?: string; due: string }, now = new Date()) {
  const today = localDay(now);
  const start = task.startDate || task.due;
  if (!today || !start || !task.due) return 'Chưa có thời gian thực hiện công việc.';
  if (today < start) return 'Chưa đến ngày bắt đầu thực hiện công việc';
  if (today > task.due) return 'Đã quá ngày kết thúc thực hiện công việc.';
  return '';
}

function localDay(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function inJournalPeriod(value: string, period: JournalPeriod, now = new Date()) {
  if (period === 'all') return true;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return false;
  if (period === 'today') return localDay(target) === localDay(now);
  if (period === 'month') return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return target >= start && target < end;
}

export const journalPeriods: { value: JournalPeriod; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
];
