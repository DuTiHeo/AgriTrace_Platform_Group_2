import { LogOut } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ListActionConfirmation } from "../../components/owner/ListRowActions_wb";
import { WebHeader } from "../../components/owner/Header_wb";
import { Icon } from "../../components/admin/AdminUi_wb";
import { pages, type AdminPage } from "../../features/admin/data_wb";
import { accountService } from "../../sevices/accountService_wb";
import "../../styles/admin_wb.css";

export default function AppLayout() {
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  return <div className={menuOpen ? "admin-app admin-menu-open" : "admin-app"}>
    <aside>
      <Link className="brand" to="/admin">
        <img src="/images/icon.png" alt="" width="40" height="40" />
        <span><strong>AgriFarm</strong><small>Quản trị hệ thống</small></span>
      </Link>
      <nav aria-label="Điều hướng quản trị">
        {(Object.keys(pages) as AdminPage[]).map(key => <NavLink key={key} to={key === "overview" ? "/admin" : `/admin/${key}`} end onClick={() => setMenuOpen(false)}>
          <Icon page={key} />{pages[key][0]}
        </NavLink>)}
      </nav>
      <button className="sidebar-account sidebar-logout" type="button" onClick={() => setLogoutOpen(true)}>
        <LogOut size={20} /><span>Đăng xuất</span>
      </button>
    </aside>
    <div className="workspace">
      <WebHeader admin onMenuClick={() => setMenuOpen(open => !open)} />
      <main>{<Outlet />}</main>
    </div>
    {logoutOpen && <ListActionConfirmation
      action="status"
      title="Đăng xuất?"
      confirmLabel="Đăng xuất"
      name="AgriFarm"
      statusLabel="Đăng xuất"
      description="Bạn muốn đăng xuất khỏi tài khoản hiện tại?"
      onClose={() => setLogoutOpen(false)}
      onConfirm={async () => {
        try {
          await accountService.logout();
        } catch {
          // The service clears the local session even when the API fails.
        } finally {
          setLogoutOpen(false);
          navigate("/login", { replace: true });
        }
      }}
    />}
  </div>;
}
