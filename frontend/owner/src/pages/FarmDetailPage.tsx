import "../styles/farms.css";
import "../styles/farm-detail.css";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPinned,
  PauseCircle,
  Pencil,
  PlayCircle,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  FormEvent,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import FarmBoundaryEditor from "../components/farms/FarmBoundaryEditor";
import { farmService } from "../services/farmService";
import {
  farmStatusLabels,
} from "../types/farm";
import type {
  Farm,
  FarmBoundary,
  FarmFormData,
} from "../types/farm";

type DetailAction =
  | "suspend"
  | "activate"
  | "delete"
  | null;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN").format(
    new Date(value),
  );

function FarmDetailPage() {
  const { farmId } = useParams();
  const navigate = useNavigate();

  const [farm, setFarm] = useState<Farm | null>(null);
  const [pageLoadError, setPageLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [editForm, setEditForm] =
    useState<FarmFormData | null>(null);
  const [boundaryDraft, setBoundaryDraft] =
    useState<FarmBoundary | null>(null);
  const [editingBoundary, setEditingBoundary] =
    useState(false);
  const [pendingAction, setPendingAction] =
    useState<DetailAction>(null);

  useEffect(() => {
    let mounted = true;

    const loadFarm = async () => {
      if (!farmId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setPageLoadError("");
      try {
        const data = await farmService.getById(farmId);
        if (mounted) setFarm(data);
      } catch (error) {
        if (mounted) setPageLoadError(error instanceof Error ? error.message : "Không thể tải nông trại.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const timer = window.setTimeout(() => void loadFarm(), 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [farmId]);

  const polygonPoints = useMemo(() => {
    if (!farm?.boundary?.points.length) {
      return "";
    }

    const points = farm.boundary.points;
    const xValues = points.map((point) => point.y);
    const yValues = points.map((point) => point.x);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    return points
      .map((point) => {
        const x = 10 + ((point.y - minX) / rangeX) * 80;
        const y =
          90 - ((point.x - minY) / rangeY) * 80;

        return `${x},${y}`;
      })
      .join(" ");
  }, [farm]);

  const openInformationEditor = () => {
    if (!farm) {
      return;
    }

    setEditForm({
      name: farm.name,
      address: farm.address,
      province: farm.province,
      district: farm.district,
      estimatedArea: farm.estimatedArea,
      status: farm.status,
      boundary: farm.boundary,
    });
  };

  const saveInformation = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!farm || !editForm) {
      return;
    }

    if (
      !editForm.name.trim() ||
      !editForm.address.trim() ||
      !editForm.province.trim() ||
      !editForm.district.trim()
    ) {
      setNotice("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    const updatedFarm = await farmService.update(
      farm.id,
      editForm,
    );

    if (updatedFarm) {
      setFarm(updatedFarm);
      setEditForm(null);
      setNotice("Đã cập nhật thông tin nông trại.");
    }
  };

  const openBoundaryEditor = () => {
    if (!farm) {
      return;
    }

    setBoundaryDraft(farm.boundary);
    setEditingBoundary(true);
  };

  const saveBoundary = async () => {
    if (!farm || !boundaryDraft?.isValid) {
      setNotice(
        "Ranh giới cần ít nhất 3 điểm hợp lệ.",
      );
      return;
    }

    const updatedFarm = await farmService.update(
      farm.id,
      {
        boundary: boundaryDraft,
        estimatedArea: boundaryDraft.area,
        status:
          farm.status === "incomplete"
            ? "active"
            : farm.status,
      },
    );

    if (updatedFarm) {
      setFarm(updatedFarm);
      setEditingBoundary(false);
      setNotice("Đã cập nhật ranh giới nông trại.");
    }
  };

  const confirmAction = async () => {
    if (!farm || !pendingAction) {
      return;
    }

    if (pendingAction === "delete") {
      const result = await farmService.delete(farm.id);

      if (result.success) {
        navigate("/farms");
        return;
      }

      setNotice(result.message);
      setPendingAction(null);
      return;
    }

    const updatedFarm =
      await farmService.changeStatus(
        farm.id,
        pendingAction === "suspend"
          ? "suspended"
          : "active",
      );

    if (updatedFarm) {
      setFarm(updatedFarm);

      setNotice(
        pendingAction === "suspend"
          ? "Đã tạm ngưng nông trại."
          : updatedFarm.status === "active"
            ? "Nông trại đã hoạt động trở lại."
            : "Cần bổ sung ranh giới trước khi hoạt động.",
      );
    }

    setPendingAction(null);
  };

  if (pageLoadError) return <div className="page" role="alert">{pageLoadError}</div>;

  if (loading) {
    return (
      <div className="page farm-detail-state">
        Đang tải thông tin nông trại...
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="page farm-detail-state">
        <MapPinned size={36} />

        <h1>Không tìm thấy nông trại</h1>

        <button
          className="btn btn-primary"
          type="button"
          onClick={() => navigate("/farms")}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const actionContent =
    pendingAction === "suspend"
      ? {
          title: "Tạm ngưng nông trại?",
          description:
            "Dữ liệu hiện có vẫn được bảo lưu nguyên vẹn.",
          button: "Tạm ngưng",
        }
      : pendingAction === "activate"
        ? {
            title: "Hoạt động lại nông trại?",
            description:
              "Nông trại sẽ được kích hoạt nếu đã có ranh giới.",
            button: "Hoạt động lại",
          }
        : {
            title: "Xóa nông trại?",
            description:
              "Nông trại có dữ liệu liên kết sẽ không thể xóa.",
            button: "Xóa nông trại",
          };

  return (
    <div className="page farm-detail-page">
      <button
        className="detail-back-button"
        type="button"
        onClick={() => navigate("/farms")}
      >
        <ArrowLeft size={18} />
        Danh sách nông trại
      </button>

      <div className="farm-detail-heading">
        <div>
          <div className="farm-detail-title">
            <h1>{farm.name}</h1>

            <span
              className={`status-badge status-${farm.status}`}
            >
              {farmStatusLabels[farm.status]}
            </span>
          </div>

          <p>
            {farm.code} · {farm.address}
          </p>
        </div>

        <div className="farm-detail-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={openInformationEditor}
          >
            <Pencil size={17} />
            Chỉnh sửa
          </button>

          {farm.status === "active" && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() =>
                setPendingAction("suspend")
              }
            >
              <PauseCircle size={17} />
              Tạm ngưng
            </button>
          )}

          {farm.status === "suspended" && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() =>
                setPendingAction("activate")
              }
            >
              <PlayCircle size={17} />
              Hoạt động lại
            </button>
          )}

          <button
            className="detail-delete-button"
            type="button"
            aria-label="Xóa nông trại"
            title="Xóa nông trại"
            onClick={() => setPendingAction("delete")}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {notice && (
        <div className="farm-notice" role="status">
          <span>{notice}</span>

          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </button>
        </div>
      )}

      <div className="farm-detail-grid">
        <section className="detail-card card">
          <div className="detail-card-heading">
            <div>
              <h2>Thông tin nông trại</h2>
              <p>Thông tin hành chính và chủ sở hữu.</p>
            </div>

            <CheckCircle2 size={20} />
          </div>

          <dl className="farm-information-list">
            <div>
              <dt>Mã nông trại</dt>
              <dd>{farm.code}</dd>
            </div>

            <div>
              <dt>Diện tích</dt>
              <dd>
                {farm.estimatedArea > 0
                  ? `${farm.estimatedArea.toLocaleString("vi-VN")} ha (ước tính từ ranh giới)`
                  : "Chưa xác định từ ranh giới"}
              </dd>
            </div>

            <div className="information-full">
              <dt>Địa chỉ</dt>
              <dd>{farm.address}</dd>
            </div>

            <div>
              <dt>Tỉnh/Thành phố</dt>
              <dd>{farm.province}</dd>
            </div>

            <div>
              <dt>Huyện/Thành phố</dt>
              <dd>{farm.district}</dd>
            </div>

            <div>
              <dt>Chủ sở hữu</dt>
              <dd>{farm.owner.name}</dd>
            </div>

            <div>
              <dt>Số điện thoại</dt>
              <dd>{farm.owner.phone}</dd>
            </div>

            <div className="information-full">
              <dt>Email</dt>
              <dd>{farm.owner.email}</dd>
            </div>

            <div>
              <dt>Ngày thành lập</dt>
              <dd>{formatDate(farm.establishedAt)}</dd>
            </div>

            <div>
              <dt>Cập nhật gần nhất</dt>
              <dd>{formatDate(farm.updatedAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="detail-card card">
          <div className="detail-card-heading">
            <div>
              <h2>Ranh giới nông trại</h2>
              <p>
                Tọa độ và diện tích ranh giới đã xác định.
              </p>
            </div>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={openBoundaryEditor}
            >
              <Pencil size={16} />
              {farm.boundary
                ? "Chỉnh sửa"
                : "Bổ sung"}
            </button>
          </div>

          {farm.boundary?.isValid ? (
            <>
              <div className="boundary-summary">
                <div>
                  <span>Phương thức</span>
                  <strong>
                    {farm.boundary.method === "vn2000"
                      ? "Tọa độ VN-2000"
                      : "Bản đồ GPS"}
                  </strong>
                </div>

                <div>
                  <span>Diện tích đo</span>
                  <strong>
                    {farm.boundary.area.toLocaleString(
                      "vi-VN",
                    )}{" "}
                    ha
                  </strong>
                </div>

                <div>
                  <span>Chu vi</span>
                  <strong>
                    {farm.boundary.perimeter.toLocaleString(
                      "vi-VN",
                    )}{" "}
                    m
                  </strong>
                </div>
              </div>

              <div className="boundary-preview">
                {polygonPoints ? (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-label="Ranh giới nông trại"
                  >
                    <defs>
                      <pattern
                        id="detail-grid"
                        width="10"
                        height="10"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 10 0 L 0 0 0 10"
                          fill="none"
                          stroke="#d2ddd4"
                          strokeWidth="0.35"
                        />
                      </pattern>
                    </defs>

                    <rect
                      width="100"
                      height="100"
                      fill="url(#detail-grid)"
                    />

                    <polygon
                      points={polygonPoints}
                      fill="rgba(22, 148, 71, 0.22)"
                      stroke="#087333"
                      strokeWidth="1.2"
                    />
                  </svg>
                ) : (
                  <span>
                    Ranh giới đã được đồng bộ từ bản đồ GPS.
                  </span>
                )}
              </div>

              {farm.boundary.points.length > 0 && (
                <div className="table-wrapper">
                  <table className="coordinate-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Tọa độ X</th>
                        <th>Tọa độ Y</th>
                        <th>Ghi chú</th>
                      </tr>
                    </thead>

                    <tbody>
                      {farm.boundary.points.map(
                        (point) => (
                          <tr key={point.id}>
                            <td>{point.id}</td>
                            <td>{point.x}</td>
                            <td>{point.y}</td>
                            <td>{point.note}</td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="boundary-empty">
              <MapPinned size={31} />
              <strong>Chưa có ranh giới</strong>
              <span>
                Bổ sung ranh giới để hoàn thiện hồ sơ.
              </span>

              <button
                className="btn btn-primary"
                type="button"
                onClick={openBoundaryEditor}
              >
                Bổ sung ranh giới
              </button>
            </div>
          )}
        </section>
      </div>

      {editForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setEditForm(null)}
        >
          <div
            className="farm-detail-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="detail-modal-heading">
              <div>
                <h2>Chỉnh sửa nông trại</h2>
                <p>Cập nhật thông tin hành chính.</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setEditForm(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="detail-edit-form"
              onSubmit={(event) =>
                void saveInformation(event)
              }
            >
              <label className="form-field-full">
                <span>Tên nông trại *</span>
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label className="form-field-full">
                <span>Địa chỉ *</span>
                <input
                  className="input"
                  value={editForm.address}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      address: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Tỉnh/Thành phố *</span>
                <input
                  className="input"
                  value={editForm.province}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      province: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Huyện/Thành phố *</span>
                <input
                  className="input"
                  value={editForm.district}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      district: event.target.value,
                    })
                  }
                />
              </label>

              <div className="read-only-field">
                <span>Chủ sở hữu</span>
                <strong>{farm.owner.name}</strong>
                <small>Không thể thay đổi</small>
              </div>

              <div className="detail-modal-actions form-field-full">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setEditForm(null)}
                >
                  Hủy
                </button>

                <button
                  className="btn btn-primary"
                  type="submit"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingBoundary && (
        <div
          className="modal-backdrop boundary-modal-backdrop"
          role="presentation"
        >
          <div
            className="boundary-edit-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="detail-modal-heading">
              <div>
                <h2>Chỉnh sửa ranh giới</h2>
                <p>
                  Nhập tọa độ hoặc chỉnh sửa trên bản đồ.
                </p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={() =>
                  setEditingBoundary(false)
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="boundary-edit-content">
              <FarmBoundaryEditor
                boundary={boundaryDraft}
                onChange={setBoundaryDraft}
              />
            </div>

            <div className="detail-modal-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() =>
                  setEditingBoundary(false)
                }
              >
                Hủy
              </button>

              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void saveBoundary()}
              >
                Lưu ranh giới
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingAction && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setPendingAction(null)}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div
              className={
                pendingAction === "delete"
                  ? "confirm-icon confirm-icon-danger"
                  : "confirm-icon confirm-icon-warning"
              }
            >
              <AlertTriangle size={24} />
            </div>

            <h2>{actionContent.title}</h2>

            <p>
              <strong>{farm.name}</strong>
              <br />
              {actionContent.description}
            </p>

            <div className="confirm-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setPendingAction(null)}
              >
                Hủy
              </button>

              <button
                className={
                  pendingAction === "delete"
                    ? "btn btn-danger"
                    : "btn btn-primary"
                }
                type="button"
                onClick={() => void confirmAction()}
              >
                {actionContent.button}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FarmDetailPage;