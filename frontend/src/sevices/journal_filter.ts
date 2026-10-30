export type JournalPeriod = 'all' | 'today' | 'week' | 'month';

export function taskExecutionError(task: {
  startDate?: string;
  due: string
}, now = new Date()) {
  const today = localDay(now);
  const start = task.startDate || task.due;

  if (!today || !start || !task.due)
    return 'Chưa có thời gian thực hiện công việc.';

  if (today < start)
    return 'Chưa đến ngày bắt đầu thực hiện công việc';

  if (today > task.due)
    return 'Đã quá ngày kết thúc thực hiện công việc.';

  return '';
}

function localDay(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime()))
    return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function inJournalPeriod(value: string, period: JournalPeriod, now = new Date()) {
  if (period === 'all')
    return true;

  const target = new Date(value);

  if (Number.isNaN(target.getTime()))
    return false;

  const targetDay = localDay(target);
  const today = localDay(now);
  if (!today) return false;
  if (period === 'today')
    return targetDay === today;

  if (period === 'month')
    return targetDay.slice(0, 7) === today.slice(0, 7);

  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return targetDay >= start.toISOString().slice(0, 10) && targetDay < end.toISOString().slice(0, 10);
}

export const journalPeriods: {
  value: JournalPeriod;
  label: string
}[] = [
    {
      value: 'all',
      label: 'Tất cả'
    },
    {
      value: 'today',
      label: 'Hôm nay'
    },
    {
      value: 'week',
      label: 'Tuần này'
    },
    {
      value: 'month',
      label: 'Tháng này'
    },
  ];
