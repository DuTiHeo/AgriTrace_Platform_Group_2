import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { accountService } from "../sevices/accountService_wb";
import { httpClient } from "../sevices/httpClient_wb";

const OwnerApp = lazy(() => import("./owner/App_wb"));
const AdminApp = lazy(() => import("./admin/App_wb"));
const LoginPage = lazy(() => import("../features/auth/website/LoginPage_wb"));
const ForgotPasswordPage = lazy(() => import("../features/auth/website/ForgotPasswordPage_wb"));
const TraceabilityPage = lazy(() => import("./owner/TraceabilityPage_wb"));

function ProtectedWebRoute({ role, children }: { role: "owner" | "admin"; children: ReactNode }) {
  const location = useLocation();
  const token = useSyncExternalStore(httpClient.subscribeAuth, httpClient.getAccessToken);
  const [session, setSession] = useState<{ token: string; role?: string; error?: string }>();

  useEffect(() => {
    if (!token) return;
    let active = true;
    accountService.getCurrentUser().then(
      user => { if (active) setSession({ token, role: user.role }); },
      error => { if (active) setSession({ token, error: error.message }); },
    );
    return () => { active = false; };
  }, [token]);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (session?.token !== token) return <div className="route-loading">Đang xác thực...</div>;
  if (session.error || (session.role !== "owner" && session.role !== "admin")) {
    return <div className="route-loading" role="alert">{session.error ?? "Tài khoản không có quyền truy cập web."}
      <button type="button" onClick={() => httpClient.clearAccessToken()}>Quay về đăng nhập</button>
    </div>;
  }
  if (session.role !== role) return <Navigate to={session.role === "admin" ? "/admin" : "/"} replace />;
  return children;
}

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const authenticated = useSyncExternalStore(httpClient.subscribeAuth, accountService.isAuthenticated);
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return authenticated ? <Navigate to={from || "/"} replace /> : children;
}

function App() {
  return (
    <Suspense fallback={<div className="route-loading">Đang tải trang...</div>}>
      <Routes>
      <Route path="admin/*" element={<ProtectedWebRoute role="admin"><AdminApp /></ProtectedWebRoute>} />
      <Route path="admin.html" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<ProtectedWebRoute role="owner"><OwnerApp /></ProtectedWebRoute>} />

      <Route path="trace/:batchCode" element={<TraceabilityPage />} />
      <Route path="login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
      </Routes>
    </Suspense>
  );
}

export default App;
