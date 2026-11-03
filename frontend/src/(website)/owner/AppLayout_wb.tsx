import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import useListViewport from "../../hooks/use_list_viewport_wb";
import Header from "../../components/owner/Header_wb";
import Sidebar from "../../components/owner/Sidebar_wb";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { notificationService } from "../../sevices/notificationService_wb";

function AppLayout() {
  const contentRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useListViewport(contentRef, pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { farmError, refreshFarms } = useFarmContext();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        if (active) setUnreadCount(count);
      } catch {
        if (active) setUnreadCount(0);
      }
    };
    const timer = window.setTimeout(() => void loadUnreadCount(), 0);
    const interval = window.setInterval(() => { if (!document.hidden) void loadUnreadCount(); }, 60000);
    const events = [
      "notifications-updated",
      "tasks-updated",
      "farming-logs-updated",
      "seasons-updated",
      "harvest-batches-updated",
    ];
    events.forEach(eventName => window.addEventListener(eventName, loadUnreadCount));

    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      events.forEach(eventName => window.removeEventListener(eventName, loadUnreadCount));
    };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        unreadCount={unreadCount}
      />

      <div className="app-main">
        <Header onMenuClick={() => setSidebarOpen(true)} unreadCount={unreadCount} />

        <main className="app-content" ref={contentRef}>
          {farmError && <div className="form-error-block">{farmError} <button type="button" onClick={() => void refreshFarms()}>Thử lại</button></div>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
