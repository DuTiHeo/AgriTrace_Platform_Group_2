import type { AppNotice } from '@/contexts/notification-context';
import { noticeTime, scheduleDateLabel } from '@/contexts/notification-context';
import type { ScheduledTask } from '@/contexts/work-schedule-context';
import type { WorkReport } from '@/contexts/report-context';
import { getTaskTypeLabel } from '@/constants/task-types';
import { reviewContent } from './log-review';
import type { FarmingLog } from './farming-log.service';

export function notificationLogs(logs: FarmingLog[], role: string | undefined, teamId: string | null | undefined, userId: string): FarmingLog[] {
  return logs.filter(log => role === 'worker' ? log.user_id === userId
    : role === 'leader' && !!teamId && log.team_id === teamId && log.user_id !== userId);
}

function deadline(task: ScheduledTask) {
  return task.dueAt || (task.due ? `${task.due}T${task.endTime || '23:59:59'}${task.endTime ? ':00' : ''}+07:00` : '');
}

export function buildWorkerNotices(tasks: ScheduledTask[], reports: WorkReport[], now = new Date()): AppNotice[] {
  const notices: AppNotice[] = [];
  for (const task of tasks) {
    const target = { pathname: '/(worker)/task-detail' as const, params: { id: task.id } };
    notices.push({ id: `work:${task.id}`, category: 'work', title: 'Bạn được giao công việc',
      text: getTaskTypeLabel(task.title), occurredAt: task.createdAt, timeLabel: noticeTime(task.createdAt), target });
    notices.push({ id: `schedule:${task.id}:${task.startDate}:${task.startTime}:${task.due}:${task.endTime}`,
      category: 'schedule', title: 'Lịch làm việc', text: `${getTaskTypeLabel(task.title)} · ${task.area}`,
      occurredAt: task.createdAt, timeLabel: scheduleDateLabel(task.startDate, task.due),
      target: task.status === 'done' ? target : { pathname: '/(worker)/schedule', params: { date: task.startDate || task.due, taskId: task.id } } });
    const due = deadline(task);
    if (task.status !== 'done' && Date.parse(due) < now.getTime()) notices.push({
      id: `overdue:${task.id}:${due}`, category: 'alert', title: 'Công việc quá hạn',
      text: `${getTaskTypeLabel(task.title)} chưa hoàn thành.`, occurredAt: due,
      timeLabel: `Hạn ${noticeTime(due)}`, target,
    });
  }
  for (const report of reports) for (const comment of report.comments ?? []) {
    const passed = comment.text === reviewContent('passed');
    const rejected = comment.text === reviewContent('rejected');
    notices.push({ id: `comment:${report.id}:${comment.id}`, category: 'work',
      title: rejected ? 'Tổ trưởng · Yêu cầu làm lại' : passed ? 'Tổ trưởng · Báo cáo đạt' : 'Tổ trưởng đã nhận xét nhật ký',
      text: getTaskTypeLabel(report.taskTitle), occurredAt: comment.time, timeLabel: noticeTime(comment.time),
      target: { pathname: '/(worker)/diary', params: { reportId: report.id } },
    });
  }
  return notices;
}

export function buildLeaderNotices(tasks: ScheduledTask[], reports: WorkReport[], now = new Date()): AppNotice[] {
  const notices: AppNotice[] = tasks.map(task => ({ id: `task:${task.id}`,
    category: task.owner ? 'work' : 'schedule', title: task.owner ? 'Chủ nông trại · Giao việc' : 'Lịch phân công',
    text: `${getTaskTypeLabel(task.title)} · ${task.area}`, occurredAt: task.createdAt,
    timeLabel: task.owner ? noticeTime(task.createdAt) : scheduleDateLabel(task.startDate, task.due),
    target: { pathname: task.owner ? '/(leader)' : '/(leader)/assignments', params: { taskId: task.id } },
  }));
  for (const report of reports) notices.push({ id: `diary:${report.id}`, category: 'work',
    title: `${report.workerName} · Nhật ký`, text: getTaskTypeLabel(report.taskTitle),
    occurredAt: report.completedAt, timeLabel: noticeTime(report.completedAt),
    target: { pathname: '/(leader)/diary', params: { reportId: report.id } },
  });
  for (const task of tasks) {
    const due = deadline(task);
    if (task.status !== 'done' && Date.parse(due) < now.getTime()) notices.push({
      id: `overdue:${task.id}:${due}`, category: 'alert', title: 'Công việc quá hạn',
      text: getTaskTypeLabel(task.title), occurredAt: due, timeLabel: `Hạn ${noticeTime(due)}`,
      target: { pathname: task.owner ? '/(leader)' : '/(leader)/assignments', params: { taskId: task.id } },
    });
  }
  return notices;
}
