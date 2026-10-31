import BackButton from "../../components/owner/BackButton_wb";
import { ListActionConfirmation } from "../../components/owner/ListRowActions_wb";
import { QRCodeCanvas } from "qrcode.react";
import "../../styles/harvests_wb.css";
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  MapPinned,
  PackageCheck,
  QrCode,
  Save,
  Scale,
  Sprout,
  Trash2,
  X,
  Download,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { farmService } from "../../sevices/farmService_wb";
import { harvestService } from "../../sevices/harvestService_wb";
import { plotService } from "../../sevices/plotService_wb";
import { seasonService } from "../../sevices/seasonService_wb";
import type { Farm } from "../../features/owner/farm_wb";
import type { HarvestBatch } from "../../features/owner/harvest_wb";
import { harvestStatusLabels } from "../../features/owner/harvest_wb";
import type { Plot } from "../../features/owner/plot_wb";
import type { Season } from "../../features/owner/season_wb";

function formatDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : null;
  if (!date || !Number.isFinite(date.getTime())) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(
    date,
  );
}

function formatDateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Chưa phát sinh";
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function HarvestDetailPage() {
  const { batchId = "" } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<HarvestBatch | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [harvestDate, setHarvestDate] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editStatus, setEditStatus] = useState<"pending" | "ready">("pending");
  const [editTraceUrl, setEditTraceUrl] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editContributions, setEditContributions] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const editDialog = useRef<HTMLDialogElement>(null);
  const qrCanvas = useRef<HTMLCanvasElement>(null);
  const generateQr = async () => {
    if (!batch || busy || batch.status === "cancelled") return;
    setBusy(true); setError(""); setNotice("");
    try { setBatch(await harvestService.generateTraceCode(batch.id)); setNotice("Đã tạo mã QR truy xuất cho lô thu hoạch."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tạo mã QR."); }
    finally { setBusy(false); }
  };
  const downloadQr = () => {
    if (!qrCanvas.current || !batch) return;
    const link = document.createElement("a");
    link.href = qrCanvas.current.toDataURL("image/png");
    link.download = `${batch.code.replace(/[^a-zA-Z0-9_-]/g, "_")}-QR.png`;
    link.click();
  };

  useEffect(() => {
    if (!editing) return;
    const trigger = document.activeElement as HTMLElement | null;
    editDialog.current?.showModal();
    return () => { trigger?.focus(); };
  }, [editing]);

  const openEdit = () => {
    if (!batch || batch.status === "cancelled") return;
    setHarvestDate(batch.harvestDate);
    setEditCode(batch.code);
    setEditStatus(batch.status);
    setEditTraceUrl(batch.traceUrl ?? "");
    setEditQuantity(String(batch.quantityKg));
    setEditContributions(Object.fromEntries(batch.contributions.map(item => [item.seasonId, String(item.quantityKg)])));
    setEditError("");
    setEditing(true);
  };

  const loadRequest = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");

    try {
      const batchData = await harvestService.getById(batchId);
      if (!batchData) {
        if (request !== loadRequest.current) return;
        setBatch(null);
        return;
      }

      const [farmData, seasonData, plotData] = await Promise.all([
        farmService.getById(batchData.farmId),
        seasonService.getAll(batchData.farmId),
        plotService.getAll(batchData.farmId),
      ]);
      if (request !== loadRequest.current) return;
      setBatch(batchData);
      setHarvestDate(batchData.harvestDate);
      setFarm(farmData);
      setSeasons(seasonData);
      setPlots(plotData);
    } catch {
      if (request !== loadRequest.current) return;
      setError("Không thể tải chi tiết lô thu hoạch.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  const seasonById = useMemo(
    () => new Map(seasons.map((season) => [season.id, season])),
    [seasons],
  );
  const plotById = useMemo(
    () => new Map(plots.map((plot) => [plot.id, plot])),
    [plots],
  );

  const cancelBatch = async () => {
    if (!batch) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      await harvestService.cancel(batch.id);
      navigate("/harvests");
    } finally {
      setBusy(false);
    }
  };

  const saveBatch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!batch) return;
    if (!editCode.trim() || !harvestDate) { setEditError("Vui lòng nhập mã lô và ngày thu hoạch."); return; }
    setBusy(true);
    setEditError("");
    setNotice("");
    try {
      let currentBatch = batch;
      for (const contribution of batch.contributions) {
        const quantityKg = Number(editContributions[contribution.seasonId]);
        if (!Number.isFinite(quantityKg) || quantityKg <= 0) throw new Error("Sản lượng đóng góp phải lớn hơn 0.");
        if (quantityKg !== contribution.quantityKg) {
          currentBatch = await harvestService.updateContribution(batch.id, { seasonId: contribution.seasonId, quantityKg });
          setBatch(currentBatch);
        }
      }
      const updated = await harvestService.update(batch.id, {
        harvestDate, code: editCode, status: editStatus,
        ...(editTraceUrl.trim() !== (batch.traceUrl ?? "") ? { traceUrl: editTraceUrl } : {}),
        ...(batch.contributions.length === 0 ? { quantityKg: Number(editQuantity) } : {}),
      });
      setBatch(updated);
      setEditing(false);
      setNotice("Đã cập nhật thông tin lô thu hoạch.");
    } catch (actionError) {
      setEditError(actionError instanceof Error ? actionError.message : "Không thể cập nhật lô thu hoạch.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="page"><div className="page-loading">Đang tải lô thu hoạch...</div></div>;
  }

  if (!batch) {
    return (
      <div className="page harvest-not-found">
        <PackageCheck size={38} />
        <div className="page-title-with-back"><BackButton to="/harvests" label="Quay lại danh sách thu hoạch" /><h1>Không tìm thấy lô thu hoạch</h1></div>

      </div>
    );
  }

  return (
    <div className="page harvest-detail-page">
      <div className="harvest-detail-topbar">
        <BackButton to="/harvests" label="Quay lại danh sách thu hoạch" />
        <div className="harvest-detail-title">
          <div>
            <h1>{batch.code}</h1>
            <span className={`harvest-status harvest-status-${batch.status}`}>
              {harvestStatusLabels[batch.status]}
            </span>
          </div>
          <p>{farm?.name ?? "Nông trại không xác định"}</p>
        </div>
        {batch.status !== "cancelled" && <div className="harvest-detail-actions">
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={openEdit}><Edit3 size={16} />Chỉnh sửa</button>
          <button className="harvest-delete-button" type="button" disabled={busy} onClick={() => setCancelOpen(true)}><Trash2 size={16} />Hủy lô</button>
        </div>}
      </div>

      {error && <div className="page-error">{error}</div>}
      {notice && <div className="harvest-notice">{notice}</div>}

      {cancelOpen && <ListActionConfirmation action="delete" title="Hủy lô thu hoạch?" confirmLabel="Xác nhận hủy lô" name={batch.code} statusLabel="Hủy lô thu hoạch" description="Bạn có chắc muốn hủy lô thu hoạch này? Dữ liệu vẫn được giữ để truy xuất lịch sử." onClose={() => setCancelOpen(false)} onConfirm={cancelBatch} />}

      {editing && <dialog ref={editDialog} className="harvest-edit-dialog" aria-labelledby="harvest-edit-title" onCancel={event => { event.preventDefault(); if (!busy) setEditing(false); }}>
        <form onSubmit={saveBatch}>
          <header className="harvest-edit-heading"><div><h2 id="harvest-edit-title">Chỉnh sửa lô thu hoạch</h2><p>{batch.code} · {farm?.name}</p></div><button type="button" aria-label="Đóng" disabled={busy} onClick={() => setEditing(false)}><X size={20} /></button></header>
          <div className="harvest-edit-content">
            {editError && <div className="form-error" role="alert">{editError}</div>}
            <fieldset disabled={busy} className="harvest-edit-fields">
              <label><span>Mã lô <b>*</b></span><input required autoFocus value={editCode} onChange={event => setEditCode(event.target.value)} /></label>
              <label><span>Ngày thu hoạch <b>*</b></span><input required type="date" value={harvestDate} onChange={event => setHarvestDate(event.target.value)} /></label>
              <label><span>Nông trại</span><input readOnly value={farm?.name ?? "Không xác định"} /></label>
              <label><span>Trạng thái</span><select value={editStatus} onChange={event => setEditStatus(event.target.value as "pending" | "ready")}><option value="pending">{harvestStatusLabels.pending}</option><option value="ready">{harvestStatusLabels.ready}</option></select></label>
              <label className="harvest-edit-full"><span>Đường dẫn truy xuất QR</span><input type="url" placeholder="https://..." value={editTraceUrl} onChange={event => setEditTraceUrl(event.target.value)} /></label>
              <div className="harvest-edit-full harvest-edit-section-title"><Sprout size={19} /><h3>Nguồn sản lượng</h3></div>
              {batch.contributions.map(contribution => <label key={contribution.seasonId}><span>{seasonById.get(contribution.seasonId)?.name ?? "Mùa vụ"} (kg) <b>*</b></span><input required type="number" min="0.01" step="0.01" value={editContributions[contribution.seasonId] ?? ""} onChange={event => setEditContributions(current => ({ ...current, [contribution.seasonId]: event.target.value }))} /></label>)}
              <label className="harvest-edit-full"><span>Tổng sản lượng (kg)</span><input type="number" min="0" step="0.01" required readOnly={batch.contributions.length > 0} value={batch.contributions.length ? batch.contributions.reduce((sum, item) => sum + (Number(editContributions[item.seasonId]) || 0), 0).toFixed(2) : editQuantity} onChange={event => setEditQuantity(event.target.value)} />{batch.contributions.length > 0 && <small>Tự tính từ sản lượng của các mùa vụ đóng góp.</small>}</label>
            </fieldset>
          </div>
          <footer className="harvest-edit-footer"><button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setEditing(false)}>Hủy</button><button className="btn btn-primary" type="submit" disabled={busy}><Save size={17} />{busy ? "Đang lưu..." : "Lưu thay đổi"}</button></footer>
        </form>
      </dialog>}

      <section className="harvest-detail-summary">
        <article className="card"><CalendarDays size={20} /><div><span>Ngày thu hoạch</span><strong>{formatDate(batch.harvestDate)}</strong></div></article>
        <article className="card"><Scale size={20} /><div><span>Tổng sản lượng</span><strong>{formatQuantity(batch.quantityKg)} kg</strong></div></article>
        <article className="card"><Sprout size={20} /><div><span>Mùa vụ đóng góp</span><strong>{batch.contributions.length}</strong></div></article>
        <article className="card"><QrCode size={20} /><div><span>Mã truy xuất</span><strong>{batch.traceUrl ? "Đã tạo mã QR" : "Chưa tạo mã QR"}</strong></div></article>
      </section>

      <div className="harvest-detail-grid">
        <main className="harvest-detail-main">
          <section className="card harvest-detail-card">
            <div className="harvest-section-heading">
              <div><Sprout size={19} /><h2>Nguồn sản lượng</h2></div>
              <strong>{formatQuantity(batch.quantityKg)} kg</strong>
            </div>
            <div className="harvest-contribution-list">
              {batch.contributions.map((contribution) => {
                const season = seasonById.get(contribution.seasonId);
                const plot = season ? plotById.get(season.plotId) : null;
                return (
                  <article key={contribution.seasonId}>
                    <div className="harvest-contribution-icon"><Sprout size={19} /></div>
                    <div className="harvest-contribution-info">
                      <strong>{season?.name ?? "Mùa vụ không xác định"}</strong>
                      <span><MapPinned size={13} /> {plot?.name ?? "Vùng trồng"} · {season?.varietyName}</span>
                    </div>
                    <div className="harvest-contribution-quantity">
                      <strong>{formatQuantity(contribution.quantityKg)} kg</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="card harvest-detail-card">
            <div className="harvest-section-heading">
              <div><CheckCircle2 size={19} /><h2>Thông tin truy xuất</h2></div>
            </div>
            <dl className="harvest-trace-details">
              <div><dt>Mã lô</dt><dd>{batch.code}</dd></div>
              <div><dt>Nông trại</dt><dd>{farm?.name ?? "Không xác định"}</dd></div>
              <div><dt>Ngày thu hoạch</dt><dd>{formatDate(batch.harvestDate)}</dd></div>
              <div><dt>Ngày tạo bản ghi</dt><dd>{formatDateTime(batch.createdAt)}</dd></div>
            </dl>
          </section>
        </main>

        <aside className="card harvest-qr-card">
          <div className="harvest-section-heading">
            <div><QrCode size={19} /><h2>Tem truy xuất</h2></div>
          </div>
          <div className="harvest-qr-empty">
            {batch.traceUrl ? <><QRCodeCanvas ref={qrCanvas} value={batch.traceUrl} size={240} marginSize={4} level="M" /><strong>{batch.code}</strong><button className="btn btn-secondary" type="button" onClick={downloadQr}><Download size={17} />Tải mã QR</button>{/^https?:\/\//i.test(batch.traceUrl) && <a href={batch.traceUrl} target="_blank" rel="noreferrer">Mở đường dẫn truy xuất</a>}</> : <><QrCode size={44} /><strong>Chưa có mã QR</strong><p>Tạo mã QR để gắn với thông tin lô thu hoạch.</p>{batch.status !== "cancelled" && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void generateQr()}><QrCode size={17} />{busy ? "Đang tạo..." : "Tạo mã QR"}</button>}</>}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default HarvestDetailPage;

