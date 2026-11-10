import {
  Bell,
  Menu,
  Sprout,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { accountService } from "../../sevices/accountService_wb";

type HeaderProps = {
  onMenuClick: () => void;
  unreadCount: number;
};

export function WebHeader({ onMenuClick, unreadCount = 0, admin = false, selector }: Omit<HeaderProps, "unreadCount"> & { unreadCount?: number; admin?: boolean; selector?: React.ReactNode }) {
  const navigate = useNavigate();
  const role = admin ? "Quản trị viên" : "Chủ nông trại";
  const [accountName, setAccountName] = useState(role);

  useEffect(() => {
    let active = true;
    const loadAccount = () => {
      void accountService.getCurrentUser()
        .then((account) => { if (active) setAccountName(account.full_name); })
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
    <header className="header">
      <div className="header-left">
        <button
          className="header-menu-button"
          type="button"
          aria-label="Mở menu"
          onClick={onMenuClick}
        >
          <Menu size={22} />
        </button>

        <div className="header-system">
          <span>Hệ thống quản lý</span>
          <strong>AgriFarm</strong>
        </div>
      </div>

      {selector}

      <div className="header-actions">
        {!admin && (        <button
          className="header-icon-button"
          type="button"
          aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}
          onClick={() => navigate("/notifications")}
        >
          <Bell size={23} aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="notification-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>)}

        <button
          className="header-user"
          type="button"
          onClick={() => navigate(admin ? "/admin/account" : "/account")}
        >
          <span className="header-avatar">{accountInitials || "HH"}</span>

          <span className="header-user-info">
            <strong>{accountName}</strong>
            <small>{role}</small>
          </span>
        </button>
      </div>
    </header>
  );
}

export default function Header(props: HeaderProps) {
  const { pathname } = useLocation();
  const { farms, selectedFarmId, loadingFarms, selectFarm } = useFarmContext();
  const showFarmSelector = !pathname.startsWith("/farms");
      const selector = showFarmSelector ? (
        <label className="header-farm-selector">
          <Sprout size={18} />

          <select
            value={selectedFarmId}
            disabled={loadingFarms}
            aria-label="Chọn nông trại"
            onChange={(event) =>
              selectFarm(event.target.value)
            }
          >
            <option value="all">
              Tất cả nông trại
            </option>

            {farms.map((farm) => (
              <option
                key={farm.id}
                value={farm.id}
              >
                {farm.name}
                {farm.status === "suspended"
                  ? " (Tạm ngưng)"
                  : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null;

  return <WebHeader {...props} selector={selector} />;
}
