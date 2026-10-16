import { useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { useFarmContext } from "../contexts/FarmContext";

function AppLayout() {
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

        <main className="app-content">
          {farmError && <div className="form-error-block">{farmError} <button type="button" onClick={() => void refreshFarms()}>Thử lại</button></div>}
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
