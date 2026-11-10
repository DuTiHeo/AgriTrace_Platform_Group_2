import { isDialogBackdropClick } from "../../../utils/dialogBackdrop_wb";
import "../../../styles/account_wb.css";
import { Eye, EyeOff, KeyRound, ShieldCheck, UserRound, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountService } from "../../../sevices/accountService_wb";
import type { OwnerAccount } from "../../owner/account_wb";

function formatDate(value: string) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (!Number.isFinite(date.getTime())) return "Chưa cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(date);
}

export default function AccountPage({ admin = false }: { admin?: boolean }) {
  const navigate = useNavigate();
  const [account, setAccount] = useState<Omit<OwnerAccount, "role" | "lastLoginAt"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const request = admin ? accountService.getCurrentUser().then(user => ({
        id: user.user_id,
        fullName: user.full_name,
        phone: user.phone,
        nationalId: user.national_id ?? "",
        dateOfBirth: user.date_of_birth ?? "",
        address: user.address ?? "",
        status: user.status ?? "",
        joinedAt: user.created_at ?? "",
        email: "",
      })) : accountService.getAccount();
      void request.then(data => { if (active) setAccount(data); })
        .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Không thể tải tài khoản."); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [admin]);
  useEffect(() => {
    if (!passwordOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { trigger?.focus(); };
  }, [passwordOpen]);
  const openPassword = () => {
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    setPasswordError(""); setShowPasswords(false); setPasswordOpen(true);
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    setPasswordError("");
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("Mật khẩu mới cần ít nhất 8 ký tự, có chữ cái và chữ số."); return;
    }
    if (newPassword !== confirmPassword) { setPasswordError("Mật khẩu xác nhận không khớp."); return; }
    if (newPassword === currentPassword) { setPasswordError("Mật khẩu mới phải khác mật khẩu hiện tại."); return; }
    setSaving(true);
    try {
      await accountService.changePassword(currentPassword, newPassword);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      navigate("/login", { replace: true });
    } catch (cause) { setPasswordError(cause instanceof Error ? cause.message : "Không thể đổi mật khẩu."); }
    finally { setSaving(false); }
  };
  const roleLabel = admin ? "Quản trị viên" : "Chủ nông trại";
  const initials = account?.fullName.split(" ").filter(Boolean).slice(-2).map(part => part[0]).join("").toLocaleUpperCase("vi");
  return <div className="page account-page">
    <div className="page-heading account-heading"><div><h1>Tài khoản</h1><p>Thông tin cá nhân của {roleLabel.toLocaleLowerCase("vi")}.</p></div></div>
    {loading ? <div className="page-loading">Đang tải tài khoản...</div> : error ? <div className="form-error-block" role="alert">{error}</div> : account && <div className="account-layout">
      <aside className="account-side-column">
        <section className="card account-identity-card"><div className="account-large-avatar">{initials || (admin ? "QT" : "CN")}</div><h2>{account.fullName}</h2><span>{roleLabel}</span><div className="account-verified-badge"><ShieldCheck size={15} />Tài khoản đã xác thực</div><dl><div><dt>Thành viên từ</dt><dd>{formatDate(account.joinedAt)}</dd></div></dl></section>
        <button className="btn btn-secondary account-password-button" type="button" onClick={openPassword}><KeyRound size={18} />Đổi mật khẩu</button>
      </aside>
      <main className="account-main-column"><section className="card account-section-card"><div className="account-section-heading"><div className="account-section-icon"><UserRound size={20} /></div><div><h2>Thông tin cá nhân</h2><p>Thông tin hồ sơ chỉ dùng để xem.</p></div></div>
        <dl className="account-readonly-details"><div><dt>Họ và tên</dt><dd>{account.fullName || "Chưa cập nhật"}</dd></div><div><dt>Số điện thoại</dt><dd>{account.phone || "Chưa cập nhật"}</dd></div><div><dt>CCCD</dt><dd>{account.nationalId || "Chưa cập nhật"}</dd></div><div><dt>Trạng thái tài khoản</dt><dd>{account.status === "active" ? "Đang hoạt động" : (account.status === "inactive" || account.status === "locked") ? "Đã khóa" : account.status || "Chưa cập nhật"}</dd></div><div><dt>Ngày sinh</dt><dd>{formatDate(account.dateOfBirth)}</dd></div><div><dt>Vai trò</dt><dd>{roleLabel}</dd></div><div className="account-field-full"><dt>Địa chỉ</dt><dd>{account.address || "Chưa cập nhật"}</dd></div></dl>
      </section></main>
    </div>}
    {passwordOpen && <dialog onClick={event => { if (!saving && isDialogBackdropClick(event)) setPasswordOpen(false); }} ref={dialog} className="account-password-dialog" aria-labelledby="account-password-title" onCancel={event => { event.preventDefault(); if (!saving) setPasswordOpen(false); }}>
      <form onSubmit={changePassword}><header><div><h2 id="account-password-title">Đổi mật khẩu</h2><p>Sau khi đổi mật khẩu, bạn cần đăng nhập lại.</p></div><button type="button" aria-label="Đóng" disabled={saving} onClick={() => setPasswordOpen(false)}><X size={20} /></button></header>
        <fieldset className="account-password-form" disabled={saving}>
          <label><span>Mật khẩu hiện tại *</span><div><KeyRound size={16} /><input autoFocus required type={showPasswords ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></div></label>
          <label><span>Mật khẩu mới *</span><div><KeyRound size={16} /><input required minLength={8} type={showPasswords ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></div></label>
          <small>Ít nhất 8 ký tự, có chữ cái và chữ số.</small>
          <label><span>Xác nhận mật khẩu mới *</span><div className="account-confirm-password"><ShieldCheck size={16} /><input required minLength={8} type={showPasswords ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /><button type="button" className="account-password-eye" aria-label={showPasswords ? "Ẩn mật khẩu" : "Hiện mật khẩu"} title={showPasswords ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={showPasswords} onClick={() => setShowPasswords(value => !value)}>{showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {passwordError && <div className="form-error-block" role="alert">{passwordError}</div>}
        </fieldset><footer><button className="btn btn-secondary" type="button" disabled={saving} onClick={() => setPasswordOpen(false)}>Hủy</button><button className="btn btn-primary" type="submit" disabled={saving}><KeyRound size={17} />{saving ? "Đang đổi..." : "Đổi mật khẩu"}</button></footer>
      </form>
    </dialog>}
  </div>;
}
