import "../styles/account.css";
import { Eye, EyeOff, Leaf, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { accountService } from "../services/accountService";

type LoginLocationState = { from?: string };

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await accountService.login(login, password);
      const state = location.state as LoginLocationState | null;
      navigate(state?.from || "/", { replace: true });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Không thể đăng nhập.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-content">
          <img src="/branding/logo.svg" alt="Farmer QuickLog" />
          <span>Quản trị nông trại</span>
          <h1>Quản lý sản xuất rõ ràng, từ vùng trồng đến thu hoạch.</h1>
          <p>
            Theo dõi mùa vụ, nhân sự, nhật ký canh tác và truy xuất nguồn gốc
            trên cùng một hệ thống.
          </p>
          <div className="login-feature-list">
            <div><Leaf size={18} /> Quản lý dữ liệu theo từng nông trại</div>
            <div><UserRound size={18} /> Điều phối nhân sự và công việc</div>
            <div><LockKeyhole size={18} /> Kiểm soát truy cập theo tài khoản</div>
          </div>
        </div>
      </section>

      <section className="login-form-panel">
        <form className="login-form-card" onSubmit={submit}>
          <div className="login-mobile-brand">
            <img src="/branding/logo.svg" alt="" />
            <strong>Farmer QuickLog</strong>
          </div>
          <div className="login-heading">
            <span>Chào mừng trở lại</span>
            <h2>Đăng nhập tài khoản</h2>
            <p>Sử dụng số điện thoại đã đăng ký.</p>
          </div>

          <label>
            <span>Số điện thoại</span>
            <div><UserRound size={17} /><input required type="tel" value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" /></div>
          </label>

          <Link className="login-forgot-link" to="/forgot-password">
            Quên mật khẩu?
          </Link>
          <label>
            <span>Mật khẩu</span>
            <div>
              <LockKeyhole size={17} />
              <input required type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              <button type="button" aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>

          {error && <div className="form-error-block">{error}</div>}
          <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
            <LogIn size={17} />
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;

