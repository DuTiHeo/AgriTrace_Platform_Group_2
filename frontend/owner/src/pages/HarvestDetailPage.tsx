import "../styles/harvests.css";
import {
  ArrowLeft,
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
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { farmService } from "../services/farmService";
import { harvestService } from "../services/harvestService";
import { plotService } from "../services/plotService";
import { seasonService } from "../services/seasonService";
import type { Farm } from "../types/farm";
import type { HarvestBatch } from "../types/harvest";
import { harvestStatusLabels } from "../types/harvest";
import type { Plot } from "../types/plot";
import type { Season } from "../types/season";

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
    if (!batch || !window.confirm(`Hủy lô thu hoạch ${batch.code}? Dữ liệu vẫn được giữ để truy xuất lịch sử.`)) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      await harvestService.cancel(batch.id);
      navigate("/harvests");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể hủy lô thu hoạch.");
    } finally {
      setBusy(false);
    }
  };

  const saveBatch = async () => {
    if (!batch) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await harvestService.update(batch.id, { harvestDate });
      setBatch(updated);
      setEditing(false);
      setNotice("Đã cập nhật thông tin lô thu hoạch.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể cập nhật lô thu hoạch.");
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
        <h1>Không tìm thấy lô thu hoạch</h1>
        <Link className="btn btn-primary" to="/harvests">Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="page harvest-detail-page">
      <div className="harvest-detail-topbar">
        <Link className="harvest-back-button" to="/harvests" aria-label="Quay lại danh sách">
          <ArrowLeft size={20} />
        </Link>
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
          <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setEditing((current) => !current)}><Edit3 size={16} />Chỉnh sửa</button>
          <button className="harvest-delete-button" type="button" disabled={busy} onClick={() => void cancelBatch()}><Trash2 size={16} />Hủy lô</button>
        </div>}
      </div>

      {error && <div className="page-error">{error}</div>}
      {notice && <div className="harvest-notice">{notice}</div>}

      {editing && <section className="card harvest-edit-card">
        <div><strong>Chỉnh sửa lô thu hoạch</strong><span>Mã lô và nguồn sản lượng được giữ nguyên để bảo toàn truy xuất.</span></div>
        <label><span>Ngày thu hoạch</span><input type="date" required max={new Date().toISOString().slice(0, 10)} value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} /></label>
        <div><button className="btn btn-secondary" type="button" onClick={() => { setHarvestDate(batch.harvestDate); setEditing(false); }}>Hủy</button><button className="btn btn-primary" type="button" disabled={busy || !harvestDate} onClick={() => void saveBatch()}><Save size={16} />{busy ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
      </section>}

      <section className="harvest-detail-summary">
        <article className="card"><CalendarDays size={20} /><div><span>Ngày thu hoạch</span><strong>{formatDate(batch.harvestDate)}</strong></div></article>
        <article className="card"><Scale size={20} /><div><span>Tổng sản lượng</span><strong>{formatQuantity(batch.quantityKg)} kg</strong></div></article>
        <article className="card"><Sprout size={20} /><div><span>Mùa vụ đóng góp</span><strong>{batch.contributions.length}</strong></div></article>
        <article className="card"><QrCode size={20} /><div><span>Mã truy xuất</span><strong>{"Chưa hỗ trợ công khai"}</strong></div></article>
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
                const percentage = batch.quantityKg > 0
                  ? (contribution.quantityKg / batch.quantityKg) * 100
                  : 0;
                return (
                  <article key={contribution.seasonId}>
                    <div className="harvest-contribution-icon"><Sprout size={19} /></div>
                    <div className="harvest-contribution-info">
                      <strong>{season?.name ?? "Mùa vụ không xác định"}</strong>
                      <span><MapPinned size={13} /> {plot?.name ?? "Vùng trồng"} · {season?.varietyName}</span>
                      <div><span style={{ width: `${percentage}%` }} /></div>
                    </div>
                    <div className="harvest-contribution-quantity">
                      <strong>{formatQuantity(contribution.quantityKg)} kg</strong>
                      <span>{percentage.toFixed(1)}%</span>
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
          <div className="harvest-qr-empty" role="status">
            <QrCode size={44} /><strong>Truy xuất công khai chưa khả dụng</strong>
            <p>Hiện chỉ có thể xem thông tin lô thu hoạch trong tài khoản chủ nông trại.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default HarvestDetailPage;

