import "../styles/plots.css";
import "../styles/plot-detail.css";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Lock,
  MapPinned,
  PauseCircle,
  PlayCircle,
  Ruler,
  Save,
  Sprout,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import PlotBoundaryEditor from "../components/plots/PlotBoundaryEditor";
import { useFarmContext } from "../contexts/FarmContext";
import { plotService } from "../services/plotService";
import type {
  BoundaryPoint,
  Plot,
} from "../types/plot";
import { calculatePlotArea } from "../utils/geometry";

type DialogType =
  | "edit"
  | "boundary"
  | "status"
  | "delete"
  | "delete-blocked"
  | null;

type EditForm = {
  code: string;
  area: string;
};

function PlotBoundaryPreview({
  points,
}: {
  points: BoundaryPoint[];
}) {
  const polygonPoints = useMemo(() => {
    if (points.length === 0) {
      return "";
    }

    const latitudes = points.map(
      (point) => point.latitude,
    );
    const longitudes = points.map(
      (point) => point.longitude,
    );

    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    const latitudeRange =
      maxLatitude - minLatitude || 0.001;
    const longitudeRange =
      maxLongitude - minLongitude || 0.001;

    return points
      .map((point) => {
        const x =
          10 +
          ((point.longitude - minLongitude) /
            longitudeRange) *
            80;

        const y =
          10 +
          ((maxLatitude - point.latitude) /
            latitudeRange) *
            80;

        return `${x},${y}`;
      })
      .join(" ");
  }, [points]);

  return (
    <div className="plot-boundary-preview">
      <div className="plot-boundary-grid" />

      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-label="Ranh giới vùng trồng"
      >
        <polygon points={polygonPoints} />

        {polygonPoints
          .split(" ")
          .filter(Boolean)
          .map((coordinate, index) => {
            const [x, y] = coordinate.split(",");

            return (
              <circle
                key={`${coordinate}-${index}`}
                cx={x}
                cy={y}
                r="1.4"
              />
            );
          })}
      </svg>

      <div className="plot-boundary-label">
        <MapPinned size={17} />
        {points.length} điểm tọa độ
      </div>
    </div>
  );
}

