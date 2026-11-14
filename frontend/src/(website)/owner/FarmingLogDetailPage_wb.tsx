import BackButton from "../../components/owner/BackButton_wb";
import GeographicMap, { type MapRegion } from "../../components/owner/GeographicMap_wb";
import "../../styles/farming_logs_wb.css";
import {
  Camera,
  MapPin,
  MessageSquareText,
  NotebookPen,
  Send,
  Sprout,
  UserRound,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { farmService } from "../../sevices/farmService_wb";
import { farmingLogService } from "../../sevices/farmingLogService_wb";
import { plotService } from "../../sevices/plotService_wb";
import { seasonService } from "../../sevices/seasonService_wb";
import type { Farm } from "../../features/owner/farm_wb";
import type { FarmingLog } from "../../features/owner/farmingLog_wb";
import type { Plot } from "../../features/owner/plot_wb";
import type { Season } from "../../features/owner/season_wb";
import { getFarmPolygon } from "../../utils/geometry_wb";

const reviewLabels = ["Đạt", "Không đạt"] as const;
type ReviewLabel = (typeof reviewLabels)[number];
const ownerReviewContent = (label: ReviewLabel) => `Đánh giá của chủ nông trại: ${label}`;

function formatDateTime(value: string | null) {
  if (!value) {
    return "Chưa phát sinh";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function FarmingLogDetailPage() {
  const { logId = "" } = useParams();
  const [log, setLog] = useState<FarmingLog | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequest = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");

    try {
      const logData = await farmingLogService.getById(logId);

      if (!logData) {
        if (request !== loadRequest.current) return;
        setLog(null);
        return;
      }

      const [farmData, seasonData, plotData] = await Promise.all([
        farmService.getById(logData.farmId),
        seasonService.getById(logData.seasonId),
        plotService.getById(logData.plotId),
      ]);

      if (request !== loadRequest.current) return;

      setLog(logData);
      setFarm(farmData);
      setSeason(seasonData);
      setPlot(plotData);
    } catch {
      if (request !== loadRequest.current) return;
      setError("Không thể tải chi tiết nhật ký canh tác.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [logId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await farmingLogService.addNote(logId, noteContent);
      setNoteContent("");
      setNotice("Đã gửi ghi chú nhắc nhở.");
      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể lưu ghi chú.",
      );
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async (result: ReviewLabel) => {
    setReviewing(true);
    setError("");
    setNotice("");
    try {
      const note = await farmingLogService.addNote(logId, ownerReviewContent(result));
      setLog((current) => current?.id === logId
        ? { ...current, notes: [...current.notes, note] }
        : current);
      setNotice("Đã lưu đánh giá.");
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Không thể lưu đánh giá.");
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-loading">Đang tải chi tiết nhật ký...</div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="page farming-log-not-found">
        <NotebookPen size={38} />
        <div className="page-title-with-back"><BackButton to="/farming-logs" label="Quay lại danh sách nhật ký" /><h1>Không tìm thấy nhật ký</h1></div>
        <p>Bản ghi có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p>

      </div>
    );
  }

  const reviews = log.notes
    .filter((note) => note.authorRole === "owner" && reviewLabels.some((label) => note.content === ownerReviewContent(label)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const notes = log.notes.filter((note) => !reviews.includes(note));

  const regions: MapRegion[] = [];
  const farmBoundary = getFarmPolygon(farm);
  if (farm && farmBoundary.length) {
    regions.push({ id: farm.id, kind: "farm", label: farm.name, points: farmBoundary });
  }
  if (plot && plot.boundary.length >= 3) {
    regions.push({ id: plot.id, label: plot.name, points: plot.boundary });
  }

  return (
    <div className="page farming-log-detail-page">
      <div className="farming-log-detail-header">
        <BackButton to="/farming-logs" label="Quay lại danh sách nhật ký" />
        <div>
          <div className="farming-log-detail-eyebrow">
            <span>Nhật ký canh tác</span>
            <span>Đã ghi nhận</span>
          </div>
          <h1>{log.activityType}</h1>
          <p>{formatDateTime(log.loggedAt)}</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}
      {notice && <div className="farming-log-notice">{notice}</div>}

      <div className="farming-log-detail-layout">
        <main className="farming-log-detail-main">
          <section className="card farming-log-detail-card">
            <div className="farming-log-section-heading">
              <div>
                <NotebookPen size={19} />
                <h2>Nội dung công việc</h2>
              </div>
              <span className="farming-log-recorded-badge">Đã lưu chính thức</span>
            </div>
            <p className="farming-log-content">{log.content}</p>
          </section>

          <section className="card farming-log-detail-card">
            <div className="farming-log-section-heading">
              <div>
                <Camera size={19} />
                <h2>Ảnh hiện trạng ({log.photos.length})</h2>
              </div>
            </div>

            {log.photos.length === 0 ? (
              <div className="farming-log-photo-empty">
                <Camera size={29} />
                <span>Nhật ký này không có ảnh đính kèm.</span>
              </div>
            ) : (
              <div className="farming-log-photo-grid">
                {log.photos.map((photo) => (
                  <figure key={photo.id}>
                    <img src={photo.url} alt={photo.caption} />
                    <figcaption>{photo.caption}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </section>

          <section className="card farming-log-detail-card">
            <div className="farming-log-section-heading">
              <div>
                <MessageSquareText size={19} />
                <h2>Ghi chú nhắc nhở ({notes.length})</h2>
              </div>
              <div className="farming-log-review-actions" role="group" aria-label={`Đánh giá nhật ký của ${log.workerName || "công nhân"}`}>
                {reviewLabels.map((label) => (
                  <button
                    key={label}
                    className={label === "Đạt" ? "btn btn-primary" : "btn farming-log-review-reject"}
                    type="button"
                    aria-pressed={reviews[0]?.content === ownerReviewContent(label)}
                    disabled={reviewing || saving || reviews[0]?.content === ownerReviewContent(label)}
                    onClick={() => void submitReview(label)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="farming-log-notes">
              {notes.length === 0 ? (
                <div className="farming-log-notes-empty">
                  Chưa có ghi chú cho nhật ký này.
                </div>
              ) : (
                notes.map((note) => (
                  <article
                    className="farming-log-note"
                    key={note.id}
                  >
                    <div className="farming-log-note-avatar">
                      {note.authorName
                        .split(" ")
                        .slice(-2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="farming-log-note-body">
                      <div className="farming-log-note-meta">
                        <strong>{note.authorName}</strong>
                        <span>
                          {note.authorRole === "owner"
                            ? "Chủ nông trại"
                            : "Tổ trưởng"}
                        </span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                      <p>{note.content}</p>
                    </div>
                  </article>
                ))
              )}
            </div>

            {reviews.length > 0 && (
              <div className="farming-log-notes farming-log-review-history" aria-label="Lịch sử đánh giá của chủ nông trại">
                {reviews.map((note) => (
                  <article className="farming-log-note" key={note.id}>
                    <div className="farming-log-note-body">
                      <div className="farming-log-note-meta">
                        <strong>{note.authorName}</strong>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                      <p>{note.content}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <form className="farming-log-note-form" onSubmit={submitNote}>
              <label htmlFor="farming-log-note">Thêm ghi chú nhắc nhở</label>
              <textarea
                id="farming-log-note"
                rows={4}
                maxLength={1000}
                value={noteContent}
                placeholder="Nhập nội dung cần người ghi lưu ý hoặc bổ sung..."
                onChange={(event) => setNoteContent(event.target.value)}
              />
              <div>
                <span>{noteContent.length}/1000 ký tự</span>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving || reviewing || !noteContent.trim()}
                >
                  <Send size={16} />
                  {saving ? "Đang gửi..." : "Gửi ghi chú"}
                </button>
              </div>
            </form>
          </section>
        </main>

        <aside className="farming-log-detail-aside">
          <section className="card farming-log-context-card">
            <h2>Thông tin nhật ký</h2>
            <div className="farming-log-context-item">
              <UserRound size={17} />
              <div>
                <span>Người ghi</span>
                <strong>{log.workerName}</strong>
              </div>
            </div>
            <div className="farming-log-context-item">
              <Sprout size={17} />
              <div>
                <span>Mùa vụ</span>
                <strong>{season?.name ?? "Không xác định"}</strong>
                {season && <small>{season.code}</small>}
              </div>
            </div>
            <div className="farming-log-context-item">
              <MapPin size={17} />
              <div>
                <span>Vùng trồng</span>
                <strong>{plot?.name ?? "Không xác định"}</strong>
                {plot && <small>{plot.code}</small>}
              </div>
            </div>
            <div className="farming-log-context-item">
              <NotebookPen size={17} />
              <div>
                <span>Nông trại</span>
                <strong>{farm?.name ?? "Không xác định"}</strong>
              </div>
            </div>
          </section>

          <section className="card farming-log-gps-card">
            <div>
              <MapPin size={18} />
              <h2>Vị trí ghi nhận</h2>
            </div>
            <GeographicMap label="Vị trí GPS và ranh giới của nhật ký canh tác" points={[log.gps]} pointsKind="gps" regions={regions} />
            <dl>
              <div>
                <dt>Vĩ độ</dt>
                <dd>{log.gps.latitude.toFixed(6)}</dd>
              </div>
              <div>
                <dt>Kinh độ</dt>
                <dd>{log.gps.longitude.toFixed(6)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default FarmingLogDetailPage;

