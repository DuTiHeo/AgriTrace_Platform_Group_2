import "../../styles/support_wb.css";
import { LifeBuoy, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ListActionConfirmation } from "../../components/owner/ListRowActions_wb";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { errorReportCategories, errorReportStatuses, type ErrorReport, type ErrorReportStatus } from "../../features/owner/support_wb";
import { accountService } from "../../sevices/accountService_wb";
import { supportService } from "../../sevices/supportService_wb";
export default function SupportPage() {
  const { farms, selectedFarmId } = useFarmContext();
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [userId, setUserId] = useState("");
  const [farmId, setFarmId] = useState("");
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState("");
  const [status, setStatus] = useState<ErrorReportStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ErrorReport | null>(null);
  const request = useRef(0);
  const load = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError("");
    try {
      const [items, account] = await Promise.all([supportService.getAll(selectedFarmId), accountService.getAccount()]);
      if (current !== request.current) return;
      setReports(items); setUserId(account.id);
    } catch (cause) { if (current === request.current) setError(cause instanceof Error ? cause.message : "Không thể tải báo cáo."); }
    finally { if (current === request.current) setLoading(false); }
  }, [selectedFarmId]);
  useEffect(() => { const requestCounter = request; const timer = window.setTimeout(() => void load(), 0); return () => { window.clearTimeout(timer); requestCounter.current++; }; }, [load]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (description.trim().length < 5) { setError("Mô tả cần ít nhất 5 ký tự."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const report = await supportService.create(farmId || (selectedFarmId !== "all" ? selectedFarmId : ""), { error_type: category, description: description.trim(), screenshot_url: screenshot.trim() || null });
      setDescription(""); setScreenshot("");
      if (selectedFarmId === "all" || report.org_id === selectedFarmId) setReports(items => [report, ...items]);
      setNotice("Đã gửi báo lỗi đến quản trị viên.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể gửi báo lỗi."); }
    finally { setBusy(false); }
  };
  const filtered = reports.filter(item => (status === "all" || item.status === status) && `${item.description} ${item.org_name ?? ""} ${item.admin_response ?? ""}`.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")));
  return <div className="page support-page">
    <div className="page-heading"><div><h1>Hỗ trợ & báo lỗi</h1><p>Gửi lỗi hệ thống và theo dõi phản hồi từ quản trị viên.</p></div></div>
    {error && <div className="page-error" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}
    <div className="support-layout">
      <section className="card support-form-card"><div className="support-heading"><span className="support-icon"><LifeBuoy size={21} /></span><div><h2>Gửi báo lỗi</h2><p>Mô tả thao tác và lỗi bạn gặp phải.</p></div></div>
        <form onSubmit={submit}>
          <label><span>Nông trại *</span><select required disabled={busy} value={farmId || (selectedFarmId !== "all" ? selectedFarmId : "")} onChange={event => setFarmId(event.target.value)}><option value="">Chọn nông trại</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>
          <label><span>Loại lỗi</span><select disabled={busy} value={category} onChange={event => setCategory(event.target.value)}>{Object.entries(errorReportCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Mô tả lỗi *</span><textarea required minLength={5} rows={6} disabled={busy} value={description} onChange={event => setDescription(event.target.value)} /></label>
          <label><span>Đường dẫn ảnh minh họa</span><input type="url" maxLength={500} disabled={busy} placeholder="https://..." value={screenshot} onChange={event => setScreenshot(event.target.value)} /></label>
          <button className="btn btn-primary" type="submit" disabled={busy || !farms.length}><Send size={17} />{busy ? "Đang gửi..." : "Gửi báo lỗi"}</button>
        </form>
      </section>
      <section className="card support-history-card"><div className="support-history-heading"><h2>Lịch sử báo lỗi</h2><select aria-label="Lọc trạng thái báo lỗi" value={status} onChange={event => setStatus(event.target.value as ErrorReportStatus | "all")}><option value="all">Tất cả trạng thái</option>{Object.entries(errorReportStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <input className="input" type="search" aria-label="Tìm báo lỗi" placeholder="Tìm nội dung, nông trại hoặc phản hồi..." value={search} onChange={event => setSearch(event.target.value)} />
        {loading ? <div className="page-loading">Đang tải báo lỗi...</div> : <div className="support-report-list">{filtered.length ? filtered.map(report => <article key={report.report_id}><div className="support-report-title"><strong>{errorReportCategories[report.error_type ?? ""] ?? report.error_type ?? "Báo lỗi"}</strong><span className={`support-status support-status-${report.status}`}>{errorReportStatuses[report.status]}</span></div><p>{report.description}</p><div className="support-report-meta"><span>{report.org_name}</span><span>{report.user_full_name}</span><span>{new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(report.submitted_at))}</span></div>{report.screenshot_url && /^https?:\/\//i.test(report.screenshot_url) && <a href={report.screenshot_url} target="_blank" rel="noreferrer">Xem ảnh minh họa</a>}{report.admin_response && <div className="support-response">Phản hồi: {report.admin_response}</div>}{report.user_id === userId && report.status === "new" && <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(report)}><Trash2 size={15} />Xóa báo lỗi</button>}</article>) : <div className="support-empty">Chưa có báo lỗi phù hợp.</div>}</div>}
      </section>
    </div>
    {deleteTarget && <ListActionConfirmation action="delete" name={deleteTarget.description} statusLabel="Xóa báo lỗi" onClose={() => setDeleteTarget(null)} onConfirm={async () => { await supportService.delete(deleteTarget.report_id); setReports(items => items.filter(item => item.report_id !== deleteTarget.report_id)); }} />}
  </div>;
}

