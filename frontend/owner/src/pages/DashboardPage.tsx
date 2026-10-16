import "../styles/dashboard.css";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPinned,
  NotebookPen,
  PackageCheck,
  Sprout,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { farmingLogService } from "../services/farmingLogService";
import { harvestService } from "../services/harvestService";
import { plotService } from "../services/plotService";
import { seasonService } from "../services/seasonService";
import { taskService } from "../services/taskService";
import type { FarmingLog } from "../types/farmingLog";
import type { HarvestBatch } from "../types/harvest";
import type { Plot } from "../types/plot";
import type { Season } from "../types/season";
import type { Task } from "../types/task";

type DashboardData = {
  plots: Plot[];
  seasons: Season[];
  tasks: Task[];
  batches: HarvestBatch[];
  logs: FarmingLog[];
};

const emptyData: DashboardData = {
  plots: [], seasons: [], tasks: [], batches: [], logs: [],
};

const taskStatus = {
  in_progress: { label: "Đang thực hiện", className: "working" },
  completed: { label: "Đã hoàn thành", className: "completed" },
  cancelled: { label: "Đã hủy", className: "pending" },
} as const;

function formatRelativeTime(value: string) {
  const difference = Date.now() - Date.parse(value);
  if (!Number.isFinite(difference) || difference < 0) return "Vừa cập nhật";
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Hôm qua" : `${days} ngày trước`;
}

