import "../styles/farming-logs.css";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquareText,
  NotebookPen,
  RotateCcw,
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
import { Link, useParams } from "react-router-dom";
import { farmService } from "../services/farmService";
import { farmingLogService } from "../services/farmingLogService";
import { plotService } from "../services/plotService";
import { seasonService } from "../services/seasonService";
import type { Farm } from "../types/farm";
import type { FarmingLog } from "../types/farmingLog";
import type { Plot } from "../types/plot";
import type { Season } from "../types/season";

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

  const toggleNote = async (noteId: string, resolved: boolean) => {
    setError("");
    setNotice("");

    try {
      await farmingLogService.setNoteResolved(logId, noteId, resolved);
      setNotice(
        resolved
          ? "Đã đánh dấu ghi chú là đã xử lý."
          : "Đã mở lại ghi chú để tiếp tục theo dõi.",
      );
      await loadData();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Không thể cập nhật ghi chú.",
      );
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
        <h1>Không tìm thấy nhật ký</h1>
        <p>Bản ghi có thể đã bị xóa hoặc đường dẫn không còn hợp lệ.</p>
        <Link className="btn btn-primary" to="/farming-logs">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const unresolvedCount = log.notes.filter((note) => !note.resolved).length;

  return (
    <div className="page farming-log-detail-page">
      <div className="farming-log-detail-header">
        <Link
          className="farming-log-back-button"
          to="/farming-logs"
          aria-label="Quay lại danh sách nhật ký"
        >
          <ArrowLeft size={20} />
        </Link>
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
                <h2>Ghi chú nhắc nhở ({log.notes.length})</h2>
              </div>
              {unresolvedCount > 0 && (
                <span className="farming-log-attention-badge">
                  {unresolvedCount} chưa xử lý
                </span>
              )}
            </div>

            <div className="farming-log-note-explainer">
              Ghi chú dùng để trao đổi và nhắc người ghi bổ sung thông tin;
              không phải thao tác duyệt hoặc từ chối nhật ký.
            </div>

            <div className="farming-log-notes">
              {log.notes.length === 0 ? (
                <div className="farming-log-notes-empty">
                  Chưa có ghi chú cho nhật ký này.
                </div>
              ) : (
                log.notes.map((note) => (
                  <article
                    className={`farming-log-note ${
                      note.resolved ? "farming-log-note-resolved" : ""
                    }`}
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
                      <div className="farming-log-note-footer">
                        <span
                          className={
                            note.resolved
                              ? "farming-log-note-status resolved"
                              : "farming-log-note-status"
                          }
                        >
                          {note.resolved ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <Clock3 size={14} />
                          )}
                          {note.resolved ? "Đã xử lý" : "Cần theo dõi"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void toggleNote(note.id, !note.resolved)
                          }
                        >
                          {note.resolved ? (
                            <RotateCcw size={14} />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          {note.resolved
                            ? "Mở lại ghi chú"
                            : "Đánh dấu đã xử lý"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

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
                  disabled={saving || !noteContent.trim()}
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
            <div className="farming-log-map-placeholder">
              <MapPin size={30} />
              <span>Điểm GPS tại vùng trồng</span>
            </div>
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

