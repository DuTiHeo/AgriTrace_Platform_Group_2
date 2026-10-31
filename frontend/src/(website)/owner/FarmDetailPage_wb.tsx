import BackButton from "../../components/owner/BackButton_wb";
import "../../styles/boundary_detail_wb.css";
import CreationReview from "../../components/owner/CreationReview_wb";
import GeographicMap from "../../components/owner/GeographicMap_wb";
import FarmBoundaryEditModal from "../../components/owner/FarmBoundaryEditModal_wb";
import "../../styles/farms_wb.css";
import "../../styles/farm_detail_wb.css";
import {
  AlertTriangle,
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
  useState,
} from "react";
import type {
  FormEvent,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { farmService } from "../../sevices/farmService_wb";
import {
  farmStatusLabels,
} from "../../features/owner/farm_wb";
import type {
  Farm,
  FarmFormData,
} from "../../features/owner/farm_wb";

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
  const [editError, setEditError] = useState("");
  const [savingInformation, setSavingInformation] = useState(false);
  const [editingBoundary, setEditingBoundary] = useState(false);
  const [editForm, setEditForm] =
    useState<Omit<FarmFormData, "boundary" | "estimatedArea"> | null>(null);
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

  const openInformationEditor = () => {
    if (!farm) {
      return;
    }

    setEditError("");
    setEditForm({
      name: farm.name,
      address: farm.address,
      province: farm.province,
      district: farm.district,
      status: farm.status,
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
      setEditError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (savingInformation) return;
    setSavingInformation(true);
    setEditError("");
    try {
      const updatedFarm = await farmService.update(farm.id, editForm);
      if (!updatedFarm) throw new Error("Không tìm thấy nông trại.");
      setFarm(updatedFarm);
      setEditForm(null);
      setNotice("Đã cập nhật thông tin nông trại.");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Không thể lưu thay đổi.");
    } finally {
      setSavingInformation(false);
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

        <div className="page-title-with-back"><BackButton to="/farms" label="Quay lại danh sách nông trại" /><h1>Không tìm thấy nông trại</h1></div>


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

      <div className="farm-detail-heading">
        <div className="farm-heading-identity">
          <BackButton to="/farms" label="Quay lại danh sách nông trại" />
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

          <CreationReview sections={[
            {
              title: "Thông tin chung",
              items: [
                { label: "Mã nông trại", value: farm.code },
                { label: "Diện tích ước tính", value: farm.estimatedArea > 0 ? `${farm.estimatedArea.toLocaleString("vi-VN")} ha` : "Chưa xác định" },
                { label: "Địa chỉ", value: farm.address || "Chưa cung cấp" },
              ],
            },
            {
              title: "Chủ sở hữu",
              items: [
                { label: "Họ và tên", value: farm.owner.name || "Chưa cung cấp" },
                { label: "Số điện thoại", value: farm.owner.phone || "Chưa cung cấp" },
                { label: "Email", value: farm.owner.email || "Chưa cung cấp" },
              ],
            },
          ]} />
          <div className="farm-detail-metadata">
            <span>Ngày thành lập <strong>{formatDate(farm.establishedAt)}</strong></span>
            <span>Cập nhật gần nhất <strong>{formatDate(farm.updatedAt)}</strong></span>
          </div>
        </section>

        <section className="detail-card card">
          <div className="detail-card-heading">
            <div>
              <h2>Ranh giới nông trại</h2>
              <p>
                Tọa độ và diện tích ranh giới đã xác định.
              </p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => setEditingBoundary(true)}>
              <Pencil size={16} />Chỉnh sửa
            </button>
          </div>

          {farm.boundary?.isValid ? (
            <>
              <div className="boundary-detail-summary">
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

              <div className="boundary-detail-layout">
              {farm.boundary.method === "map" ? (
                <GeographicMap label="Ranh giới nông trại" pointsKind="farm" points={farm.boundary.points.map(point => ({ latitude: point.x, longitude: point.y }))} />
              ) : (
                <p>Tọa độ VN-2000 cần được chuyển sang WGS84 để hiển thị đúng vị trí trên bản đồ.</p>
              )}

              {farm.boundary.points.length > 0 && (
                <div className="boundary-detail-points" role="region" aria-label="Tọa độ ranh giới nông trại" tabIndex={0}>
                  <table className="boundary-coordinate-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>{farm.boundary.method === "map" ? "Vĩ độ" : "Tọa độ X"}</th>
                        <th>{farm.boundary.method === "map" ? "Kinh độ" : "Tọa độ Y"}</th>
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
              </div>
            </>
          ) : (
            <div className="boundary-empty">
              <MapPinned size={31} />
              <strong>Chưa có ranh giới</strong>
              <span>
                Bổ sung ranh giới để hoàn thiện hồ sơ.
              </span>


            </div>
          )}
        </section>
      </div>

      {editingBoundary && <FarmBoundaryEditModal farm={farm} onClose={() => setEditingBoundary(false)} onSaved={(updated) => {
        setFarm(updated);
        setNotice("Đã cập nhật ranh giới nông trại.");
      }} />}

      {editForm && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => { if (!savingInformation) setEditForm(null); }}
        >
          <div
            className="farm-detail-modal farm-information-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="farm-edit-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="detail-modal-heading">
              <div>
                <h2 id="farm-edit-title">Chỉnh sửa nông trại</h2>
                <p>Cập nhật thông tin và trạng thái nông trại.</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                disabled={savingInformation}
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
              <label>
                <span>Tên nông trại *</span>
                <input
                  className="input"
                  value={editForm.name}
                  maxLength={200}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Trạng thái hoạt động</span>
                <select className="input" value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as Farm["status"] })}>
                  <option value="active">Đang hoạt động</option>
                  <option value="incomplete">Cần hoàn thiện</option>
                  <option value="suspended">Tạm ngưng</option>
                </select>
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
                <span>Xã/Phường *</span>
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
                <span>Mã nông trại</span>
                <strong>{farm.code}</strong>
              </div>

              <div className="read-only-field">
                <span>Chủ sở hữu</span>
                <strong>{farm.owner.name}</strong>
                <small>Không thể thay đổi</small>
              </div>



              {editError && <div className="form-error-block form-field-full" role="alert">{editError}</div>}

              <div className="detail-modal-actions form-field-full">
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={savingInformation}
                  onClick={() => setEditForm(null)}
                >
                  Hủy
                </button>

                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={savingInformation}
                >
                  {savingInformation ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
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