function DashboardPage() {
  const { selectedFarm, selectedFarmId, loadingFarms } = useFarmContext();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequest = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");
    try {
      const [plots, seasons, tasks, batches, logs] = await Promise.all([
        plotService.getAll(selectedFarmId),
        seasonService.getAll(selectedFarmId),
        taskService.getAll(selectedFarmId),
        harvestService.getAll(selectedFarmId),
        farmingLogService.getAll(selectedFarmId),
      ]);
      if (request !== loadRequest.current) return;
      setData({ plots, seasons, tasks, batches, logs });
    } catch {
      if (request !== loadRequest.current) return;
      setError("Không thể tải dữ liệu tổng quan. Vui lòng thử lại.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [selectedFarmId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    const events = [
      "plots-updated", "seasons-updated", "tasks-updated",
      "harvest-batches-updated", "farming-logs-updated",
    ];
    events.forEach((eventName) => window.addEventListener(eventName, loadData));
    return () => {
      window.clearTimeout(timer);
      loadRequest.current += 1;
      events.forEach((eventName) =>
        window.removeEventListener(eventName, loadData),
      );
    };
  }, [loadData]);

  const farmName = selectedFarmId === "all"
    ? "tất cả nông trại"
    : selectedFarm?.name ?? "nông trại đã chọn";
  const activeSeasons = data.seasons.filter((season) =>
    ["planned", "active", "ready"].includes(season.status),
  );
  const readySeasons = data.seasons.filter(
    (season) => season.status === "ready",
  ).length;
  const activeTasks = data.tasks.filter((task) => task.status !== "cancelled");
  const completedTasks = activeTasks.filter(
    (task) => task.status === "completed",
  ).length;
  const activeBatches = data.batches.filter(
    (batch) => batch.status !== "cancelled",
  );
  const totalArea = data.plots
    .filter((plot) => plot.status === "active")
    .reduce((total, plot) => total + plot.area, 0);
  const totalQuantity = activeBatches.reduce(
    (total, batch) => total + batch.quantityKg, 0,
  );
  const summaryItems = [
    {
      label: "Vùng trồng đang dùng",
      value: String(data.plots.filter((plot) => plot.status === "active").length),
      note: `Tổng diện tích ${new Intl.NumberFormat("vi-VN").format(totalArea)} ha`,
      icon: MapPinned, color: "green", to: "/plots",
    },
    {
      label: "Mùa vụ đang theo dõi", value: String(activeSeasons.length),
      note: `${readySeasons} mùa vụ sẵn sàng thu hoạch`,
      icon: Sprout, color: "lime", to: "/seasons",
    },
    {
      label: "Công việc", value: String(activeTasks.length),
      note: `${completedTasks} công việc đã hoàn thành`,
      icon: ClipboardCheck, color: "blue", to: "/tasks",
    },
    {
      label: "Sản lượng đã ghi nhận",
      value: `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(totalQuantity)} kg`,
      note: `${activeBatches.length} lô thu hoạch còn hiệu lực`,
      icon: PackageCheck, color: "orange", to: "/harvests",
    },
  ];

  const visibleTasks = useMemo(
    () => data.tasks
      .filter((task) => task.status !== "cancelled")
      .sort((first, second) => Date.parse(first.dueAt) - Date.parse(second.dueAt))
      .slice(0, 5),
    [data.tasks],
  );
  const plotById = useMemo(
    () => new Map(data.plots.map((plot) => [plot.id, plot])),
    [data.plots],
  );
  const recentActivities = useMemo(() => {
    const taskActivities = data.tasks.map((task) => ({
      id: `task-${task.id}`,
      title: task.status === "completed"
        ? `Đã xác nhận: ${task.content}`
        : `Cập nhật công việc: ${task.content}`,
      detail: `${task.assigneeName} · ${plotById.get(task.plotId)?.name ?? "Vùng trồng"}`,
      time: task.updatedAt,
      icon: task.status === "completed" ? CheckCircle2 : ClipboardCheck,
      to: "/tasks",
    }));
    const logActivities = data.logs.map((log) => ({
      id: `log-${log.id}`, title: `Nhật ký mới: ${log.activityType}`,
      detail: `${log.workerName} · ${plotById.get(log.plotId)?.name ?? "Vùng trồng"}`,
      time: log.loggedAt, icon: NotebookPen, to: `/farming-logs/${log.id}`,
    }));
    const batchActivities = data.batches.map((batch) => ({
      id: `batch-${batch.id}`, title: `Cập nhật lô thu hoạch ${batch.code}`,
      detail: `${new Intl.NumberFormat("vi-VN").format(batch.quantityKg)} kg`,
      time: batch.updatedAt, icon: PackageCheck, to: `/harvests/${batch.id}`,
    }));
    return [...taskActivities, ...logActivities, ...batchActivities]
      .sort((first, second) => Date.parse(second.time) - Date.parse(first.time))
      .slice(0, 6);
  }, [data.batches, data.logs, data.tasks, plotById]);
  const progress = activeTasks.length
    ? Math.round((completedTasks / activeTasks.length) * 100)
    : 0;

  return (
    <div className="page dashboard-page">
      <div className="page-heading dashboard-heading"><div>
        <h1>Tổng quan</h1>
        <p>{loadingFarms || loading
          ? "Đang tổng hợp dữ liệu nông trại..."
          : `Tình hình hoạt động của ${farmName}.`}</p>
      </div></div>
      {error && <div className="form-error-block">{error}</div>}

      <section className="summary-grid" aria-label="Chỉ số tổng quan">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link className="summary-card card dashboard-card-link" key={item.label} to={item.to}>
              <div className={`summary-icon summary-icon-${item.color}`}><Icon size={22} strokeWidth={1.9} /></div>
              <div className="summary-content"><span>{item.label}</span><strong>{loading ? "—" : item.value}</strong><small>{item.note}</small></div>
            </Link>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel card">
          <div className="panel-heading">
            <div><h2>Công việc gần nhất</h2><p>Ưu tiên theo hạn hoàn thành.</p></div>
            <div className="task-progress"><strong>{completedTasks}/{activeTasks.length}</strong><span>Hoàn thành</span></div>
          </div>
          <div className="progress-track" aria-label={`Đã hoàn thành ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
          <div className="task-list">
            {!loading && visibleTasks.length === 0 && <div className="dashboard-empty">Chưa có công việc. Tạo công việc từ mục Công việc.</div>}
            {visibleTasks.map((task) => {
              const status = taskStatus[task.status];
              return (
                <div className="task-row" key={task.id}>
                  <div className="task-time"><Clock3 size={16} /><span>{new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(task.dueAt))}</span></div>
                  <div className="task-detail"><strong>{task.content}</strong><span>{plotById.get(task.plotId)?.name ?? "Vùng trồng"} · {task.assigneeName}</span></div>
                  <span className={`status-badge status-${status.className}`}>{status.label}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="dashboard-panel card">
          <div className="panel-heading"><div><h2>Hoạt động gần đây</h2><p>Dữ liệu cập nhật mới nhất trong hệ thống.</p></div></div>
          <div className="activity-list">
            {!loading && recentActivities.length === 0 && <div className="dashboard-empty">Chưa có hoạt động mới.</div>}
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <Link className="activity-row dashboard-activity-link" key={activity.id} to={activity.to}>
                  <div className="activity-icon"><Icon size={17} /></div>
                  <div className="activity-content"><strong>{activity.title}</strong><span>{activity.detail}</span></div>
                  <time>{formatRelativeTime(activity.time)}</time>
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
