import {
  CalendarRange,
  ClipboardCheck,
  LayoutDashboard,
  LifeBuoy,
  MapPinned,
  NotebookPen,
  PackageCheck,
  Sprout,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  NavLink,
  useLocation,
} from "react-router-dom";
import { accountService } from "../services/accountService";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
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
    label: "Hỗ trợ & báo lỗi",
    path: "/support",
    icon: LifeBuoy,
  },
];

function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const [accountName, setAccountName] = useState("Chủ nông trại");

  useEffect(() => {
    let active = true;
    const loadAccount = () => {
      void accountService
        .getAccount()
        .then((account) => { if (active) setAccountName(account.fullName); })
        .catch(() => { if (active) setAccountName("Không thể tải tài khoản"); });
    };
    const timer = window.setTimeout(loadAccount, 0);
    window.addEventListener("account-updated", loadAccount);

    return () => {
      window.clearTimeout(timer);
      active = false;
      window.removeEventListener("account-updated", loadAccount);
    };
  }, []);

  const accountInitials = accountName
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi");

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
            src="/branding/logo.svg"
            alt="Farmer QuickLog"
          />

          <div className="sidebar-brand-text">
            <strong>Farmer QuickLog</strong>
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
              </NavLink>
            );
          })}
        </nav>

        <NavLink className="sidebar-account" to="/account" onClick={onClose}>
          <div className="sidebar-avatar">{accountInitials || "HH"}</div>

          <div className="sidebar-account-info">
            <strong>{accountName}</strong>
            <span>Chủ nông trại</span>
          </div>
        </NavLink>
      </aside>
    </>
  );
}

export default Sidebar;