function PlotDetailPage() {
  const { plotId } = useParams();
  const navigate = useNavigate();
  const { farms } = useFarmContext();

  const [plot, setPlot] = useState<Plot | null>(null);
  const [pageLoadError, setPageLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] =
    useState<DialogType>(null);
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] =
    useState<EditForm>({
      code: "",
      area: "",
    });

  const [editingBoundary, setEditingBoundary] =
    useState<BoundaryPoint[]>([]);

  const loadRequest = useRef(0);
  const loadPlot = useCallback(async () => {
    const request = ++loadRequest.current;
    if (!plotId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageLoadError("");

    try {
      const data = await plotService.getById(plotId);
      if (request !== loadRequest.current) return;
      setPlot(data);
    } catch (error) {
      if (request === loadRequest.current) setPageLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [plotId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPlot(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadPlot]);

  const farmName = useMemo(
    () =>
      farms.find((farm) => farm.id === plot?.farmId)
        ?.name ?? "Không xác định",
    [farms, plot?.farmId],
  );

  const hasLinkedData =
    plot !== null &&
    (plot.linkedData.seasons > 0 ||
      plot.linkedData.tasks > 0 ||
      plot.linkedData.cultivationLogs > 0);

  const boundaryLocked =
    plot?.currentSeasonStatus === "active";

  const openEditDialog = () => {
    if (!plot) {
      return;
    }

    setEditForm({
      code: plot.code,
      area: String(plot.area),
    });

    setActionError("");
    setDialog("edit");
  };

  const openBoundaryDialog = () => {
    if (!plot || boundaryLocked) {
      return;
    }

    setEditingBoundary(plot.boundary);
    setActionError("");
    setDialog("boundary");
  };

  const closeDialog = () => {
    if (saving) {
      return;
    }

    setDialog(null);
    setActionError("");
  };

  const handleSaveInformation = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!plot) {
      return;
    }

    const area = Number(editForm.area);

    if (!editForm.code.trim()) {
      setActionError("Vui lòng nhập mã vùng trồng.");
      return;
    }

    if (!Number.isFinite(area) || area <= 0) {
      setActionError(
        "Diện tích phải là một số lớn hơn 0.",
      );
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      const updatedPlot = await plotService.update(
        plot.id,
        {
          code: editForm.code,
          area,
        },
      );

      setPlot(updatedPlot);
      setDialog(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật vùng trồng.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBoundary = async () => {
    if (!plot) {
      return;
    }

    if (editingBoundary.length < 3) {
      setActionError(
        "Ranh giới phải có ít nhất 3 điểm tọa độ.",
      );
      return;
    }

    const calculatedArea =
      calculatePlotArea(editingBoundary);

    setSaving(true);
    setActionError("");

    try {
      const updatedPlot = await plotService.update(
        plot.id,
        {
          boundary: editingBoundary,
          area:
            calculatedArea > 0
              ? calculatedArea
              : plot.area,
        },
      );

      setPlot(updatedPlot);
      setDialog(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật ranh giới.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!plot) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      const updatedPlot =
        await plotService.setStatus(
          plot.id,
          plot.status === "active"
            ? "inactive"
            : "active",
        );

      setPlot(updatedPlot);
      setDialog(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = () => {
    setActionError("");

    setDialog(
      hasLinkedData ? "delete-blocked" : "delete",
    );
  };

  const handleDelete = async () => {
    if (!plot) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await plotService.delete(plot.id);
      navigate("/plots", { replace: true });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Không thể xóa vùng trồng.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (pageLoadError) return <div className="page" role="alert">{pageLoadError} <button type="button" onClick={() => void loadPlot()}>Thử lại</button></div>;

  if (loading) {
    return (
      <div className="page">
        <div className="page-loading">
          Đang tải thông tin vùng trồng...
        </div>
      </div>
    );
  }

  if (!plot) {
    return (
      <div className="page">
        <div className="not-found-card card">
          <MapPinned size={34} />
          <h1>Không tìm thấy vùng trồng</h1>
          <Link className="btn btn-primary" to="/plots">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page plot-detail-page">
      <div className="plot-detail-topbar">
        <Link
          className="back-link"
          to="/plots"
        >
          <ArrowLeft size={18} />
          Vùng trồng
        </Link>

        <div className="plot-detail-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={openEditDialog}
          >
            <Edit3 size={17} />
            Chỉnh sửa
          </button>

          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setActionError("");
              setDialog("status");
            }}
          >
            {plot.status === "active" ? (
              <PauseCircle size={17} />
            ) : (
              <PlayCircle size={17} />
            )}

            {plot.status === "active"
              ? "Ngừng sử dụng"
              : "Hoạt động lại"}
          </button>

          <button
            className="plot-delete-button"
            type="button"
            onClick={openDeleteDialog}
          >
            <Trash2 size={17} />
            Xóa
          </button>
        </div>
      </div>

      <section className="plot-detail-hero card">
        <div className="plot-detail-hero-icon">
          <MapPinned size={27} />
        </div>

        <div className="plot-detail-title">
          <div>
            <h1>{plot.name}</h1>

            <span
              className={`status-badge status-${plot.status}`}
            >
              {plot.status === "active"
                ? "Đang sử dụng"
                : "Ngừng sử dụng"}
            </span>
          </div>

          <p>Mã {plot.code}{plot.cropType ? ` · ${plot.cropType}` : ""}</p>
        </div>
      </section>

      <div className="plot-detail-grid">
        <section className="plot-detail-card card">
          <div className="plot-detail-card-heading">
            <h2>Thông tin vùng trồng</h2>
          </div>

          <div className="plot-information-list">
            <div className="plot-information-item">
              <Building2 size={18} />
              <div>
                <span>Nông trại</span>
                <strong>{farmName}</strong>
              </div>
            </div>

            {plot.cropType && <div className="plot-information-item">
              <Sprout size={18} />
              <div>
                <span>Loại cây trồng</span>
                <strong>{plot.cropType}</strong>
              </div>
            </div>}

            <div className="plot-information-item">
              <Ruler size={18} />
              <div>
                <span>Diện tích</span>
                <strong>{plot.area} ha</strong>
              </div>
            </div>

          </div>
        </section>

        <section className="plot-detail-card card">
          <div className="plot-detail-card-heading">
            <h2>Mùa vụ hiện tại</h2>
          </div>

          {plot.currentSeasonName ? (
            <div className="current-season-card">
              <div className="current-season-icon">
                <CalendarDays size={22} />
              </div>

              <div>
                <strong>
                  {plot.currentSeasonName}
                </strong>

                <span>
                  {plot.currentSeasonStatus === "active"
                    ? "Đang hoạt động"
                    : "Đã lên kế hoạch"}
                </span>
              </div>
            </div>
          ) : (
            <div className="no-current-season">
              <Sprout size={25} />
              <strong>Chưa có mùa vụ</strong>
              <span>
                Vùng trồng hiện chưa có mùa vụ hoạt động.
              </span>
            </div>
          )}

          {boundaryLocked && (
            <div className="boundary-lock-notice">
              <Lock size={17} />

              <span>
                Ranh giới đang được khóa vì vùng trồng có
                mùa vụ hoạt động.
              </span>
            </div>
          )}
        </section>
      </div>

      <section className="plot-boundary-section card">
        <div className="plot-detail-card-heading">
          <div>
            <h2>Ranh giới vùng trồng</h2>
            <p>
              {plot.boundary.length} điểm tọa độ · Diện tích{" "}
              {plot.area} ha
            </p>
          </div>

          <button
            className="btn btn-secondary"
            type="button"
            disabled={boundaryLocked}
            onClick={openBoundaryDialog}
          >
            {boundaryLocked ? (
              <Lock size={17} />
            ) : (
              <Edit3 size={17} />
            )}
            Sửa ranh giới
          </button>
        </div>

        <PlotBoundaryPreview points={plot.boundary} />

        <div className="plot-coordinate-list">
          {plot.boundary.map((point, index) => (
            <div
              className="plot-coordinate-row"
              key={`${point.latitude}-${point.longitude}-${index}`}
            >
              <span>Điểm {index + 1}</span>
              <code>{point.latitude.toFixed(6)}</code>
              <code>{point.longitude.toFixed(6)}</code>
            </div>
          ))}
        </div>
      </section>

      {dialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <div
            className={`app-modal ${
              dialog === "boundary"
                ? "app-modal-large"
                : ""
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="app-modal-header">
              <div>
                <h2>
                  {dialog === "edit" &&
                    "Chỉnh sửa vùng trồng"}
                  {dialog === "boundary" &&
                    "Chỉnh sửa ranh giới"}
                  {dialog === "status" &&
                    (plot.status === "active"
                      ? "Ngừng sử dụng vùng trồng?"
                      : "Hoạt động lại vùng trồng?")}
                  {dialog === "delete" &&
                    "Xóa vùng trồng?"}
                  {dialog === "delete-blocked" &&
                    "Không thể xóa vùng trồng"}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeDialog}
              >
                <X size={20} />
              </button>
            </div>

            {dialog === "edit" && (
              <form
                className="plot-edit-form"
                onSubmit={handleSaveInformation}
              >
                <div className="form-grid">
                  <label className="form-field">
                    <span>Mã vùng trồng</span>
                    <input
                      value={editForm.code}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className="form-field">
                    <span>Diện tích (ha)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.area}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          area: event.target.value,
                        }))
                      }
                    />
                  </label>

                </div>

                {actionError && (
                  <div className="form-error-block">
                    {actionError}
                  </div>
                )}

                <div className="app-modal-footer">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={closeDialog}
                  >
                    Hủy
                  </button>

                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={saving}
                  >
                    <Save size={17} />
                    {saving
                      ? "Đang lưu..."
                      : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}

            {dialog === "boundary" && (
              <>
                <div className="app-modal-body">
                  <PlotBoundaryEditor
                    points={editingBoundary}
                    onChange={setEditingBoundary}
                  />

                  {actionError && (
                    <div className="form-error-block">
                      {actionError}
                    </div>
                  )}
                </div>

                <div className="app-modal-footer">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={closeDialog}
                  >
                    Hủy
                  </button>

                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={saving}
                    onClick={handleSaveBoundary}
                  >
                    <Save size={17} />
                    {saving
                      ? "Đang lưu..."
                      : "Lưu ranh giới"}
                  </button>
                </div>
              </>
            )}

            {dialog === "status" && (
              <>
                <div className="app-modal-body">
                  <p>
                    {plot.status === "active"
                      ? "Vùng trồng sẽ không được sử dụng cho mùa vụ mới. Dữ liệu cũ vẫn được giữ nguyên."
                      : "Vùng trồng sẽ được đưa trở lại danh sách có thể sử dụng."}
                  </p>

                  {actionError && (
                    <div className="form-error-block">
                      {actionError}
                    </div>
                  )}
                </div>

                <div className="app-modal-footer">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={closeDialog}
                  >
                    Hủy
                  </button>

                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={saving}
                    onClick={handleChangeStatus}
                  >
                    {plot.status === "active" ? (
                      <PauseCircle size={17} />
                    ) : (
                      <PlayCircle size={17} />
                    )}

                    {saving
                      ? "Đang xử lý..."
                      : plot.status === "active"
                        ? "Ngừng sử dụng"
                        : "Hoạt động lại"}
                  </button>
                </div>
              </>
            )}

            {dialog === "delete-blocked" && (
              <>
                <div className="app-modal-body">
                  <div className="blocked-delete-message">
                    <Lock size={22} />

                    <div>
                      <strong>
                        Vùng trồng đang có dữ liệu liên kết
                      </strong>

                      <p>
                        {plot.linkedData.seasons} mùa vụ,{" "}
                        {plot.linkedData.tasks} công việc và{" "}
                        {plot.linkedData.cultivationLogs} nhật
                        ký canh tác.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="app-modal-footer">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={closeDialog}
                  >
                    <CheckCircle2 size={17} />
                    Đã hiểu
                  </button>
                </div>
              </>
            )}

            {dialog === "delete" && (
              <>
                <div className="app-modal-body">
                  <p>
                    Vùng trồng <strong>{plot.name}</strong>{" "}
                    sẽ bị xóa vĩnh viễn. Hành động này không
                    thể hoàn tác.
                  </p>

                  {actionError && (
                    <div className="form-error-block">
                      {actionError}
                    </div>
                  )}
                </div>

                <div className="app-modal-footer">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={closeDialog}
                  >
                    Hủy
                  </button>

                  <button
                    className="plot-confirm-delete"
                    type="button"
                    disabled={saving}
                    onClick={handleDelete}
                  >
                    <Trash2 size={17} />
                    {saving ? "Đang xóa..." : "Xóa vùng trồng"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlotDetailPage;
