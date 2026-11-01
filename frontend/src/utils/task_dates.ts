/** API timestamps and business days use Vietnam time on both roles. */
export function localDateKey(value: string | Date | null | undefined) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === Number(value.slice(0, 4))
    && date.getMonth() + 1 === Number(value.slice(5, 7))
    && date.getDate() === Number(value.slice(8, 10));
}

export function taskOccursOn(task: { startDate?: string; due: string }, day: string) {
  const start = task.startDate || task.due;
  return !!start && !!task.due && start <= day && day <= task.due;
}
