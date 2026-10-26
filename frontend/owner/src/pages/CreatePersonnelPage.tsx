import "../styles/personnel.css";
import "../styles/personnel-form.css";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Save,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { createPersonnel } from "../services/personnelService";
import {
  getTeamList,
} from "../services/teamService";
import type {
  CreatePersonnelResult,
  PersonnelRole,
} from "../types/personnel";
import type { TeamSummary } from "../types/team";

const assignmentOnCreation = false;

function CreatePersonnelPage() {
  const navigate = useNavigate();

  const {
    farms,
    selectedFarmId,
    loadingFarms,
  } = useFarmContext();

  const [farmId, setFarmId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [citizenId, setCitizenId] = useState("");
  const [dateOfBirth, setDateOfBirth] =
    useState("");
  const [address, setAddress] = useState("");

  const [role, setRole] =
    useState<PersonnelRole>("worker");
  const [teamId, setTeamId] = useState("");

  const [
    autoGeneratePassword,
    setAutoGeneratePassword,
  ] = useState(true);
  const [initialPassword, setInitialPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);

  const [teams, setTeams] = useState<TeamSummary[]>(
    [],
  );
  const [loadingTeams, setLoadingTeams] =
    useState(false);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [createdResult, setCreatedResult] =
    useState<CreatePersonnelResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loadingFarms || farms.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (selectedFarmId !== "all") {
        setFarmId(selectedFarmId);
        return;
      }

      const currentFarmStillExists = farms.some(
        (farm) => farm.id === farmId,
      );

      if (!currentFarmStillExists) {
        const firstActiveFarm =
          farms.find((farm) => farm.status !== "suspended") ?? farms[0];
        setFarmId(firstActiveFarm.id);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    farmId,
    farms,
    loadingFarms,
    selectedFarmId,
  ]);

  useEffect(() => {
    if (!farmId) {
      const timer = window.setTimeout(() => setTeams([]), 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;

    const loadTeams = async () => {
      setLoadingTeams(true);

      try {
        const result = await getTeamList({
          farmId,
          leaderStatus: "all",
        });

        if (active) {
          setTeams(result);
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải danh sách tổ.",
          );
        }
      } finally {
        if (active) {
          setLoadingTeams(false);
        }
      }
    };

    const timer = window.setTimeout(() => {
      setTeamId("");
      void loadTeams();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [farmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === farmId),
    [farmId, farms],
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === teamId),
    [teamId, teams],
  );

  const handleRoleChange = (
    nextRole: PersonnelRole,
  ) => {
    setRole(nextRole);

    if (
      nextRole === "leader" &&
      selectedTeam?.leaderId
    ) {
      setTeamId("");
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (!farmId) {
      setError("Vui lòng chọn nông trại.");
      return;
    }

    if (role === "leader" && !teamId) {
      setError(
        "Tổ trưởng bắt buộc phải được gán vào một tổ chưa có Tổ trưởng.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const result = await createPersonnel({
        farmId,
        fullName,
        phone,
        citizenId,
        dateOfBirth,
        address,
        autoGeneratePassword,
        initialPassword,
        role,
        teamId: teamId || null,
      });

      setCreatedResult(result);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể tạo nhân sự.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const copyLoginInformation = async () => {
    if (!createdResult) {
      return;
    }

    const loginInformation = [
      "Farmer QuickLog",
      `Tài khoản: ${createdResult.personnel.phone}`,
      `Mật khẩu khởi tạo: ${createdResult.initialPassword}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(
        loginInformation,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  if (createdResult) {
    return (
      <div className="page personnel-form-page">
        <div className="personnel-success-card card">
          <span className="personnel-success-icon">
            <CheckCircle2 size={34} />
          </span>

          <h1>Tạo tài khoản thành công</h1>

          <p>
            Nhân sự{" "}
            <strong>
              {createdResult.personnel.fullName}
            </strong>{" "}
            đã được thêm vào hệ thống.
          </p>

          <div className="personnel-credential-box">
            <div>
              <span>Tài khoản đăng nhập</span>
              <strong>
                {createdResult.personnel.phone}
              </strong>
            </div>

            <div>
              <span>Mật khẩu khởi tạo</span>
              <strong>
                {createdResult.initialPassword}
              </strong>
            </div>
          </div>

          <div className="personnel-password-warning">
            <KeyRound size={19} />

            <p>
              Mật khẩu này chỉ hiển thị một lần. Hãy
              sao chép và bàn giao cho nhân sự trước
              khi rời khỏi trang.
            </p>
          </div>

          <div className="personnel-success-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() =>
                void copyLoginInformation()
              }
            >
              <Copy size={17} />
              {copied
                ? "Đã sao chép"
                : "Sao chép thông tin"}
            </button>

            <button
              className="btn btn-primary"
              type="button"
              onClick={() =>
                navigate(
                  `/personnel/${createdResult.personnel.id}`,
                )
              }
            >
              Xem hồ sơ nhân sự
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page personnel-form-page">
      <div className="personnel-form-heading">
        <Link
          className="personnel-back-link"
          to="/personnel"
        >
          <ArrowLeft size={18} />
          Quay lại danh sách
        </Link>

        <div>
          <h1>Thêm nhân sự</h1>
          <p>
            Tạo tài khoản làm việc trong Farmer
            QuickLog.
          </p>
        </div>
      </div>

      <form
        className="personnel-form"
        onSubmit={handleSubmit}
      >
        {error && (
          <div
            className="personnel-form-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <section className="personnel-form-section card">
          <div className="personnel-section-heading">
            <span>
              <UserRound size={20} />
            </span>

            <div>
              <h2>Thông tin cá nhân</h2>
              <p>
                Thông tin định danh và liên hệ của
                nhân sự.
              </p>
            </div>
          </div>

          <div className="personnel-form-grid">
            <label className="personnel-field">
              <span>
                Họ và tên <b>*</b>
              </span>

              <input
                className="input"
                type="text"
                value={fullName}
                placeholder="Ví dụ: Nguyễn Văn An"
                required
                onChange={(event) =>
                  setFullName(event.target.value)
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
                value={phone}
                placeholder="Ví dụ: 0987 123 456"
                required
                onChange={(event) =>
                  setPhone(event.target.value)
                }
              />

              <small>
                Số điện thoại được dùng làm tên đăng
                nhập.
              </small>
            </label>

            <label className="personnel-field">
              <span>Số CCCD</span>

              <input
                className="input"
                type="text"
                inputMode="numeric"
                value={citizenId}
                placeholder="Nhập số CCCD nếu có"
                onChange={(event) =>
                  setCitizenId(event.target.value)
                }
              />
            </label>

            <label className="personnel-field">
              <span>Ngày sinh</span>

              <input
                className="input"
                type="date"
                value={dateOfBirth}
                max={new Date()
                  .toISOString()
                  .slice(0, 10)}
                onChange={(event) =>
                  setDateOfBirth(event.target.value)
                }
              />
            </label>

            <label className="personnel-field field-full">
              <span>Địa chỉ</span>

              <input
                className="input"
                type="text"
                value={address}
                placeholder="Địa chỉ thường trú hoặc nơi ở hiện tại"
                onChange={(event) =>
                  setAddress(event.target.value)
                }
              />
            </label>

          </div>
        </section>

        <section className="personnel-form-section card">
          <div className="personnel-section-heading">
            <span>
              <ShieldCheck size={20} />
            </span>

            <div>
              <h2>Phân công công việc</h2>
              <p>
                Tài khoản mới có vai trò công nhân. Sau khi tạo, gán tổ hoặc phong tổ trưởng trong trang chi tiết nhân sự.
              </p>
            </div>
          </div>

          <div className="personnel-form-grid">
            <label className="personnel-field">
              <span>
                Nông trại trực thuộc <b>*</b>
              </span>

              <select
                className="input"
                value={farmId}
                required
                disabled={
                  loadingFarms ||
                  selectedFarmId !== "all"
                }
                onChange={(event) =>
                  setFarmId(event.target.value)
                }
              >
                <option value="">
                  Chọn nông trại
                </option>

                {farms.map((farm) => (
                  <option
                    key={farm.id}
                    value={farm.id}
                    disabled={
                      farm.status === "suspended"
                    }
                  >
                    {farm.name}
                    {farm.status === "suspended"
                      ? " (Tạm ngưng)"
                      : ""}
                  </option>
                ))}
              </select>

              {selectedFarm && (
                <small>
                  Nhân sự sẽ thuộc{" "}
                  {selectedFarm.name}.
                </small>
              )}
            </label>

            <label className="personnel-field">
              <span>Tổ công tác</span>

              <select
                className="input"
                value={teamId}
                disabled={loadingTeams || !assignmentOnCreation}
                required={role === "leader"}
                onChange={(event) =>
                  setTeamId(event.target.value)
                }
              >
                <option value="">
                  {role === "leader"
                    ? "Chọn tổ chưa có Tổ trưởng"
                    : "Chưa phân tổ"}
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                    disabled={
                      role === "leader" &&
                      team.leaderId !== null
                    }
                  >
                    {team.name}
                    {team.leaderId
                      ? " (Đã có Tổ trưởng)"
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <fieldset disabled className="personnel-role-field field-full">
              <legend>
                Vai trò ban đầu <b>*</b>
              </legend>

              <div className="personnel-role-options">
                <label
                  className={
                    role === "worker"
                      ? "selected"
                      : ""
                  }
                >
                  <input
                    type="radio"
                    name="personnel-role"
                    checked={role === "worker"}
                    onChange={() =>
                      handleRoleChange("worker")
                    }
                  />

                  <span>
                    <UserRound size={19} />
                  </span>

                  <div>
                    <strong>Công nhân</strong>
                    <small>
                      Nhận việc và ghi nhật ký canh tác.
                    </small>
                  </div>
                </label>

                <label
                  className={
                    role === "leader"
                      ? "selected"
                      : ""
                  }
                >
                  <input
                    type="radio"
                    name="personnel-role"
                    checked={role === "leader"}
                    onChange={() =>
                      handleRoleChange("leader")
                    }
                  />

                  <span>
                    <Users size={19} />
                  </span>

                  <div>
                    <strong>Tổ trưởng</strong>
                    <small>
                      Quản lý thành viên và điều phối
                      công việc.
                    </small>
                  </div>
                </label>
              </div>
            </fieldset>
          </div>
        </section>

        <section className="personnel-form-section card">
          <div className="personnel-section-heading">
            <span>
              <KeyRound size={20} />
            </span>

            <div>
              <h2>Tài khoản đăng nhập</h2>
              <p>
                Thiết lập mật khẩu sử dụng cho ứng dụng
                công nhân.
              </p>
            </div>
          </div>

          <label className="personnel-password-choice">
            <input
              type="checkbox"
              checked={autoGeneratePassword}
              onChange={(event) =>
                setAutoGeneratePassword(
                  event.target.checked,
                )
              }
            />

            <span>
              <strong>
                Tự động tạo mật khẩu an toàn
              </strong>
              <small>
                Mật khẩu sẽ được hiển thị một lần sau
                khi tạo tài khoản.
              </small>
            </span>
          </label>

          {!autoGeneratePassword && (
            <label className="personnel-field personnel-password-field">
              <span>
                Mật khẩu khởi tạo <b>*</b>
              </span>

              <div className="personnel-password-input">
                <input
                  className="input"
                  type={
                    showPassword ? "text" : "password"
                  }
                  value={initialPassword}
                  minLength={6}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  onChange={(event) =>
                    setInitialPassword(
                      event.target.value,
                    )
                  }
                />

                <button
                  type="button"
                  aria-label={
                    showPassword
                      ? "Ẩn mật khẩu"
                      : "Hiện mật khẩu"
                  }
                  onClick={() =>
                    setShowPassword(
                      (currentValue) =>
                        !currentValue,
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </label>
          )}
        </section>

        <div className="personnel-form-actions">
          <Link
            className="btn btn-secondary"
            to="/personnel"
          >
            Hủy
          </Link>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting || loadingFarms}
          >
            {submitting ? (
              <LoaderCircle
                className="spin"
                size={18}
              />
            ) : (
              <Save size={18} />
            )}

            {submitting
              ? "Đang tạo tài khoản..."
              : "Tạo nhân sự"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreatePersonnelPage;
