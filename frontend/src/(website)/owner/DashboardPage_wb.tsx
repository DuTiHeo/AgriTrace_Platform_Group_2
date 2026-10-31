import "../../styles/dashboard_wb.css";
import {
  ClipboardCheck,
  MapPinned,
  PackageCheck,
  Sprout,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { harvestService } from "../../sevices/harvestService_wb";
import { plotService } from "../../sevices/plotService_wb";
import { seasonService } from "../../sevices/seasonService_wb";
import { taskService } from "../../sevices/taskService_wb";
import { httpClient } from "../../sevices/httpClient_wb";
import type { HarvestBatch } from "../../features/owner/harvest_wb";
import type { Plot } from "../../features/owner/plot_wb";
import type { Season } from "../../features/owner/season_wb";
import type { Task } from "../../features/owner/task_wb";

type DashboardData = {
  plots: Array<Pick<Plot, "id" | "name" | "status" | "area">>;
  seasons: Season[];
  tasks: Task[];
  batches: Array<Pick<HarvestBatch, "id" | "status" | "harvestDate" | "quantityKg">>;
};

const emptyData: DashboardData = {
  plots: [], seasons: [], tasks: [], batches: [],
};

const taskStatus = {
  pending: { label: "Đã nhận", className: "pending" },
  in_progress: { label: "Đang thực hiện", className: "working" },
  completed: { label: "Đã hoàn thành", className: "completed" },
  cancelled: { label: "Đã thu hồi", className: "pending" },
  incomplete: { label: "Chưa hoàn thành", className: "incomplete" },
} as const;

const seasonStatus = {
  planned: { label: "Đã lên kế hoạch", className: "pending" },
  active: { label: "Đang canh tác", className: "working" },
  ready: { label: "Sẵn sàng thu hoạch", className: "completed" },
  completed: { label: "Đã hoàn thành", className: "completed" },
  cancelled: { label: "Đã hủy", className: "cancelled" },
} as const;

const dashboardDateFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
});

function dateKey(value: string | Date): string {
  // Date-only API fields already represent the business calendar date.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? dashboardDateFormat.format(date) : "";
}

