import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { BellRing, Edit3, Plus, Trash2, X } from "lucide-react";
import { reminderService } from "../../sevices/reminderService_wb";
import { ListActionConfirmation } from "./ListRowActions_wb";
import type { ReminderChannel } from "../../sevices/backend_api_types_wb";
import "../../styles/season_reminders_wb.css";
type Reminder = Awaited<ReturnType<typeof reminderService.getAll>>[number];
const labels: Record<string, string> = { scheduled: "Đã lên lịch", sent: "Đã gửi", seen: "Đã xem" };
export default function SeasonReminders({ seasonId }: { seasonId: string }) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Reminder | "new" | null>(null);
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [notice, setNotice] = useState("");
  const [milestone, setMilestone] = useState("");
  const [date, setDate] = useState("");
  const [channel, setChannel] = useState<ReminderChannel>("push");
  const [formError, setFormError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const counter = useRef(0);
  const load = useCallback(async () => {
    const current = ++counter.current;
    setLoading(true); setError("");
    try { const data = await reminderService.getAll(seasonId); if (current === counter.current) setItems(data); }
    catch (cause) { if (current === counter.current) setError(cause instanceof Error ? cause.message : "Không thể tải lịch nhắc."); }
    finally { if (current === counter.current) setLoading(false); }
  }, [seasonId]);
  useEffect(() => { const requestCounter = counter; const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); requestCounter.current++; }; }, [load]);
  useEffect(() => { if (editing) dialog.current?.showModal(); }, [editing]);
  const openEditor = (item: Reminder | "new") => { setMilestone(item === "new" ? "" : item.milestone_type); setDate(item === "new" ? "" : item.remind_date); setChannel(item === "new" ? "push" : item.channel ?? "push"); setFormError(""); setEditing(item); };
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!editing || busy) return;
    if (!milestone.trim()) { setFormError("Nhập nội dung mốc nhắc nhở."); return; }
    setBusy(true); setFormError("");
    try { const body = { milestone_type: milestone.trim(), remind_date: date, channel }; if (editing === "new") await reminderService.create({ ...body, season_id: seasonId }); else await reminderService.update(editing.reminder_id, body); setEditing(null); await load(); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : "Không thể lưu lịch nhắc."); }
    finally { setBusy(false); }
  };
  return <section className="season-detail-card card season-reminders"><div className="season-detail-section-heading"><div><h2><BellRing size={19} /> Lịch nhắc nhở</h2></div><div className="season-reminder-actions"><button type="button" className="btn btn-secondary" disabled={busy || loading || !items.some(item => item.status === "scheduled")} onClick={() => setDispatching(true)}>Gửi nhắc đến hạn</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => openEditor("new")}><Plus size={16} />Thêm lịch nhắc</button></div></div>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" className="form-error">{error} <button type="button" onClick={() => void load()}>Thử lại</button></p>}
    {loading ? <p role="status">Đang tải lịch nhắc...</p> : <div className="season-reminder-list">{items.length ? items.map(item => <article key={item.reminder_id}><div><strong>{item.milestone_type}</strong><span>{new Intl.DateTimeFormat("vi-VN").format(new Date(`${item.remind_date}T00:00:00`))} · {item.channel} · {labels[item.status ?? "scheduled"] ?? item.status}</span></div><div className="season-reminder-actions">{item.status === "sent" && <button type="button" className="btn btn-secondary" disabled={busy} onClick={async () => { setBusy(true); try { await reminderService.markSeen(item.reminder_id); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật lịch nhắc."); } finally { setBusy(false); } }}>Đã xem</button>}<button type="button" className="table-action-button" aria-label={`Sửa lịch ${item.milestone_type}`} disabled={busy} onClick={() => openEditor(item)}><Edit3 size={16} /></button><button type="button" className="table-action-button" aria-label={`Xóa lịch ${item.milestone_type}`} disabled={busy} onClick={() => setDeleting(item)}><Trash2 size={16} /></button></div></article>) : <p>Chưa có lịch nhắc nhở cho mùa vụ này.</p>}</div>}
    {editing && <dialog ref={dialog} className="season-reminder-dialog" aria-labelledby="reminder-title" onCancel={event => { event.preventDefault(); if (!busy) setEditing(null); }}><form onSubmit={save}><header><h2 id="reminder-title">{editing === "new" ? "Thêm lịch nhắc" : "Chỉnh sửa lịch nhắc"}</h2><button type="button" aria-label="Đóng" disabled={busy} onClick={() => setEditing(null)}><X size={20} /></button></header><fieldset disabled={busy}><label>Mốc nhắc nhở<input autoFocus required maxLength={50} value={milestone} onChange={event => setMilestone(event.target.value)} /></label><label>Ngày nhắc<input required type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>Kênh gửi<select value={channel} onChange={event => setChannel(event.target.value as ReminderChannel)}><option value="push">Thông báo hệ thống</option><option value="sms">SMS</option><option value="email">Email</option></select></label>{formError && <p role="alert" className="form-error">{formError}</p>}</fieldset><footer><button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setEditing(null)}>Hủy</button><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Đang lưu..." : "Lưu lịch nhắc"}</button></footer></form></dialog>}
    {deleting && <ListActionConfirmation action="delete" name={deleting.milestone_type} statusLabel="Xóa lịch nhắc" onClose={() => setDeleting(null)} onConfirm={async () => { await reminderService.delete(deleting.reminder_id); await load(); }} />}
    {dispatching && <ListActionConfirmation action="status" name="Lịch nhắc của mùa vụ này" statusLabel="Gửi nhắc đến hạn" description="Hệ thống sẽ phát hành những lịch nhắc đã đến ngày gửi trong mùa vụ này." onClose={() => setDispatching(false)} onConfirm={async () => { const result = await reminderService.dispatch(seasonId); setNotice(result.message); await load(); }} />}
  </section>;
}

