import "../styles/farming-logs.css";
import {
  AlertCircle,
  Camera,
  ChevronRight,
  ClipboardList,
  FilterX,
  MapPinned,
  MessageSquareText,
  NotebookPen,
  Search,
  UserRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { farmingLogService } from "../services/farmingLogService";
import { plotService } from "../services/plotService";
import { seasonService } from "../services/seasonService";
import type { FarmingLog } from "../types/farmingLog";
import type { Plot } from "../types/plot";
import type { Season } from "../types/season";

type PeriodFilter = "all" | "today" | "7days" | "30days";
type NoteFilter = "all" | "unresolved" | "resolved" | "none";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function isWithinPeriod(value: string, period: PeriodFilter) {
  if (period === "all") {
    return true;
  }

  const loggedAt = new Date(value);
  const now = new Date();

  if (period === "today") {
    return (
      loggedAt.getFullYear() === now.getFullYear() &&
      loggedAt.getMonth() === now.getMonth() &&
      loggedAt.getDate() === now.getDate()
    );
  }

  const days = period === "7days" ? 7 : 30;
  return loggedAt.getTime() >= now.getTime() - days * 86400000;
}

function FarmingLogsPage() {
  const { selectedFarmId, selectedFarm, farms } = useFarmContext();
  const [logs, setLogs] = useState<FarmingLog[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [searchText, setSearchText] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilter>("all");
  const [noteFilter, setNoteFilter] = useState<NoteFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequest = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");

    try {
      const [logData, seasonData, plotData] = await Promise.all([
        farmingLogService.getAll(selectedFarmId),
        seasonService.getAll(selectedFarmId),
        plotService.getAll(selectedFarmId),
      ]);

      if (request !== loadRequest.current) return;

      setLogs(logData);
      setSeasons(seasonData);
      setPlots(plotData);
    } catch {
      if (request !== loadRequest.current) return;
      setError("Không thể tải danh sách nhật ký canh tác.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [selectedFarmId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  useEffect(() => {
    window.addEventListener("farming-logs-updated", loadData);
    return () =>
      window.removeEventListener("farming-logs-updated", loadData);
  }, [loadData]);

  const seasonById = useMemo(
    () => new Map(seasons.map((season) => [season.id, season])),
    [seasons],
  );
  const plotById = useMemo(
    () => new Map(plots.map((plot) => [plot.id, plot])),
    [plots],
  );
  const farmById = useMemo(
    () => new Map(farms.map((farm) => [farm.id, farm])),
    [farms],
  );

  const activities = useMemo(
    () =>
      Array.from(new Set(logs.map((log) => log.activityType))).sort(
        (first, second) => first.localeCompare(second, "vi"),
      ),
    [logs],
  );
  const effectiveSeasonFilter = seasons.some(
    (season) => season.id === seasonFilter,
  )
    ? seasonFilter
    : "all";
  const effectiveActivityFilter = activities.includes(activityFilter)
    ? activityFilter
    : "all";

  const filteredLogs = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase("vi");

    return logs.filter((log) => {
      const season = seasonById.get(log.seasonId);
      const plot = plotById.get(log.plotId);
      const unresolvedCount = log.notes.filter(
        (note) => !note.resolved,
      ).length;
      const resolvedCount = log.notes.filter(
        (note) => note.resolved,
      ).length;

      const matchesSearch =
        !keyword ||
        [
          log.workerName,
          log.activityType,
          log.content,
          season?.name,
          season?.code,
          plot?.name,
          plot?.code,
        ].some((value) =>
          value?.toLocaleLowerCase("vi").includes(keyword),
        );

      const matchesNotes =
        noteFilter === "all" ||
        (noteFilter === "unresolved" && unresolvedCount > 0) ||
        (noteFilter === "resolved" && resolvedCount > 0) ||
        (noteFilter === "none" && log.notes.length === 0);

      return (
        matchesSearch &&
        (effectiveSeasonFilter === "all" ||
          log.seasonId === effectiveSeasonFilter) &&
        (effectiveActivityFilter === "all" ||
          log.activityType === effectiveActivityFilter) &&
        isWithinPeriod(log.loggedAt, periodFilter) &&
        matchesNotes
      );
    });
  }, [
    logs,
    searchText,
    effectiveSeasonFilter,
    effectiveActivityFilter,
    periodFilter,
    noteFilter,
    seasonById,
    plotById,
  ]);

  const todayCount = logs.filter((log) =>
    isWithinPeriod(log.loggedAt, "today"),
  ).length;
  const attentionCount = logs.filter((log) =>
    log.notes.some((note) => !note.resolved),
  ).length;
  const photoCount = logs.reduce(
    (total, log) => total + log.photos.length,
    0,
  );
  const hasActiveFilters =
    searchText ||
    seasonFilter !== "all" ||
    activityFilter !== "all" ||
    periodFilter !== "all" ||
    noteFilter !== "all";

  const resetFilters = () => {
    setSearchText("");
    setSeasonFilter("all");
    setActivityFilter("all");
    setPeriodFilter("all");
    setNoteFilter("all");
  };

  const scopeName =
    selectedFarmId === "all"
      ? "tất cả nông trại"
      : selectedFarm?.name ?? "nông trại đã chọn";

  return (
    <div className="page farming-logs-page">
      <div className="page-heading farming-logs-heading">
        <div>
          <h1>Nhật ký canh tác</h1>
          <p>
            Theo dõi hoạt động thực tế tại {scopeName}. Nhật ký được
            ghi nhận trực tiếp, không qua bước phê duyệt.
          </p>
        </div>
      </div>

      <section className="farming-log-summary-grid">
        <article className="farming-log-summary card">
          <NotebookPen size={21} />
          <span>Tổng nhật ký</span>
          <strong>{logs.length}</strong>
        </article>
        <article className="farming-log-summary farming-log-summary-today card">
          <ClipboardList size={21} />
          <span>Ghi trong hôm nay</span>
          <strong>{todayCount}</strong>
        </article>
        <article className="farming-log-summary farming-log-summary-attention card">
          <AlertCircle size={21} />
          <span>Cần theo dõi</span>
          <strong>{attentionCount}</strong>
        </article>
        <article className="farming-log-summary farming-log-summary-photo card">
          <Camera size={21} />
          <span>Ảnh hiện trạng</span>
          <strong>{photoCount}</strong>
        </article>
      </section>

      <section className="farming-log-list-panel card">
        <div className="farming-log-toolbar">
          <label className="farming-log-search">
            <Search size={18} />
            <input
              type="search"
              value={searchText}
              placeholder="Tìm người ghi, hoạt động, mùa vụ..."
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>

          <select
            value={periodFilter}
            aria-label="Lọc theo thời gian"
            onChange={(event) =>
              setPeriodFilter(event.target.value as PeriodFilter)
            }
          >
            <option value="all">Mọi thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày gần đây</option>
            <option value="30days">30 ngày gần đây</option>
          </select>

          <select
            value={effectiveSeasonFilter}
            aria-label="Lọc theo mùa vụ"
            onChange={(event) => setSeasonFilter(event.target.value)}
          >
            <option value="all">Tất cả mùa vụ</option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>

          <select
            value={effectiveActivityFilter}
            aria-label="Lọc theo hoạt động"
            onChange={(event) => setActivityFilter(event.target.value)}
          >
            <option value="all">Tất cả hoạt động</option>
            {activities.map((activity) => (
              <option key={activity} value={activity}>
                {activity}
              </option>
            ))}
          </select>

          <select
            value={noteFilter}
            aria-label="Lọc theo ghi chú"
            onChange={(event) =>
              setNoteFilter(event.target.value as NoteFilter)
            }
          >
            <option value="all">Mọi ghi chú</option>
            <option value="unresolved">Cần theo dõi</option>
            <option value="resolved">Đã xử lý</option>
            <option value="none">Chưa có ghi chú</option>
          </select>

          {hasActiveFilters && (
            <button
              className="farming-log-reset"
              type="button"
              onClick={resetFilters}
            >
              <FilterX size={16} />
              Xóa lọc
            </button>
          )}
        </div>

        <div className="farming-log-result-bar">
          <span>{filteredLogs.length} nhật ký phù hợp</span>
          <span>
            Ghi chú chỉ dùng để nhắc nhở, không thay đổi trạng thái nhật ký.
          </span>
        </div>

        {error && <div className="page-error">{error}</div>}

        {loading ? (
          <div className="page-loading">Đang tải nhật ký canh tác...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="farming-log-empty">
            <NotebookPen size={34} />
            <strong>Không có nhật ký phù hợp</strong>
            <span>
              Thử thay đổi bộ lọc hoặc chọn nông trại khác trên thanh đầu
              trang.
            </span>
          </div>
        ) : (
          <div className="farming-log-list">
            {filteredLogs.map((log) => {
              const season = seasonById.get(log.seasonId);
              const plot = plotById.get(log.plotId);
              const farm = farmById.get(log.farmId);
              const unresolvedCount = log.notes.filter(
                (note) => !note.resolved,
              ).length;

              return (
                <article className="farming-log-row" key={log.id}>
                  <div className="farming-log-row-icon">
                    <NotebookPen size={21} />
                  </div>

                  <div className="farming-log-row-main">
                    <div className="farming-log-row-title">
                      <h2>{log.activityType}</h2>
                      <span className="farming-log-recorded-badge">
                        Đã ghi nhận
                      </span>
                      {unresolvedCount > 0 && (
                        <span className="farming-log-attention-badge">
                          {unresolvedCount} nhắc nhở chưa xử lý
                        </span>
                      )}
                    </div>

                    <p>{log.content}</p>

                    <div className="farming-log-row-meta">
                      <span>
                        <UserRound size={14} /> {log.workerName}
                      </span>
                      <span>
                        <MapPinned size={14} /> {plot?.name ?? "Vùng trồng"}
                      </span>
                      <span>
                        {season?.name ?? "Mùa vụ không xác định"}
                      </span>
                      {selectedFarmId === "all" && (
                        <span>{farm?.name ?? "Nông trại"}</span>
                      )}
                      <span>{formatDateTime(log.loggedAt)}</span>
                    </div>
                  </div>

                  <div className="farming-log-row-aside">
                    <div>
                      <span>
                        <Camera size={15} /> {log.photos.length} ảnh
                      </span>
                      <span>
                        <MessageSquareText size={15} /> {log.notes.length} ghi
                        chú
                      </span>
                    </div>
                    <Link
                      className="farming-log-detail-link"
                      to={`/farming-logs/${log.id}`}
                      aria-label={`Xem nhật ký ${log.activityType}`}
                    >
                      Xem chi tiết
                      <ChevronRight size={17} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default FarmingLogsPage;

