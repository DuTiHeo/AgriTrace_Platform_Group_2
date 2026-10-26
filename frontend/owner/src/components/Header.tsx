import {
  Bell,
  Menu,
  Sprout,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { accountService } from "../services/accountService";
import { notificationService } from "../services/notificationService";

type HeaderProps = {
  onMenuClick: () => void;
};

function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [accountName, setAccountName] = useState("Chủ nông trại");

  const {
    farms,
    selectedFarmId,
    loadingFarms,
    selectFarm,
  } = useFarmContext();

  const showFarmSelector =
    !location.pathname.startsWith("/farms");

  const loadUnreadCount = useCallback(async () => {
    try {
      setUnreadCount(await notificationService.getUnreadCount());
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUnreadCount(), 0);
    const events = [
      "notifications-updated",
      "tasks-updated",
      "farming-logs-updated",
      "seasons-updated",
      "harvest-batches-updated",
    ];
    events.forEach((eventName) =>
      window.addEventListener(eventName, loadUnreadCount),
    );

    return () => {
      window.clearTimeout(timer);
      events.forEach((eventName) =>
        window.removeEventListener(eventName, loadUnreadCount),
      );
    };
  }, [loadUnreadCount]);

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
          <strong>Farmer QuickLog</strong>
        </div>
      </div>

      {showFarmSelector && (
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
      )}

      <div className="header-actions">
        <button
          className="header-icon-button"
          type="button"
          aria-label={`Thông báo${unreadCount ? `, ${unreadCount} chưa đọc` : ""}`}
          onClick={() => navigate("/notifications")}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="notification-count">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <button
          className="header-user"
          type="button"
          onClick={() => navigate("/account")}
        >
          <span className="header-avatar">{accountInitials || "HH"}</span>

          <span className="header-user-info">
            <strong>{accountName}</strong>
            <small>Chủ nông trại</small>
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;
