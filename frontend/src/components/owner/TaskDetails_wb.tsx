import { isDialogBackdropClick } from "../../utils/dialogBackdrop_wb";
import { assignmentStatus } from '../../features/owner/task_wb';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { taskService } from '../../sevices/taskService_wb';
import type { Task, TaskStatus } from '../../features/owner/task_wb';

const statusLabels: Record<TaskStatus, string> = { pending: 'Chờ thực hiện', in_progress: 'Đang thực hiện', completed: 'Đã hoàn thành', cancelled: 'Đã thu hồi', incomplete: 'Chưa hoàn thành' };
function date(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chưa ghi nhận' : parsed.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export default function TaskDetails({ task, tasks, farmName, plotName, teamName, assigneeRole, onClose }: {
  task: Task; tasks?: Task[]; farmName: string; plotName: string; teamName: string; assigneeRole?: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [members, setMembers] = useState(tasks ?? [task]);
  const detail = { ...members[0], status: assignmentStatus(members) };
  const ids = (tasks ?? [task]).map(member => member.id).join('|');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    let active = true;
    void Promise.allSettled(ids.split('|').map(id => taskService.getById(id))).then(results => {
      if (!active) return;
      const loaded = new Map(results.flatMap(result => result.status === 'fulfilled' ? [[result.value.id, result.value] as const] : []));
      setMembers(old => old.map(member => loaded.get(member.id) ?? member));
      if (results.some(result => result.status === 'rejected')) setError('Một số trạng thái người nhận chưa tải lại được.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; trigger?.focus(); };
  }, [ids]);
  const fields = [
    ['Nông trại', farmName], ['Vùng trồng', plotName], ['Tổ phụ trách', teamName],
    ['Người nhận', members.length > 1 ? `${members.length} người` : `${detail.assigneeName || 'Chưa ghi nhận'}${assigneeRole ? ` · ${assigneeRole === 'leader' ? 'Tổ trưởng' : 'Công nhân'}` : ''}`],
  ];
  return <dialog onClick={event => { if (isDialogBackdropClick(event)) onClose(); }} ref={dialog} className="app-modal task-detail-modal" aria-labelledby="task-detail-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="app-modal-header"><h2 id="task-detail-title">Chi tiết công việc đã giao</h2><button type="button" aria-label="Đóng chi tiết công việc" onClick={onClose}><X size={20} /></button></header>
    <div className="task-detail-body">
      {loading && <p role="status">Đang cập nhật thông tin...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="task-detail-heading"><h3>{detail.content}</h3><span className={`task-status task-status-${detail.status}`}>{statusLabels[detail.status]}</span></div>
      <dl className="task-detail-grid">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {members.length > 1 && <section><h3>Người nhận công việc</h3><div className="task-recipient-list">{members.map(member => <div className="task-recipient-row" key={member.id}><span>{member.assigneeName || 'Người nhận'}</span><span className={`task-status task-status-${member.status}`}>{statusLabels[member.status]}</span></div>)}</div></section>}
      <dl className="task-detail-schedule">{[
        ['Thời điểm giao', date(detail.createdAt)], ['Bắt đầu', date(detail.startAt)], ['Hạn hoàn thành', date(detail.dueAt)],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
    <footer className="app-modal-footer"><button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button></footer>
  </dialog>;
}
