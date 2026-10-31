import BackButton from "../../components/owner/BackButton_wb";
import "../../styles/personnel_wb.css";
import "../../styles/personnel_form_wb.css";
import {
  CheckCircle2,
  Copy,
  KeyRound,
  LoaderCircle,
  Save,
  UserRound,
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
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { createPersonnel } from "../../sevices/personnelService_wb";
import type {
  CreatePersonnelResult,
} from "../../features/owner/personnel_wb";

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

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === farmId),
    [farmId, farms],
  );

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (!farmId) {
      setError("Vui lòng chọn nông trại.");
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
        autoGeneratePassword: true,
        role: "worker",
        teamId: null,
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
      "AgriFarm",
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
        <BackButton to="/personnel" label="Quay lại danh sách nhân sự" />

        <div>
          <h1>Thêm nhân sự</h1>
          <p>
            Khai báo hồ sơ và tài khoản làm việc cho nhân sự.
          </p>
        </div>
      </div>

      <form
        className="personnel-form personnel-create-form card"
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

        <section className="personnel-form-section">
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
                Nông trại <b>*</b>
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
