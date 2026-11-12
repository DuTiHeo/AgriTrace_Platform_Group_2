import BackButton from "../../../components/owner/BackButton_wb";
import "../../../styles/account_wb.css";
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { accountService } from "../../../sevices/accountService_wb";

type RecoveryStep = "request" | "verify" | "reset" | "done";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<RecoveryStep>("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (step === "request") {
        const result = await accountService.requestPasswordReset(identifier);
        setDemoCode(result.demoCode);
        setStep("verify");
      } else if (step === "verify") {
        await accountService.verifyPasswordReset(code);
        setStep("reset");
      } else if (step === "reset") {
        if (password !== confirmation) {
          throw new Error("Mật khẩu xác nhận không khớp.");
        }
        await accountService.resetPassword(password);
        setStep("done");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể xử lý yêu cầu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page recovery-page">
      <section className="login-brand-panel">
        <div className="login-brand-content">
          <img src="/images/icon.png" alt="AgriFarm" />
          <span>Khôi phục an toàn</span>
          <h1>Lấy lại quyền truy cập tài khoản quản trị.</h1>
          <p>Yêu cầu mã xác nhận bằng số điện thoại đã đăng ký để đặt lại mật khẩu.</p>
        </div>
      </section>
      <section className="login-form-panel">
        <form className="login-form-card" onSubmit={submit}>
          <div className="login-heading">
            <span>Khôi phục tài khoản</span>
            <div className="page-title-with-back"><BackButton to="/login" label="Quay lại đăng nhập" /><h2>{step === "request" ? "Quên mật khẩu" : step === "verify" ? "Xác nhận mã" : step === "reset" ? "Đặt mật khẩu mới" : "Đã đổi mật khẩu"}</h2></div>
            <p>{step === "request" ? "Nhập số điện thoại của tài khoản Owner." : step === "verify" ? "Nhập mã OTP gồm 4 chữ số." : step === "reset" ? "Mật khẩu cần tối thiểu 8 ký tự, có chữ và số." : "Bạn có thể đăng nhập bằng mật khẩu mới."}</p>
          </div>

          {step === "request" && <label><span>Số điện thoại</span><div><Mail size={17} /><input required type="tel" value={identifier} onChange={(event) => setIdentifier(event.target.value)} /></div></label>}
          {step === "verify" && <><label><span>Mã xác nhận</span><div><ShieldCheck size={17} /><input required inputMode="numeric" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} /></div></label><div className="login-demo-hint">OTP môi trường demo: <strong>{demoCode}</strong></div></>}
          {step === "reset" && <><label><span>Mật khẩu mới</span><div><KeyRound size={17} /><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></div></label><label><span>Xác nhận mật khẩu</span><div><KeyRound size={17} /><input required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div></label></>}
          {step === "done" && <div className="recovery-success"><CheckCircle2 size={34} /><strong>Đặt lại mật khẩu thành công</strong></div>}
          {error && <div className="form-error-block">{error}</div>}
          {step !== "done" ? <button className="btn btn-primary login-submit" disabled={loading} type="submit">{loading ? "Đang xử lý..." : step === "request" ? "Gửi mã xác nhận" : step === "verify" ? "Xác nhận mã" : "Đặt lại mật khẩu"}</button> : <button className="btn btn-primary login-submit" type="button" onClick={() => navigate("/login", { replace: true })}>Đăng nhập ngay</button>}
        </form>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
