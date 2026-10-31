import "../../styles/notifications_wb.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bell, Check, CheckCheck, ClipboardCheck, Clock3, Info, Leaf, NotebookPen, PackageCheck, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";
import { notificationCategoryLabels } from "../../features/owner/notification_wb";
import type { NotificationCategory } from "../../features/owner/notification_wb";
import { notificationService } from "../../sevices/notificationService_wb";

type Notice = { id: string; category: NotificationCategory; title: string; message: string; time: string; group: string; unread: boolean; important?: boolean; target: string };
const icons = { task: ClipboardCheck, farming_log: NotebookPen, season: Leaf, harvest: PackageCheck, system: Info };

export default function NotificationsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [category, setCategory] = useState<NotificationCategory | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    setError("");
    try {
      const items = await notificationService.getAll();
      if (current !== request.current) return;
      const dateFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });
      const today = dateFormat.format(new Date());
      const yesterday = dateFormat.format(new Date(Date.now() - 86400000));
      setNotices(items.map(item => {
        const day = dateFormat.format(new Date(item.createdAt));
        return { id: item.id, category: item.category, title: item.title, message: item.message, target: item.target, unread: !item.readAt, group: day === today ? "Hôm nay" : day === yesterday ? "Hôm qua" : new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(item.createdAt)), time: new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt)) };
      }));
    } catch (cause) { if (current === request.current) setError(cause instanceof Error ? cause.message : "Không thể tải thông báo."); }
    finally { if (current === request.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const requestCounter = request;
    const timer = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 60000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); requestCounter.current++; };
  }, [load]);
  const unread = notices.filter(n => n.unread).length;
  const selected = notices.find(n => n.id === selectedId);
  const filtered = notices.filter(n => (category === "all" || n.category === category) && (!unreadOnly || n.unread));
  const markRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      setNotices(items => items.map(n => n.id === id ? { ...n, unread: false } : n));
      setFeedback("Đã đánh dấu thông báo là đã đọc.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đánh dấu đã đọc."); }
  };
  const markAllRead = async () => {
    setBusy(true);
    try { await notificationService.markAllRead(); setNotices(items => items.map(item => ({ ...item, unread: false }))); setFeedback("Đã đánh dấu tất cả thông báo là đã đọc."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật thông báo."); }
    finally { setBusy(false); }
  };
  return <div className="page notifications-page">
    <div className="page-heading notifications-heading">
      <div><span className="notice-eyebrow">TRUNG TÂM THÔNG BÁO</span><h1>Thông báo</h1><p>Nắm bắt những cập nhật mới nhất từ nông trại của bạn.</p></div>
      <button className="btn btn-secondary" type="button" disabled={!unread || busy} onClick={() => void markAllRead()}><CheckCheck size={18} aria-hidden="true" />Đánh dấu tất cả đã đọc</button>
    </div>
    {loading && <div className="page-loading">Đang tải thông báo...</div>}{error && <div className="page-error" role="alert">{error} <button type="button" onClick={() => void load()}>Thử lại</button></div>}
    <section className="card notice-inbox" aria-label="Hộp thông báo">
      <div className="notice-controls">
      <div className="notice-categories" aria-label="Lọc loại thông báo">{(["all", ...Object.keys(notificationCategoryLabels)]).map(key => { const value = key as NotificationCategory | "all"; return <button type="button" key={key} aria-pressed={category === value} className={category === value ? "is-active" : ""} onClick={() => setCategory(value)}>{value === "all" ? "Tất cả" : notificationCategoryLabels[value]}<span>{value === "all" ? notices.length : notices.filter(n => n.category === value).length}</span></button>; })}</div>
        <button className={`notice-unread-filter ${unreadOnly ? "is-active" : ""}`} type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(!unreadOnly)}><SlidersHorizontal size={17} aria-hidden="true" />Chỉ chưa đọc <span>{unread}</span></button>
      </div>
      <div className={`notice-content ${selected ? "has-detail" : ""}`}>
        <div className="notice-feed">
          <p className="notice-result" role="status">{filtered.length} thông báo{unreadOnly ? " chưa đọc" : ""}</p>
          {filtered.length ? Array.from(new Set(filtered.map(n => n.group))).map(group => { const items = filtered.filter(n => n.group === group); return items.length ? <section key={group} aria-label={group}><h2 className="notice-group-title">{group}<span>{items.length}</span></h2>{items.map(n => { const Icon = icons[n.category]; return <article key={n.id} className={`notice-row ${n.unread ? "is-unread" : ""} ${selectedId === n.id ? "is-selected" : ""}`}><span className={`notice-row-icon ${n.important ? "notice-amber" : ""}`}><Icon size={20} aria-hidden="true" /></span><div className="notice-row-body"><button type="button" className="notice-title-button" aria-expanded={selectedId === n.id} aria-controls={selected ? "notice-detail" : undefined} onClick={() => { setSelectedId(n.id); if (n.unread) markRead(n.id); }}>{n.title}</button><p>{n.message}</p><div className="notice-row-footer"><span className="notice-row-category">{notificationCategoryLabels[n.category]}</span><span>{n.time}</span>{n.important && <span className="notice-priority">Cần chú ý</span>}</div></div><span className="notice-read-state">{n.unread ? "Chưa đọc" : "Đã đọc"}</span></article>; })}</section> : null; }) : <div className="notification-empty"><Bell size={34} aria-hidden="true" /><strong>Không có thông báo phù hợp</strong><p>Thử đổi bộ lọc để xem các cập nhật khác.</p></div>}
        </div>
        {selected && <aside className="notice-detail" id="notice-detail" aria-label="Chi tiết thông báo"><div className="notice-detail-heading"><span>CHI TIẾT THÔNG BÁO</span><button type="button" aria-label="Đóng chi tiết thông báo" onClick={() => setSelectedId(null)}><X size={19} /></button></div><span className="notice-detail-category">{notificationCategoryLabels[selected.category]}</span><h2>{selected.title}</h2><p className="notice-detail-time"><Clock3 size={15} aria-hidden="true" />{selected.group} lúc {selected.time}</p><p className="notice-detail-message">{selected.message}</p>{selected.important && <div className="notice-detail-callout"><Info size={18} aria-hidden="true" /><p>Thông tin cần chú ý. Xem hoạt động liên quan để chủ động theo dõi và xử lý.</p></div>}<Link className="btn btn-primary" to={selected.target}>Xem {notificationCategoryLabels[selected.category].toLocaleLowerCase("vi")}<ArrowUpRight size={17} aria-hidden="true" /></Link>{selected.unread && <button type="button" className="btn btn-secondary" onClick={() => markRead(selected.id)}><Check size={17} aria-hidden="true" />Đánh dấu đã đọc</button>}</aside>}
      </div>
    </section>
    <p className="notice-feedback" role="status">{feedback}</p>
  </div>;
}



