import "../styles/farms.css";
import {
  AlertTriangle,
  Eye,
  MapPin,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Sprout,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { farmService } from "../services/farmService";
import {
  farmStatusLabels,
} from "../types/farm";
import type {
  Farm,
  FarmStatus,
} from "../types/farm";

type StatusFilter = "all" | FarmStatus;
type FarmAction = "suspend" | "activate" | "delete";

type PendingAction = {
  type: FarmAction;
  farm: Farm;
};

function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] =
    useState<PendingAction | null>(null);
  const [notice, setNotice] = useState("");

  const loadFarms = useCallback(async () => {
    setLoading(true);

    try {
      const data = await farmService.getAll();
      setFarms(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFarms(), 0);
    return () => window.clearTimeout(timer);
  }, [loadFarms]);

  const filteredFarms = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return farms.filter((farm) => {
      const matchesSearch =
        !keyword ||
        `${farm.name} ${farm.code} ${farm.address}`
          .toLowerCase()
          .includes(keyword);

      const matchesStatus =
        statusFilter === "all" ||
        farm.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [farms, search, statusFilter]);

  const closeConfirmModal = () => {
    setPendingAction(null);
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const { farm, type } = pendingAction;

    if (type === "delete") {
      const result = await farmService.delete(farm.id);
      setNotice(result.message);

      if (result.success) {
        await loadFarms();
      }

      closeConfirmModal();
      return;
    }

    const nextStatus: FarmStatus =
      type === "suspend" ? "suspended" : "active";

    const updatedFarm = await farmService.changeStatus(
      farm.id,
      nextStatus,
    );

    if (updatedFarm) {
      setNotice(
        type === "suspend"
          ? "Đã tạm ngưng nông trại."
          : updatedFarm.status === "active"
            ? "Nông trại đã hoạt động trở lại."
            : "Cần bổ sung ranh giới trước khi hoạt động.",
      );

      await loadFarms();
    }

    closeConfirmModal();
  };

  const getConfirmContent = () => {
    if (!pendingAction) {
      return {
        title: "",
        description: "",
        confirmText: "",
      };
    }

    if (pendingAction.type === "suspend") {
      return {
        title: "Tạm ngưng nông trại?",
        description:
          "Dữ liệu hiện có vẫn được bảo lưu. Nông trại có thể hoạt động lại bất kỳ lúc nào.",
        confirmText: "Tạm ngưng",
      };
    }

    if (pendingAction.type === "activate") {
      return {
        title: "Hoạt động lại nông trại?",
        description:
          "Nông trại sẽ được chuyển về trạng thái hoạt động nếu đã có ranh giới hợp lệ.",
        confirmText: "Hoạt động lại",
      };
    }

    return {
      title: "Xóa nông trại?",
      description:
        "Chỉ nông trại chưa có dữ liệu liên kết mới được phép xóa.",
      confirmText: "Xóa nông trại",
    };
  };

  const confirmContent = getConfirmContent();

  return (
    <div className="page farms-page">
      <div className="page-heading">
        <div>
          <h1>Nông trại</h1>
          <p>Quản lý hồ sơ và trạng thái các nông trại.</p>
        </div>

        <Link className="btn btn-primary" to="/farms/new">
          <Plus size={18} />
          Thêm nông trại
        </Link>
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

      <section className="farm-list-card card">
        <div className="farm-toolbar">
          <div className="farm-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Tìm theo tên, mã hoặc địa chỉ"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <div className="farm-filter-group">
            <select
              className="farm-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as StatusFilter,
                )
              }
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="incomplete">
                Cần hoàn thiện
              </option>
              <option value="suspended">Tạm ngưng</option>
            </select>

            <span className="farm-result-count">
              {filteredFarms.length} nông trại
            </span>
          </div>
        </div>

        {loading ? (
          <div className="farm-loading">
            Đang tải danh sách nông trại...
          </div>
        ) : filteredFarms.length > 0 ? (
          <div className="table-wrapper">
            <table className="farm-table">
              <thead>
                <tr>
                  <th>Nông trại</th>
                  <th>Địa chỉ</th>
                  <th>Diện tích</th>
                  <th>Ranh giới</th>
                  <th>Trạng thái</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>

              <tbody>
                {filteredFarms.map((farm) => (
                  <tr key={farm.id}>
                    <td>
                      <Link
                        className="farm-name-cell"
                        to={`/farms/${farm.id}`}
                      >
                        <div className="farm-icon">
                          <Sprout size={19} />
                        </div>

                        <div>
                          <strong>{farm.name}</strong>
                          <span>{farm.code}</span>
                        </div>
                      </Link>
                    </td>

                    <td>
                      <div className="farm-address">
                        <MapPin size={15} />
                        <span>{farm.address}</span>
                      </div>
                    </td>

                    <td>
                      {farm.estimatedArea > 0
                        ? `${farm.estimatedArea.toLocaleString("vi-VN")} ha (ước tính)`
                        : "Chưa đo"}
                    </td>

                    <td>
                      {farm.boundary?.isValid ? (
                        <span className="boundary-status boundary-valid">
                          Đã xác định
                        </span>
                      ) : (
                        <span className="boundary-status boundary-missing">
                          Chưa có
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${farm.status}`}
                      >
                        {farmStatusLabels[farm.status]}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">
                        <Link
                          to={`/farms/${farm.id}`}
                          aria-label={`Xem ${farm.name}`}
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </Link>

                        {farm.status === "active" && (
                          <button
                            type="button"
                            aria-label={`Tạm ngưng ${farm.name}`}
                            title="Tạm ngưng"
                            onClick={() =>
                              setPendingAction({
                                type: "suspend",
                                farm,
                              })
                            }
                          >
                            <PauseCircle size={16} />
                          </button>
                        )}

                        {farm.status === "suspended" && (
                          <button
                            type="button"
                            aria-label={`Hoạt động lại ${farm.name}`}
                            title="Hoạt động lại"
                            onClick={() =>
                              setPendingAction({
                                type: "activate",
                                farm,
                              })
                            }
                          >
                            <PlayCircle size={16} />
                          </button>
                        )}

                        <button
                          className="danger-action"
                          type="button"
                          aria-label={`Xóa ${farm.name}`}
                          title="Xóa"
                          onClick={() =>
                            setPendingAction({
                              type: "delete",
                              farm,
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="farm-empty">
            <Search size={30} />
            <strong>Không tìm thấy nông trại</strong>
            <span>
              Thử thay đổi từ khóa hoặc trạng thái lọc.
            </span>
          </div>
        )}
      </section>

      {pendingAction && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={closeConfirmModal}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              className={
                pendingAction.type === "delete"
                  ? "confirm-icon confirm-icon-danger"
                  : "confirm-icon confirm-icon-warning"
              }
            >
              <AlertTriangle size={24} />
            </div>

            <h2 id="confirm-modal-title">
              {confirmContent.title}
            </h2>

            <p>
              <strong>{pendingAction.farm.name}</strong>
              <br />
              {confirmContent.description}
            </p>

            <div className="confirm-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeConfirmModal}
              >
                Hủy
              </button>

              <button
                className={
                  pendingAction.type === "delete"
                    ? "btn btn-danger"
                    : "btn btn-primary"
                }
                type="button"
                onClick={() => void confirmAction()}
              >
                {confirmContent.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FarmsPage;