function DashboardPage() {
  const { selectedFarm, selectedFarmId, loadingFarms } = useFarmContext();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today, setToday] = useState(() => dateKey(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setToday(dateKey(new Date())), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadRequest = useRef(0);
  const loadedFarm = useRef<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const loadData = useCallback(async (force = false) => {
    const request = ++loadRequest.current;
    if (force) httpClient.invalidateCache();
    if (loadedFarm.current !== selectedFarmId) {
      setData(emptyData);
      setHasData(false);
      setLoading(true);
    }
    setError("");
    try {
      const [plots, seasons, tasks, batches] = await Promise.all([
        plotService.getOverview(selectedFarmId),
        seasonService.getOverview(selectedFarmId),
        taskService.getAll(selectedFarmId),
        harvestService.getOverview(selectedFarmId, today),
      ]);
      if (request !== loadRequest.current) return;
      setData({ plots, seasons, tasks, batches });
      setHasData(true);
      loadedFarm.current = selectedFarmId;
    } catch (cause) {
      if (request !== loadRequest.current) return;
      setError(cause instanceof Error ? `Không thể cập nhật tổng quan: ${cause.message}` : "Không thể tải dữ liệu tổng quan. Vui lòng thử lại.");
    } finally {
      if (request === loadRequest.current) {
        setLoading(false);
      }
    }
  }, [selectedFarmId, today]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    const refresh = () => { void loadData(true); };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    const events = [
      "plots-updated", "seasons-updated", "tasks-updated",
      "harvest-batches-updated",
    ];
    events.forEach((eventName) => window.addEventListener(eventName, refresh));
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refresh);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      loadRequest.current += 1;
      events.forEach((eventName) =>
        window.removeEventListener(eventName, refresh),
      );
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refresh);
    };
  }, [loadData]);

  const farmName = selectedFarmId === "all"
    ? "tất cả nông trại"
    : selectedFarm?.name ?? "nông trại đã chọn";
  const activePlots = data.plots.filter((plot) => plot.status === "active");
  const visibleSeasons = useMemo(
    () => data.seasons
      .filter((season) =>
        ["planned", "active", "ready"].includes(season.status)
        || dateKey(season.updatedAt) === today,
      )
      .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt)),
    [data.seasons, today],
  );
  const visibleTasks = useMemo(
    () => data.tasks
      .filter((task) => {
        const start = dateKey(task.startAt || task.dueAt);
        const end = dateKey(task.dueAt || task.startAt);
        return start !== "" && end !== "" && start <= today && end >= today;
      })
      .sort((first, second) => Date.parse(first.dueAt) - Date.parse(second.dueAt)),
    [data.tasks, today],
  );
  const readySeasons = visibleSeasons.filter((season) => season.status === "ready").length;
  const activeTasks = visibleTasks.filter((task) => task.status !== "cancelled");
  const completedTasks = activeTasks.filter((task) => task.status === "completed").length;
  const activeBatches = data.batches.filter(
    (batch) => batch.status !== "cancelled" && dateKey(batch.harvestDate) === today,
  );
  const totalArea = activePlots.reduce((total, plot) => total + plot.area, 0);
  const totalQuantity = activeBatches.reduce(
    (total, batch) => total + batch.quantityKg, 0,
  );
  const summaryItems = [
    {
      label: "Vùng trồng đang dùng",
      value: String(activePlots.length),
      note: `Tổng diện tích ${new Intl.NumberFormat("vi-VN").format(totalArea)} ha`,
      icon: MapPinned, color: "green", to: "/plots",
    },
    {
      label: "Mùa vụ đang theo dõi", value: String(visibleSeasons.filter((season) => ["planned", "active", "ready"].includes(season.status)).length),
      note: `${readySeasons} mùa vụ sẵn sàng thu hoạch`,
      icon: Sprout, color: "lime", to: "/seasons",
    },
    {
      label: "Công việc hôm nay", value: String(activeTasks.length),
      note: `${completedTasks} công việc đã hoàn thành`,
      icon: ClipboardCheck, color: "blue", to: "/tasks",
    },
    {
      label: "Sản lượng thu hoạch hôm nay",
      value: `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(totalQuantity)} kg`,
      note: `${activeBatches.length} lô thu hoạch còn hiệu lực`,
      icon: PackageCheck, color: "orange", to: "/harvests",
    },
  ];

  const plotById = useMemo(
    () => new Map(data.plots.map((plot) => [plot.id, plot])),
    [data.plots],
  );

  return (
    <div className="page dashboard-page">
      <div className="page-heading dashboard-heading"><div>
        <h1>Tổng quan</h1>
        <p>{loadingFarms || loading
          ? "Đang tổng hợp dữ liệu nông trại..."
          : `Tình hình hoạt động hôm nay của ${farmName} · ${today.split("-").reverse().join("/")}.`}</p>
      </div>
      </div>
      {error && <div className="form-error-block" role="alert">{error}</div>}

      <section className="summary-grid" aria-label="Chỉ số tổng quan">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link className="summary-card card dashboard-card-link" key={item.label} to={item.to}>
              <div className={`summary-icon summary-icon-${item.color}`}><Icon size={22} strokeWidth={1.9} /></div>
              <div className="summary-content"><span>{item.label}</span><strong>{hasData ? item.value : "—"}</strong><small>{hasData ? item.note : loading ? "Đang tải..." : "Chưa tải được dữ liệu"}</small></div>
            </Link>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel card">
          <div className="panel-heading">
            <div><h2>Công việc hôm nay</h2><p>Các công việc có lịch thực hiện trong hôm nay.</p></div>
            <div className="task-progress"><strong>{completedTasks}/{activeTasks.length}</strong><span>Hoàn thành</span></div>
          </div>
          <div className="task-list dashboard-scroll-list" role="region" aria-label="Công việc hôm nay" tabIndex={0} aria-busy={loading}>
            {loading && <div className="dashboard-empty">Đang tải công việc...</div>}
            {!loading && !hasData && <div className="dashboard-empty">Không tải được công việc. Vui lòng tải lại trang để thử lại.</div>}
            {!loading && hasData && visibleTasks.length === 0 && <div className="dashboard-empty">Hôm nay chưa có công việc.</div>}
            {visibleTasks.map((task) => {
              const status = taskStatus[task.status] ?? { label: task.status, className: "pending" };
              return (
                <div className="task-row" key={task.id}>
                  <div className="task-detail"><strong>{task.content}</strong><span>{plotById.get(task.plotId)?.name ?? "Vùng trồng"} · {task.assigneeName}</span></div>
                  <span className={`status-badge status-${status.className}`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="dashboard-panel card">
          <div className="panel-heading">
            <div><h2>Danh sách mùa vụ</h2><p>Mùa vụ đang theo dõi và mùa vụ kết thúc được cập nhật hôm nay.</p></div>
            <Link className="dashboard-seasons-all" to="/seasons">Xem tất cả</Link>
          </div>
          <div className="activity-list dashboard-scroll-list" role="region" aria-label="Danh sách mùa vụ" tabIndex={0} aria-busy={loading}>
            {loading && <div className="dashboard-empty">Đang tải mùa vụ...</div>}
            {!loading && !hasData && <div className="dashboard-empty">Không tải được mùa vụ. Vui lòng tải lại trang để thử lại.</div>}
            {!loading && hasData && visibleSeasons.length === 0 && <div className="dashboard-empty">Chưa có mùa vụ trong phạm vi hôm nay.</div>}
            {!loading && visibleSeasons.map((season) => {
              const status = seasonStatus[season.status];
              return (
                <Link className="activity-row dashboard-season-row dashboard-activity-link" key={season.id} to={`/seasons/${season.id}`}>
                  <div className="activity-icon"><Sprout size={17} aria-hidden="true" /></div>
                  <div className="activity-content"><strong>{season.name}</strong><span>{plotById.get(season.plotId)?.name ?? "Vùng trồng"} · {season.varietyName || season.cropType}</span></div>
                  <span className={`status-badge status-${status.className}`}>{status.label}</span>
                </Link>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}

export default DashboardPage;
