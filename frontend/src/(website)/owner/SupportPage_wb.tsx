import "../../styles/support_wb.css";
import { ImagePlus, LifeBuoy, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { errorReportCategories, errorReportStatuses, type ErrorReport } from "../../features/owner/support_wb";
import { useWebPolling } from "../../hooks/use_web_polling_wb";
import { resolveMediaUrl } from "../../sevices/httpClient_wb";
import { supportService } from "../../sevices/supportService_wb";
import { accountService } from "../../sevices/accountService_wb";

const reportDate = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
});

export default function SupportPage() {
  const { farms, selectedFarmId } = useFarmContext();
  const [farmId, setFarmId] = useState("");
  const [category, setCategory] = useState("bug");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<Array<{ file: File; url: string; uploadedUrl?: string }>>([]);
  const imageInput = useRef<HTMLInputElement>(null);
  const imageUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = imageUrls.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, []);
  const selectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setNotice("");
    if (files.some(file => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) { setError("Chọn ảnh JPG, PNG hoặc WEBP, tối đa 5 MB."); return; }
    if (images.length + files.length > 1) { setError("Chỉ được chọn tối đa 1 ảnh."); return; }
    setError("");
    const additions = files.map(file => { const url = URL.createObjectURL(file); imageUrls.current.add(url); return { file, url }; });
    setImages(current => [...current, ...additions]);
  };
  const removeImage = (url: string) => {
    URL.revokeObjectURL(url); imageUrls.current.delete(url);
    setImages(current => current.filter(image => image.url !== url));
    setError("");
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [history, setHistory] = useState<{ farmId: string; reports: ErrorReport[]; error: string }>();
  const [historyRevision, setHistoryRevision] = useState(0);
  const historyRequest = useRef(0);
  const loadHistory = useCallback(async (background = false) => {
    const request = ++historyRequest.current;
    try {
      const user = await accountService.getCurrentUser();
      if (request !== historyRequest.current) return;
      const reports = (await supportService.getAll(selectedFarmId)).filter(report => report.user_id === user.user_id);
      if (request === historyRequest.current) setHistory({ farmId: selectedFarmId, reports, error: "" });
    } catch (cause) {
      if (background || request !== historyRequest.current) return;
      const error = cause instanceof Error ? cause.message : "Không thể tải lịch sử báo lỗi.";
      setHistory(current => ({ farmId: selectedFarmId, reports: current?.farmId === selectedFarmId ? current.reports : [], error }));
    }
  }, [selectedFarmId]);
  useEffect(() => {
    const request = historyRequest;
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => { window.clearTimeout(timer); request.current += 1; };
  }, [loadHistory, historyRevision]);
  useWebPolling(loadHistory, history?.farmId === selectedFarmId);
  const currentHistory = history?.farmId === selectedFarmId ? history : undefined;
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (description.trim().length < 5) { setError("Mô tả cần ít nhất 5 ký tự."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      let screenshot = images[0]?.uploadedUrl ?? null;
      if (images[0] && !screenshot) {
        screenshot = (await supportService.uploadScreenshot(images[0].file)).screenshot_url;
        setImages(current => current.map(image => ({ ...image, uploadedUrl: screenshot ?? undefined })));
      }
      await supportService.create(farmId || (selectedFarmId !== "all" ? selectedFarmId : ""), { error_type: category, description: description.trim(), screenshot_url: screenshot });
      setDescription("");
      images.forEach(image => { URL.revokeObjectURL(image.url); imageUrls.current.delete(image.url); });
      setImages([]);
      setNotice("Đã gửi báo lỗi đến quản trị viên.");
      setHistoryRevision(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể gửi báo lỗi."); }
    finally { setBusy(false); }
  };
  return <div className="page support-page">
    <div className="page-heading"><div><h1>Hỗ trợ & báo lỗi</h1><p>Gửi thông tin lỗi hệ thống đến quản trị viên.</p></div></div>
    {error && <div className="page-error" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}
    <div className="support-form-only">
      <section className="card support-form-card"><div className="support-heading"><span className="support-icon"><LifeBuoy size={21} /></span><div><h2>Gửi báo lỗi</h2><p>Mô tả thao tác và lỗi bạn gặp phải.</p></div></div>
        <form onSubmit={submit}>
          <div className="support-form-row">
          <label><span>Nông trại *</span><select required disabled={busy} value={farmId || (selectedFarmId !== "all" ? selectedFarmId : "")} onChange={event => setFarmId(event.target.value)}><option value="">Chọn nông trại</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label>
          <label><span>Loại lỗi</span><select disabled={busy} value={category} onChange={event => setCategory(event.target.value)}>{Object.entries(errorReportCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <div className="support-content-row">
          <label className="support-description"><span>Mô tả lỗi *</span><textarea required minLength={5} rows={4} disabled={busy} value={description} onChange={event => setDescription(event.target.value)} /></label>
          <div className="support-image-section"><span className="support-image-label">Ảnh minh họa</span>
            <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={selectImages} disabled={busy || images.length >= 1} />
            <button className="btn btn-secondary support-upload-button" type="button" disabled={busy || images.length >= 1} onClick={() => imageInput.current?.click()}><ImagePlus size={18} />Đăng tải ảnh</button>
            <div className="support-image-preview" role="group" aria-label="Ảnh minh họa lỗi">
              {images.map(image => <figure key={image.url}><img src={image.url} alt={image.file.name} /><button type="button" aria-label={`Xóa ảnh ${image.file.name}`} disabled={busy} onClick={() => removeImage(image.url)}><X size={17} /></button></figure>)}
            </div>
          </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy || !farms.length}><Send size={17} />{busy ? "Đang gửi..." : "Gửi báo lỗi"}</button>
        </form>
      </section>
      <section className="card support-form-card" aria-labelledby="support-history-title">
        <div className="support-history-heading"><h2 id="support-history-title">Lịch sử báo lỗi</h2></div>
        {!currentHistory && <p role="status">Đang tải lịch sử báo lỗi…</p>}
        {!!currentHistory?.error && <div className="page-error" role="alert">
          {currentHistory.error} <button type="button" className="btn btn-secondary" onClick={() => void loadHistory()}>Thử lại</button>
        </div>}
        {currentHistory && !currentHistory.error && !currentHistory.reports.length && <p>Chưa có báo cáo lỗi.</p>}
        {!!currentHistory?.reports.length && <div className="support-report-list">
          {currentHistory.reports.map(report => <article key={report.report_id}>
            <div className="support-report-body">
              <div className="support-report-copy">
                <div className="support-report-meta">
                  <strong>{report.user_full_name || "Bạn"}</strong>
                  <time dateTime={report.submitted_at}>{reportDate.format(new Date(report.submitted_at))}</time>
                  <span className={`support-status support-status-${report.status}`}>{errorReportStatuses[report.status] ?? report.status}</span>
                </div>
                <div className="support-report-message">
                  <strong>Nội dung báo lỗi</strong>
                  <p className="support-report-description">{report.description}</p>
                </div>
                {report.admin_response && <div className="support-report-message support-report-reply">
                  <strong>Phản hồi từ quản trị viên</strong>
                  <p className="support-report-description">{report.admin_response}</p>
                </div>}
              </div>
              {report.screenshot_url && <a className="support-report-photo" href={resolveMediaUrl(report.screenshot_url)} target="_blank" rel="noreferrer">
                <img src={resolveMediaUrl(report.screenshot_url)} alt="Mở ảnh minh họa báo lỗi" loading="lazy" />
              </a>}
            </div>
          </article>)}
        </div>}
      </section>
    </div>
  </div>;
}


