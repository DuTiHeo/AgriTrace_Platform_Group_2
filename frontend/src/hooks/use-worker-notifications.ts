import { type Href } from 'expo-router';
import { useWorkSchedule } from '@/contexts/work-schedule-context';
import { useReports } from '@/contexts/report-context';
import { type AppNotice, localToday, useNotificationRead } from '@/contexts/notification-context';
export function useWorkerNotifications() {
  const { workerTasks, ready, error, retry } = useWorkSchedule();
  const { reports } = useReports();
  const { readIds, markRead } = useNotificationRead();
  const notices: AppNotice[] = [];
  for (const task of workerTasks) {
    const latest = reports.find(report => report.taskId === task.id);
    const completed = latest?.review === 'rejected' ? undefined : latest;
    const reportTarget = completed ? { pathname: '/(worker)/diary-detail', params: { id: completed.id } } as Href
      : { pathname: '/(worker)/report-note', params: { taskId: task.id, taskTitle: task.title, area: task.area } } as Href;
    if (latest?.review === 'rejected') notices.unshift({ id: `review:${latest.id}:rejected`, category: 'work', title: 'Tổ trưởng · Yêu cầu làm lại', text: task.title, timeLabel: 'Không đạt', target: reportTarget });
    notices.push({ id: `work:${task.id}`, category: 'work', title: 'Tổ trưởng · Giao việc', text: task.title, timeLabel: `Hạn ${task.due}`, target: reportTarget });
    notices.push({ id: `schedule:${task.id}:${task.due}`, category: 'schedule', title: 'Lịch làm việc', text: `${task.title} · ${task.area}`, timeLabel: task.due, target: { pathname: '/(worker)/schedule', params: { date: task.due, taskId: task.id } } as Href });
    if (task.due < localToday() && task.status !== 'done' && !completed) notices.unshift({ id: `overdue:${task.id}:${task.due}`, category: 'alert', title: 'Công việc quá hạn', text: `${task.title} chưa có báo cáo hoàn thành.`, timeLabel: `Hạn ${task.due}`, target: reportTarget });
  }
  for (const report of reports) for (const comment of report.comments ?? []) notices.unshift({ id: `comment:${report.id}:${comment.id}`, category: 'work', title: comment.author, text: `${report.taskTitle}: ${comment.text}`, timeLabel: comment.time, target: { pathname: '/(worker)/diary-detail', params: { id: report.id } } as Href });
  return { notices, unread: notices.filter(n => !readIds.includes(n.id)).length, readIds, markRead, ready, error, retry };
}
