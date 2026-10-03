import "../styles/personnel-form.css";
import "../styles/personnel.css";
import "../styles/personnel-detail.css";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CircleAlert,
  Edit3,
  History,
  LoaderCircle,
  Lock,
  LockOpen,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import {
  changePersonnelRole,
  getPersonnelById,
  lockPersonnel,
  transferPersonnel,
  unlockPersonnel,
  updatePersonnel,
} from "../services/personnelService";
import {
  assignTeamLeader,
  getTeamList,
  removeTeamLeader,
} from "../services/teamService";
import type {
  Personnel,
  PersonnelRole,
  UpdatePersonnelInput,
} from "../types/personnel";
import type { TeamSummary } from "../types/team";

type OpenModal =
  | "edit"
  | "assignment"
  | "lock"
  | null;

const roleLabels: Record<PersonnelRole, string> = {
  worker: "Công nhân",
  leader: "Tổ trưởng",
};

const formatDate = (
  value: string | null,
  includeTime = false,
) => {
  if (!value) {
    return "Chưa có";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
};

function PersonnelDetailPage() {
  const { personnelId } = useParams();
  const { farms } = useFarmContext();

  const [personnel, setPersonnel] =
    useState<Personnel | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [operationError, setOperationError] =
    useState("");
  const [openModal, setOpenModal] =
    useState<OpenModal>(null);

  const [editForm, setEditForm] =
    useState<UpdatePersonnelInput>({
      fullName: "",
      phone: "",
      citizenId: "",
      dateOfBirth: "",
      address: "",
    });

  const [assignmentRole, setAssignmentRole] =
    useState<PersonnelRole>("worker");
  const [assignmentTeamId, setAssignmentTeamId] =
    useState("");

  const loadRequest = useRef(0);
  const loadPersonnel = useCallback(async () => {
    const request = ++loadRequest.current;
    if (!personnelId) {
      setError("Không tìm thấy mã nhân sự.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const personnelResult =
        await getPersonnelById(personnelId);

      if (!personnelResult) {
        setError(
          "Nhân sự không tồn tại hoặc đã bị loại khỏi hệ thống.",
        );
        if (request !== loadRequest.current) return;
        setPersonnel(null);
        return;
      }

      const teamResult = await getTeamList({
        farmId: personnelResult.farmId,
        leaderStatus: "all",
      });

      if (request !== loadRequest.current) return;

      setPersonnel(personnelResult);
      setTeams(teamResult);
    } catch (loadError) {
      if (request !== loadRequest.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải hồ sơ nhân sự.",
      );
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [personnelId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPersonnel(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadPersonnel]);

  const farmName = useMemo(() => {
    if (!personnel) {
      return "Không xác định";
    }

    return (
      farms.find(
        (farm) => farm.id === personnel.farmId,
      )?.name ?? "Không xác định"
    );
  }, [farms, personnel]);

  const currentTeam = useMemo(() => {
    if (!personnel?.teamId) {
      return null;
    }

    return (
      teams.find(
        (team) => team.id === personnel.teamId,
      ) ?? null
    );
  }, [personnel, teams]);

  const initials = useMemo(() => {
    if (!personnel) {
      return "";
    }

    return personnel.fullName
      .split(" ")
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }, [personnel]);

  const closeModal = () => {
    if (saving) {
      return;
    }

    setOpenModal(null);
    setOperationError("");
  };

  const openEditModal = () => {
    if (!personnel) {
      return;
    }

    setEditForm({
      fullName: personnel.fullName,
      phone: personnel.phone,
      citizenId: personnel.citizenId ?? "",
      dateOfBirth: personnel.dateOfBirth ?? "",
      address: personnel.address ?? "",
    });

    setOperationError("");
    setOpenModal("edit");
  };

  const openAssignmentModal = () => {
    if (!personnel) {
      return;
    }

    setAssignmentRole(personnel.role);
    setAssignmentTeamId(personnel.teamId ?? "");
    setOperationError("");
    setOpenModal("assignment");
  };

  const openLockModal = () => {
    setOperationError("");
    setOpenModal("lock");
  };

  const saveProfile = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!personnel) {
      return;
    }

    setSaving(true);
    setOperationError("");

    try {
      await updatePersonnel(personnel.id, editForm);
      setOpenModal(null);
      await loadPersonnel();
    } catch (saveError) {
      setOperationError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể cập nhật hồ sơ.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!personnel) {
      return;
    }

    if (
      assignmentRole === "leader" &&
      !assignmentTeamId
    ) {
      setOperationError(
        "Tổ trưởng bắt buộc phải thuộc một tổ.",
      );
      return;
    }

    const targetTeam = teams.find(
      (team) => team.id === assignmentTeamId,
    );

    if (
      assignmentRole === "leader" &&
      targetTeam?.leaderId &&
      targetTeam.leaderId !== personnel.id
    ) {
      setOperationError(
        "Tổ được chọn đã có Tổ trưởng. Hãy đổi Tổ trưởng từ trang chi tiết tổ.",
      );
      return;
    }

    setSaving(true);
    setOperationError("");

    try {
      let currentPersonnel = personnel;

      const leavingCurrentLeaderPosition =
        currentPersonnel.role === "leader" &&
        currentPersonnel.teamId &&
        (assignmentRole !== "leader" ||
          assignmentTeamId !==
            currentPersonnel.teamId);

      if (
        leavingCurrentLeaderPosition &&
        currentPersonnel.teamId
      ) {
        await removeTeamLeader(
          currentPersonnel.teamId,
        );

        const refreshedPersonnel =
          await getPersonnelById(
            currentPersonnel.id,
          );

        if (refreshedPersonnel) {
          currentPersonnel = refreshedPersonnel;
        }
      }

      const normalizedTeamId =
        assignmentTeamId || null;

      if (
        currentPersonnel.teamId !== normalizedTeamId
      ) {
        currentPersonnel =
          await transferPersonnel(
            currentPersonnel.id,
            {
              teamId: normalizedTeamId,
            },
          );
      }

      if (
        assignmentRole === "leader" &&
        normalizedTeamId
      ) {
        await assignTeamLeader(normalizedTeamId, {
          personnelId: currentPersonnel.id,
        });
      } else if (
        currentPersonnel.role !== "worker"
      ) {
        await changePersonnelRole(
          currentPersonnel.id,
          {
            role: "worker",
            teamId: normalizedTeamId,
          },
        );
      }

      setOpenModal(null);
      await loadPersonnel();
    } catch (saveError) {
      setOperationError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể cập nhật phân công.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLockAccount = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!personnel) {
      return;
    }

    setSaving(true);
    setOperationError("");

    try {
      if (
        personnel.role === "leader" &&
        personnel.teamId
      ) {
        await removeTeamLeader(personnel.teamId);
      }

      await lockPersonnel(personnel.id);

      setOpenModal(null);
      await loadPersonnel();
    } catch (saveError) {
      setOperationError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể khóa tài khoản.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockAccount = async () => {
    if (!personnel) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await unlockPersonnel(personnel.id);
      await loadPersonnel();
    } catch (unlockError) {
      setError(
        unlockError instanceof Error
          ? unlockError.message
          : "Không thể mở khóa tài khoản.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page personnel-detail-page">
        <div className="personnel-detail-state">
          <LoaderCircle
            className="spin"
            size={30}
          />
          <p>Đang tải hồ sơ nhân sự...</p>
        </div>
      </div>
    );
  }

  if (error || !personnel) {
    return (
      <div className="page personnel-detail-page">
        <div className="personnel-detail-state card">
          <CircleAlert size={34} />
          <h1>Không thể mở hồ sơ</h1>
          <p>{error || "Không tìm thấy nhân sự."}</p>

          <Link
            className="btn btn-secondary"
            to="/personnel"
          >
            <ArrowLeft size={17} />
            Về danh sách nhân sự
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page personnel-detail-page">
      <div className="personnel-detail-topbar">
        <Link
          className="personnel-back-link"
          to="/personnel"
        >
          <ArrowLeft size={18} />
          Danh sách nhân sự
        </Link>

        <div className="personnel-detail-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={openEditModal}
          >
            <Edit3 size={17} />
            Chỉnh sửa
          </button>

          <button
            className="btn btn-secondary"
            type="button"
            disabled={personnel.status === "locked"}
            onClick={openAssignmentModal}
          >
            <BriefcaseBusiness size={17} />
            Phân công
          </button>

          {personnel.status === "active" ? (
            <button
              className="btn personnel-lock-button"
              type="button"
              onClick={openLockModal}
            >
              <Lock size={17} />
              Khóa tài khoản
            </button>
          ) : (
            <button
              className="btn btn-primary"
              type="button"
              disabled={saving}
              onClick={() =>
                void handleUnlockAccount()
              }
            >
              {saving ? (
                <LoaderCircle
                  className="spin"
                  size={17}
                />
              ) : (
                <LockOpen size={17} />
              )}
              Mở khóa
            </button>
          )}
        </div>
      </div>

      {personnel.status === "locked" && (
        <div className="personnel-locked-banner">
          <Lock size={20} />

          <div>
            <strong>Tài khoản đang bị khóa</strong>
          </div>
        </div>
      )}

      <section className="personnel-profile-card card">
        <div className="personnel-profile-avatar">
          {initials}
        </div>

        <div className="personnel-profile-main">
          <div className="personnel-profile-title">
            <div>
              <div className="personnel-profile-name">
                <h1>{personnel.fullName}</h1>

                <span
                  className={`personnel-status status-${personnel.status}`}
                >
                  <span />
                  {personnel.status === "active"
                    ? "Đang hoạt động"
                    : "Bị khóa"}
                </span>
              </div>

              <p>
                {personnel.employeeCode} ·{" "}
                {roleLabels[personnel.role]}
              </p>
            </div>
          </div>

          <div className="personnel-profile-meta">
            <span>
              <Phone size={16} />
              {personnel.phone}
            </span>

            <span>
              <Users size={16} />
              {currentTeam?.name ?? "Chưa thuộc tổ"}
            </span>

            <span>
              <MapPin size={16} />
              {farmName}
            </span>

            <span>
              <CalendarDays size={16} />
              Gia nhập{" "}
              {formatDate(personnel.joinedAt)}
            </span>
          </div>
        </div>
      </section>

      <div className="personnel-detail-grid">
        <section className="personnel-info-card card">
          <div className="personnel-card-heading">
            <div>
              <UserRound size={19} />
              <h2>Thông tin cá nhân</h2>
            </div>

            <button
              type="button"
              onClick={openEditModal}
            >
              Chỉnh sửa
            </button>
          </div>

          <dl className="personnel-info-list">
            <div>
              <dt>Họ và tên</dt>
              <dd>{personnel.fullName}</dd>
            </div>

            <div>
              <dt>Số điện thoại</dt>
              <dd>{personnel.phone}</dd>
            </div>

            <div>
              <dt>Số CCCD</dt>
              <dd>
                {personnel.citizenId || "Chưa cập nhật"}
              </dd>
            </div>

            <div>
              <dt>Ngày sinh</dt>
              <dd>
                {formatDate(personnel.dateOfBirth)}
              </dd>
            </div>

            <div className="info-full">
              <dt>Địa chỉ</dt>
              <dd>
                {personnel.address || "Chưa cập nhật"}
              </dd>
            </div>

          </dl>
        </section>

        <section className="personnel-info-card card">
          <div className="personnel-card-heading">
            <div>
              <ShieldCheck size={19} />
              <h2>Công việc và tài khoản</h2>
            </div>

            <button
              type="button"
              disabled={personnel.status === "locked"}
              onClick={openAssignmentModal}
            >
              Thay đổi
            </button>
          </div>

          <dl className="personnel-info-list single-column">
            <div>
              <dt>Nông trại trực thuộc</dt>
              <dd>{farmName}</dd>
            </div>

            <div>
              <dt>Vai trò</dt>
              <dd>{roleLabels[personnel.role]}</dd>
            </div>

            <div>
              <dt>Tổ công tác</dt>
              <dd>
                {currentTeam?.name ?? "Chưa thuộc tổ"}
              </dd>
            </div>

            <div>
              <dt>Trạng thái tài khoản</dt>
              <dd>
                {personnel.status === "active"
                  ? "Đang hoạt động"
                  : "Bị khóa"}
              </dd>
            </div>

            <div>
              <dt>Lần đăng nhập gần nhất</dt>
              <dd>
                {formatDate(
                  personnel.lastLoginAt,
                  true,
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="personnel-history-card card">
        <div className="personnel-card-heading">
          <div>
            <History size={19} />
            <h2>Lịch sử tài khoản</h2>
          </div>
        </div>

        <div className="personnel-history-list">
          {personnel.updatedAt !==
            personnel.createdAt && (
            <article>
              <span className="history-icon">
                <Edit3 size={16} />
              </span>

              <div>
                <strong>
                  Cập nhật hồ sơ hoặc phân công
                </strong>
                <p>
                  Thông tin nhân sự đã được cập nhật.
                </p>
                <time>
                  {formatDate(
                    personnel.updatedAt,
                    true,
                  )}
                </time>
              </div>
            </article>
          )}

          <article>
            <span className="history-icon success">
              <BadgeCheck size={16} />
            </span>

            <div>
              <strong>Khởi tạo tài khoản</strong>
              <p>
                Tạo hồ sơ {personnel.employeeCode} với
                vai trò ban đầu trong nông trại.
              </p>
              <time>
                {formatDate(
                  personnel.createdAt,
                  true,
                )}
              </time>
            </div>
          </article>
        </div>
      </section>

      {openModal === "edit" && (
        <div
          className="personnel-modal-backdrop"
          role="presentation"
        >
          <form
            className="personnel-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-personnel-title"
            onSubmit={saveProfile}
          >
            <div className="personnel-modal-heading">
              <div>
                <h2 id="edit-personnel-title">
                  Chỉnh sửa thông tin
                </h2>
                <p>{personnel.employeeCode}</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            {operationError && (
              <div className="personnel-form-error">
                {operationError}
              </div>
            )}

            <div className="personnel-modal-content">
              <div className="personnel-form-grid">
                <label className="personnel-field">
                  <span>
                    Họ và tên <b>*</b>
                  </span>

                  <input
                    className="input"
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        fullName:
                          event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="personnel-field">
                  <span>
                    Số điện thoại <b>*</b>
                  </span>

                  <input
                    className="input"
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="personnel-field">
                  <span>Số CCCD</span>

                  <input
                    className="input"
                    type="text"
                    value={editForm.citizenId}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        citizenId:
                          event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="personnel-field">
                  <span>Ngày sinh</span>

                  <input
                    className="input"
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        dateOfBirth:
                          event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="personnel-field field-full">
                  <span>Địa chỉ</span>

                  <input
                    className="input"
                    type="text"
                    value={editForm.address}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        address:
                          event.target.value,
                      }))
                    }
                  />
                </label>

              </div>
            </div>

            <div className="personnel-modal-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeModal}
              >
                Hủy
              </button>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <Save size={17} />
                )}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {openModal === "assignment" && (
        <div
          className="personnel-modal-backdrop"
          role="presentation"
        >
          <form
            className="personnel-modal personnel-modal-small card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assignment-title"
            onSubmit={saveAssignment}
          >
            <div className="personnel-modal-heading">
              <div>
                <h2 id="assignment-title">
                  Vai trò và tổ công tác
                </h2>
                <p>{personnel.fullName}</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            {operationError && (
              <div className="personnel-form-error">
                {operationError}
              </div>
            )}

            <div className="personnel-modal-content">
              <label className="personnel-field">
                <span>Vai trò</span>

                <select
                  className="input"
                  value={assignmentRole}
                  onChange={(event) => {
                    const nextRole = event.target
                      .value as PersonnelRole;

                    setAssignmentRole(nextRole);

                    if (nextRole === "leader") {
                      const selectedTeam =
                        teams.find(
                          (team) =>
                            team.id ===
                            assignmentTeamId,
                        );

                      if (
                        selectedTeam?.leaderId &&
                        selectedTeam.leaderId !==
                          personnel.id
                      ) {
                        setAssignmentTeamId("");
                      }
                    }
                  }}
                >
                  <option value="worker">
                    Công nhân
                  </option>
                  <option value="leader">
                    Tổ trưởng
                  </option>
                </select>
              </label>

              <label className="personnel-field">
                <span>
                  Tổ công tác
                  {assignmentRole === "leader" &&
                    " *"}
                </span>

                <select
                  className="input"
                  value={assignmentTeamId}
                  required={
                    assignmentRole === "leader"
                  }
                  onChange={(event) =>
                    setAssignmentTeamId(
                      event.target.value,
                    )
                  }
                >
                  {assignmentRole === "worker" && (
                    <option value="">
                      Chưa thuộc tổ
                    </option>
                  )}

                  {assignmentRole === "leader" && (
                    <option value="">
                      Chọn tổ chưa có Tổ trưởng
                    </option>
                  )}

                  {teams.map((team) => (
                    <option
                      key={team.id}
                      value={team.id}
                      disabled={
                        assignmentRole ===
                          "leader" &&
                        team.leaderId !== null &&
                        team.leaderId !== personnel.id
                      }
                    >
                      {team.name}
                      {team.leaderId &&
                      team.leaderId !== personnel.id
                        ? " (Đã có Tổ trưởng)"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="personnel-modal-note">
                <CircleAlert size={18} />

                <p>
                  Mỗi nhân sự chỉ thuộc tối đa một tổ.
                  Chuyển sang tổ mới sẽ tự động gỡ khỏi
                  tổ cũ. Mỗi tổ chỉ có một Tổ trưởng.
                </p>
              </div>
            </div>

            <div className="personnel-modal-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeModal}
              >
                Hủy
              </button>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <Check size={17} />
                )}
                Xác nhận
              </button>
            </div>
          </form>
        </div>
      )}

      {openModal === "lock" && (
        <div
          className="personnel-modal-backdrop"
          role="presentation"
        >
          <form
            className="personnel-modal personnel-modal-small card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lock-title"
            onSubmit={handleLockAccount}
          >
            <div className="personnel-modal-heading">
              <div>
                <h2 id="lock-title">
                  Khóa tài khoản
                </h2>
                <p>{personnel.fullName}</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            {operationError && (
              <div className="personnel-form-error">
                {operationError}
              </div>
            )}

            <div className="personnel-modal-content">
              {personnel.role === "leader" && (
                <div className="personnel-lock-warning">
                  <CircleAlert size={19} />

                  <p>
                    Nhân sự đang là Tổ trưởng. Sau khi
                    khóa, tổ hiện tại sẽ chuyển sang
                    trạng thái khuyết Tổ trưởng.
                  </p>
                </div>
              )}

              <div className="personnel-modal-note">
                <ShieldCheck size={18} />

                <p>
                  Tài khoản sẽ không thể đăng nhập,
                  nhưng toàn bộ công việc và nhật ký cũ
                  vẫn được giữ nguyên.
                </p>
              </div>
            </div>

            <div className="personnel-modal-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeModal}
              >
                Hủy
              </button>

              <button
                className="btn personnel-lock-button"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <Lock size={17} />
                )}
                Khóa tài khoản
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default PersonnelDetailPage;
