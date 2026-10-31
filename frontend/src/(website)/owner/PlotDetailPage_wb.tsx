import BackButton from "../../components/owner/BackButton_wb";
import "../../styles/boundary_detail_wb.css";
import GeographicMap from "../../components/owner/GeographicMap_wb";
import "../../styles/plots_wb.css";
import "../../styles/plot_detail_wb.css";
import {
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
  useNavigate,
  useParams,
} from "react-router-dom";
import PlotBoundaryEditor from "../../components/owner/PlotBoundaryEditor_wb";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { plotService } from "../../sevices/plotService_wb";
import type {
  BoundaryPoint,
  Plot,
} from "../../features/owner/plot_wb";
import { calculatePlotArea, getFarmPolygon, plotBoundaryError } from "../../utils/geometry_wb";

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
  status: Plot["status"];
};

import type { Farm } from "../../features/owner/farm_wb";

function PlotBoundaryPreview({
  points,
  farm,
}: {
  points: BoundaryPoint[];
  farm?: Farm;
}) {
  const polygon = getFarmPolygon(farm);
  return <>
    <GeographicMap label="Vùng trồng và ranh giới nông trại" points={points}
      regions={farm && polygon.length ? [{ id: farm.id, kind: "farm", label: farm.name, points: polygon.map((p, i) => ({ ...p, label: `NT ${i + 1}` })) }] : []} />
  </>;
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
      status: "active",
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

  const openEditDialog = () => {
    if (!plot) {
      return;
    }

    setEditForm({
      code: plot.code,
      area: String(plot.area),
      status: plot.status,
    });

    setActionError("");
    setDialog("edit");
  };

  const openBoundaryDialog = () => {
    if (!plot) {
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

    if (!plot || saving) {
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
          status: editForm.status,
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
    if (!plot || saving) {
      return;
    }

    const boundaryError = plotBoundaryError(editingBoundary, farms.find(farm => farm.id === plot.farmId), true);
    if (boundaryError) {
      setActionError(boundaryError);
      return;
    }

    const calculatedArea =
      calculatePlotArea(editingBoundary);

    setActionError("");
    setSaving(true);
    try {
      const updated = await plotService.update(plot.id, { boundary: editingBoundary, area: calculatedArea });
      setPlot(updated);
      setDialog(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không thể lưu ranh giới.");
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
          <div className="page-title-with-back"><BackButton to="/plots" label="Quay lại danh sách vùng trồng" /><h1>Không tìm thấy vùng trồng</h1></div>

        </div>
      </div>
    );
  }

  return (
    <div className="page plot-detail-page">
      <div className="plot-detail-topbar">
        <BackButton to="/plots" label="Quay lại danh sách vùng trồng" />

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
        <div className="plot-detail-hero-icon"><MapPinned size={27} /></div>
        

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
            onClick={openBoundaryDialog}
          >
            <Edit3 size={17} />
            Sửa ranh giới
          </button>
        </div>

        <div className="boundary-detail-summary">
          <div><span>Phương thức</span><strong>Bản đồ GPS</strong></div>
          <div><span>Diện tích</span><strong>{plot.area.toLocaleString("vi-VN")} ha</strong></div>
          <div><span>Số điểm tọa độ</span><strong>{plot.boundary.length} điểm</strong></div>
        </div>
        <div className="boundary-detail-layout">
          <PlotBoundaryPreview points={plot.boundary} farm={farms.find(farm => farm.id === plot.farmId)} />
          <div className="boundary-detail-points" role="region" aria-label="Tọa độ ranh giới vùng trồng" tabIndex={0}>
            <table>
              <thead><tr><th>STT</th><th>Vĩ độ</th><th>Kinh độ</th></tr></thead>
              <tbody>{plot.boundary.map((point, index) => (
                <tr key={`${point.latitude}-${point.longitude}-${index}`}><td>GPS {index + 1}</td><td>{point.latitude.toFixed(6)}</td><td>{point.longitude.toFixed(6)}</td></tr>
              ))}</tbody>
            </table>
          </div>
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
                ? "app-modal-large plot-editor-modal"
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
                disabled={saving}
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
                      maxLength={50}
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
                    <span>Trạng thái hoạt động</span>
                    <select value={editForm.status} onChange={(event) => setEditForm(current => ({ ...current, status: event.target.value as Plot["status"] }))}>
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
                    </select>
                  </label>

                  <label className="form-field">
                    <span>Nông trại</span>
                    <input readOnly value={farmName} />
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
                    disabled={saving}
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
                  {plot.currentSeasonId && <p className="form-error-block" role="status">Không thể sửa ranh giới khi vùng trồng đang có mùa vụ hoạt động.</p>}
                  <div inert={saving}>
                  <PlotBoundaryEditor
                    farm={farms.find(farm => farm.id === plot.farmId)}
                    points={editingBoundary}
                    disabled={Boolean(plot.currentSeasonId)}
                    onChange={setEditingBoundary}
                    summary={<div className="calculated-area"><span>Diện tích từ ranh giới</span><strong>{calculatePlotArea(editingBoundary).toLocaleString("vi-VN")} ha</strong></div>}
                  />
                  </div>

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
                    disabled={saving || Boolean(plot.currentSeasonId) || calculatePlotArea(editingBoundary) <= 0}
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
