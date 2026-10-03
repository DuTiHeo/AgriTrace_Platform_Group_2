import "../styles/account.css";
import {
  BellRing,
  CalendarDays,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  MapPin,
  Save,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountService } from "../services/accountService";
import type {
  AccountPreferences,
  OwnerAccount,
  UpdateOwnerAccountInput,
} from "../types/account";

const emptyAccount: OwnerAccount = {
  id: "",
  fullName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  address: "",
  role: "owner",
  joinedAt: "",
  lastLoginAt: "",
};

const emptyPreferences: AccountPreferences = {
  cultivationReminders: true,
  taskUpdates: true,
  harvestAlerts: true,
  weeklyDigest: false,
};

const profileEditable = false;
const notificationsAvailable = false;

function formatDate(value: string) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(
    new Date(value.length === 10 ? `${value}T00:00:00` : value),
  );
}

function formatDateTime(value: string) {
  if (!value) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function AccountPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<OwnerAccount>(emptyAccount);
  const [profileDraft, setProfileDraft] =
    useState<UpdateOwnerAccountInput>(emptyAccount);
  const [preferences, setPreferences] =
    useState<AccountPreferences>(emptyPreferences);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void Promise.all([
        accountService.getAccount(),
        accountService.getPreferences(),
      ]).then(([accountData, preferencesData]) => {
        if (!active) return;
        setAccount(accountData);
        setProfileDraft(accountData);
        setPreferences(preferencesData);
      }).catch((error) => {
        if (active) setProfileError(error instanceof Error ? error.message : "Không thể tải tài khoản.");
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    setProfileMessage("");

    try {
      const updated = await accountService.updateAccount(profileDraft);
      setAccount(updated);
      setProfileDraft(updated);
      setProfileMessage("Thông tin cá nhân đã được cập nhật.");
    } catch (saveError) {
      setProfileError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể cập nhật thông tin.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordMessage("");

    try {
      if (newPassword !== confirmPassword) {
        throw new Error("Mật khẩu xác nhận không khớp.");
      }
      await accountService.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Đổi mật khẩu thành công.");
      navigate("/login", { replace: true });
    } catch (changeError) {
      setPasswordError(
        changeError instanceof Error
          ? changeError.message
          : "Không thể đổi mật khẩu.",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const savePreferences = async () => {
    setPreferencesSaving(true);
    setPreferencesMessage("");
    try {
      await accountService.updatePreferences(preferences);
      setPreferencesMessage("Đã lưu tùy chọn thông báo.");
    } catch (error) {
      setPreferencesMessage(error instanceof Error ? error.message : "Không thể lưu tùy chọn.");
    } finally {
      setPreferencesSaving(false);
    }
  };

  const logout = async () => {
    if (!window.confirm("Bạn muốn đăng xuất khỏi Farmer QuickLog?")) return;
    try {
      await accountService.logout();
    } catch {
      // The local JWT is cleared even if the API cannot revoke it.
    } finally {
      navigate("/login", { replace: true });
    }
  };

  const initials = account.fullName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi");

  return (
    <div className="page account-page">
      <div className="page-heading account-heading">
        <div>
          <h1>Tài khoản</h1>
          <p>Quản lý thông tin cá nhân, bảo mật và tùy chọn nhận thông báo.</p>
        </div>
      </div>

      <div className="account-layout">
        <aside className="account-side-column">
          <section className="card account-identity-card">
            <div className="account-large-avatar">{initials || "CN"}</div>
            <h2>{account.fullName || "Chủ nông trại"}</h2>
            <span>Chủ nông trại</span>
            <div className="account-verified-badge">
              <ShieldCheck size={15} />
              Tài khoản đã xác thực
            </div>
            <dl>
              <div>
                <dt>Thành viên từ</dt>
                <dd>{formatDate(account.joinedAt)}</dd>
              </div>
              <div>
                <dt>Đăng nhập gần nhất</dt>
                <dd>{formatDateTime(account.lastLoginAt)}</dd>
              </div>
            </dl>
          </section>

          <button className="account-logout-button" type="button" onClick={logout}>
            <LogOut size={17} />
            Đăng xuất
          </button>
        </aside>

        <main className="account-main-column">
          <section className="card account-section-card">
            <div className="account-section-heading">
              <div className="account-section-icon"><UserRound size={20} /></div>
              <div><h2>Thông tin cá nhân</h2><p>Thông tin dùng để liên hệ và xác định chủ tài khoản.</p></div>
            </div>

            <p role="status">Hồ sơ hiện chỉ cho phép xem. Chủ nông trại chưa thể tự cập nhật thông tin.</p>
            <form className="account-profile-form" onSubmit={saveProfile}>
              <label>
                <span>Họ và tên *</span>
                <div><UserRound size={16} /><input required readOnly value={profileDraft.fullName} onChange={(event) => setProfileDraft({ ...profileDraft, fullName: event.target.value })} /></div>
              </label>
              <label>
                <span>Số điện thoại *</span>
                <div><Smartphone size={16} /><input required readOnly value={profileDraft.phone} onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })} /></div>
              </label>
              <label>
                <span>Ngày sinh</span>
                <div><CalendarDays size={16} /><input type="date" readOnly value={profileDraft.dateOfBirth} onChange={(event) => setProfileDraft({ ...profileDraft, dateOfBirth: event.target.value })} /></div>
              </label>
              <label className="account-field-full">
                <span>Địa chỉ</span>
                <div><MapPin size={16} /><input readOnly value={profileDraft.address} onChange={(event) => setProfileDraft({ ...profileDraft, address: event.target.value })} /></div>
              </label>
              {profileError && <div className="form-error-block account-field-full">{profileError}</div>}
              {profileMessage && <div className="account-success account-field-full">{profileMessage}</div>}
              <div className="account-form-actions account-field-full">
                <button className="btn btn-primary" type="submit" disabled={profileSaving || !profileEditable}>
                  <Save size={16} />
                  {profileSaving ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            </form>
          </section>

          <section className="card account-section-card">
            <div className="account-section-heading">
              <div className="account-section-icon security"><KeyRound size={20} /></div>
              <div><h2>Đổi mật khẩu</h2><p>Mật khẩu mới cần tối thiểu 8 ký tự, có chữ cái và chữ số.</p></div>
            </div>

            <form className="account-password-form" onSubmit={changePassword}>
              <label>
                <span>Mật khẩu hiện tại</span>
                <div><KeyRound size={16} /><input required type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></div>
              </label>
              <label>
                <span>Mật khẩu mới</span>
                <div><KeyRound size={16} /><input required type={showPasswords ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></div>
              </label>
              <label>
                <span>Xác nhận mật khẩu mới</span>
                <div><ShieldCheck size={16} /><input required type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></div>
              </label>
              <button className="account-show-password" type="button" onClick={() => setShowPasswords((current) => !current)}>
                {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                {showPasswords ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              </button>
              {passwordError && <div className="form-error-block">{passwordError}</div>}
              {passwordMessage && <div className="account-success">{passwordMessage}</div>}
              <div className="account-form-actions">
                <button className="btn btn-primary" type="submit" disabled={passwordSaving}>
                  <KeyRound size={16} />
                  {passwordSaving ? "Đang đổi..." : "Đổi mật khẩu"}
                </button>
              </div>
            </form>
          </section>

          <section className="card account-section-card">
            <div className="account-section-heading">
              <div className="account-section-icon notification"><BellRing size={20} /></div>
              <div><h2>Tùy chọn thông báo</h2><p>Chọn những cập nhật quan trọng bạn muốn nhận.</p></div>
            </div>

            <p role="status">Thông báo hiện chưa khả dụng; các tùy chọn chưa có hiệu lực.</p>
            <div className="account-preference-list">
              {([
                ["cultivationReminders", "Nhắc lịch mùa vụ", "Các mốc chăm sóc và thời gian thu hoạch dự kiến."],
                ["taskUpdates", "Cập nhật công việc", "Công việc được báo hoàn thành và chờ xác nhận."],
                ["harvestAlerts", "Cảnh báo thu hoạch", "Lô thu hoạch chờ tạo tem hoặc cần xử lý."],
                ["weeklyDigest", "Tổng hợp hằng tuần", "Báo cáo ngắn về hoạt động của các nông trại."],
              ] as const).map(([key, title, description]) => (
                <label key={key}>
                  <div><strong>{title}</strong><span>{description}</span></div>
                  <input disabled type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} />
                  <span className="account-toggle" />
                </label>
              ))}
            </div>
            {preferencesMessage && <div className="account-success">{preferencesMessage}</div>}
            <div className="account-form-actions">
              <button className="btn btn-primary" type="button" disabled={preferencesSaving || !notificationsAvailable} onClick={() => void savePreferences()}>
                <Save size={16} />
                {preferencesSaving ? "Đang lưu..." : "Lưu tùy chọn"}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default AccountPage;

