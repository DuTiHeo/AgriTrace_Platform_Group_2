import { useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import useListViewport from "../../hooks/use_list_viewport_wb";
import Header from "../../components/owner/Header_wb";
import Sidebar from "../../components/owner/Sidebar_wb";
import { useFarmContext } from "../../contexts/FarmContext_wb";

function AppLayout() {
  const contentRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useListViewport(contentRef, pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { farmError, refreshFarms } = useFarmContext();

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="app-content" ref={contentRef}>
          {farmError && <div className="form-error-block">{farmError} <button type="button" onClick={() => void refreshFarms()}>Thử lại</button></div>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
