import { ListActionConfirmation } from "./ListRowActions_wb";
import {
  Bell,
  CalendarRange,
  ClipboardCheck,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPinned,
  NotebookPen,
  PackageCheck,
  Sprout,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { accountService } from "../../sevices/accountService_wb";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  unreadCount: number;
};

const menuItems = [
  {
    label: "Tổng quan",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Nông trại",
    path: "/farms",
    icon: Sprout,
  },
  {
    label: "Vùng trồng",
    path: "/plots",
    icon: MapPinned,
  },
  {
    label: "Mùa vụ",
    path: "/seasons",
    icon: CalendarRange,
  },
  {
    label: "Nhân sự & Tổ",
    path: "/personnel",
    icon: Users,
    relatedPaths: ["/personnel", "/teams"],
  },
  {
    label: "Công việc",
    path: "/tasks",
    icon: ClipboardCheck,
  },
  {
    label: "Nhật ký canh tác",
    path: "/farming-logs",
    icon: NotebookPen,
  },
  {
    label: "Thu hoạch",
    path: "/harvests",
    icon: PackageCheck,
  },
  {
    label: "Thông báo",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "Hỗ trợ & báo lỗi",
    path: "/support",
    icon: LifeBuoy,
  },
];

function Sidebar({ open, onClose, unreadCount }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <>
      {open && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Đóng menu"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar ${
          open ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <img
            className="sidebar-logo"
            src="/images/icon.png"
            alt="AgriFarm"
          />

          <div className="sidebar-brand-text">
            <strong>AgriFarm</strong>
            <span>Quản trị nông trại</span>
          </div>

          <button
            className="sidebar-close"
            type="button"
            aria-label="Đóng menu"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-navigation">
          <p className="sidebar-section-title">
            Quản lý
          </p>

          {menuItems.map((item) => {
            const Icon = item.icon;

            const relatedPathIsActive =
              item.relatedPaths?.some(
                (path) =>
                  location.pathname === path ||
                  location.pathname.startsWith(
                    `${path}/`,
                  ),
              ) ?? false;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.path === "/notifications" && unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : undefined}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `sidebar-link ${
                    isActive || relatedPathIsActive
                      ? "sidebar-link-active"
                      : ""
                  }`
                }
                onClick={onClose}
              >
                <Icon
                  size={19}
                  strokeWidth={1.9}
                />
                <span>{item.label}</span>
                {item.path === "/notifications" && unreadCount > 0 && (
                  <span className="sidebar-unread-count" aria-hidden="true">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <button className="sidebar-account sidebar-logout" type="button" onClick={() => setLogoutOpen(true)}><LogOut size={20} /><span>Đăng xuất</span></button>
      </aside>
      {logoutOpen && <ListActionConfirmation action="status" title="Đăng xuất?" confirmLabel="Đăng xuất" name="AgriFarm" statusLabel="Đăng xuất" description="Bạn muốn đăng xuất khỏi tài khoản hiện tại?" onClose={() => setLogoutOpen(false)} onConfirm={async () => { try { await accountService.logout(); } catch { /* The service clears the local session even when the API is unavailable. */ } finally { onClose(); navigate("/login", { replace: true }); } }} />}
    </>
  );
}

export default Sidebar;

