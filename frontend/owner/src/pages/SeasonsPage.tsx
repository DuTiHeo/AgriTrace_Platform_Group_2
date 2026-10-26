import "../styles/seasons.css";
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  MapPinned,
  Plus,
  Search,
  Sprout,
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
import { plotService } from "../services/plotService";
import { seasonService } from "../services/seasonService";
import type { Plot } from "../types/plot";
import type {
  Season,
  SeasonStatus,
} from "../types/season";

type StatusFilter = "all" | SeasonStatus;

const statusLabels: Record<SeasonStatus, string> = {
  planned: "Đã lên kế hoạch",
  active: "Đang canh tác",
  ready: "Sẵn sàng thu hoạch",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

function formatDate(date: string | null) {
  if (!date) {
    return "Chưa phát sinh";
  }

  return new Intl.DateTimeFormat("vi-VN").format(
    new Date(`${date}T00:00:00`),
  );
}

function getHarvestTimeText(season: Season) {
  if (season.status === "completed") {
    return formatDate(season.actualHarvestDate);
  }

  if (season.status === "cancelled") {
    return "Không áp dụng";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const harvestDate = new Date(
    `${season.expectedHarvestDate}T00:00:00`,
  );

  const difference = Math.ceil(
    (harvestDate.getTime() - today.getTime()) /
      86400000,
  );

  if (difference === 0) {
    return "Đến hạn hôm nay";
  }

  if (difference < 0) {
    return `Quá hạn ${Math.abs(difference)} ngày`;
  }

  return `Còn ${difference} ngày`;
}

function SeasonsPage() {
  const {
    selectedFarmId,
    selectedFarm,
  } = useFarmContext();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [searchText, setSearchText] = useState("");
  const [plotFilter, setPlotFilter] = useState("all");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequest = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");

    try {
      const [seasonData, plotData] =
        await Promise.all([
          seasonService.getAll(selectedFarmId),
          plotService.getAll(selectedFarmId),
        ]);

      if (request !== loadRequest.current) return;

      setSeasons(seasonData);
      setPlots(plotData);

      if (
        plotFilter !== "all" &&
        !plotData.some(
          (plot) => plot.id === plotFilter,
        )
      ) {
        setPlotFilter("all");
      }
    } catch {
      if (request !== loadRequest.current) return;
      setError("Không thể tải danh sách mùa vụ.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [plotFilter, selectedFarmId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  useEffect(() => {
    const handleUpdate = () => {
      void loadData();
    };

    window.addEventListener(
      "seasons-updated",
      handleUpdate,
    );

    window.addEventListener(
      "plots-updated",
      handleUpdate,
    );

    return () => {
      window.removeEventListener(
        "seasons-updated",
        handleUpdate,
      );

      window.removeEventListener(
        "plots-updated",
        handleUpdate,
      );
    };
  }, [loadData]);

  const filteredSeasons = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return seasons.filter((season) => {
      const plot = plots.find((item) => item.id === season.plotId);

      const matchesSearch =
        keyword.length === 0 ||
        season.code.toLowerCase().includes(keyword) ||
        season.name.toLowerCase().includes(keyword) ||
        season.varietyName
          .toLowerCase()
          .includes(keyword) ||
        plot?.name.toLowerCase().includes(keyword);

      const matchesPlot =
        plotFilter === "all" ||
        season.plotId === plotFilter;

      const matchesStatus =
        statusFilter === "all" ||
        season.status === statusFilter;

      return (
        matchesSearch &&
        matchesPlot &&
        matchesStatus
      );
    });
  }, [
    seasons,
    plots,
    searchText,
    plotFilter,
    statusFilter,
  ]);

  const activeCount = seasons.filter(
    (season) =>
      season.status === "planned" ||
      season.status === "active",
  ).length;

  const readyCount = seasons.filter(
    (season) => season.status === "ready",
  ).length;

  const completedCount = seasons.filter(
    (season) => season.status === "completed",
  ).length;

  const scopeName =
    selectedFarmId === "all"
      ? "tất cả nông trại"
      : selectedFarm?.name ?? "nông trại đã chọn";

  return (
    <div className="page seasons-page">
      <div className="page-heading seasons-heading">
        <div>
          <h1>Mùa vụ</h1>
          <p>
            Quản lý quá trình canh tác của {scopeName}.
          </p>
        </div>

        <Link
          className="btn btn-primary"
          to="/seasons/new"
        >
          <Plus size={18} />
          Tạo mùa vụ
        </Link>
      </div>

      <section
        className="season-summary-grid"
        aria-label="Tổng quan mùa vụ"
      >
        <article className="season-summary-card card">
          <div className="season-summary-icon">
            <CalendarDays size={21} />
          </div>

          <div>
            <span>Tổng mùa vụ</span>
            <strong>{seasons.length}</strong>
          </div>
        </article>

        <article className="season-summary-card card">
          <div className="season-summary-icon">
            <Sprout size={21} />
          </div>

          <div>
            <span>Đang triển khai</span>
            <strong>{activeCount}</strong>
          </div>
        </article>

        <article className="season-summary-card card">
          <div className="season-summary-icon ready">
            <Clock3 size={21} />
          </div>

          <div>
            <span>Sẵn sàng thu hoạch</span>
            <strong>{readyCount}</strong>
          </div>
        </article>

        <article className="season-summary-card card">
          <div className="season-summary-icon completed">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Đã hoàn thành</span>
            <strong>{completedCount}</strong>
          </div>
        </article>
      </section>

      <section className="seasons-content card">
        <div className="seasons-toolbar">
          <div className="seasons-search">
            <Search size={18} />

            <input
              type="search"
              value={searchText}
              placeholder="Tìm mã, tên hoặc giống cây..."
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />
          </div>

          <select
            value={plotFilter}
            aria-label="Lọc theo vùng trồng"
            onChange={(event) =>
              setPlotFilter(event.target.value)
            }
          >
            <option value="all">
              Tất cả vùng trồng
            </option>

            {plots.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            aria-label="Lọc theo trạng thái"
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
          >
            <option value="all">
              Tất cả trạng thái
            </option>
            <option value="planned">
              Đã lên kế hoạch
            </option>
            <option value="active">
              Đang canh tác
            </option>
            <option value="ready">
              Sẵn sàng thu hoạch
            </option>
            <option value="completed">
              Đã hoàn thành
            </option>
            <option value="cancelled">
              Đã hủy
            </option>
          </select>
        </div>

        {error && (
          <div className="page-error">{error}</div>
        )}

        {loading ? (
          <div className="page-loading">
            Đang tải mùa vụ...
          </div>
        ) : filteredSeasons.length === 0 ? (
          <div className="seasons-empty">
            <div className="seasons-empty-icon">
              <CalendarCheck2 size={29} />
            </div>

            <h2>Chưa có mùa vụ phù hợp</h2>

            <p>
              Thay đổi điều kiện tìm kiếm hoặc tạo mùa vụ
              mới.
            </p>

            <Link
              className="btn btn-primary"
              to="/seasons/new"
            >
              <Plus size={18} />
              Tạo mùa vụ
            </Link>
          </div>
        ) : (
          <div className="seasons-table-wrapper">
            <table className="seasons-table">
              <thead>
                <tr>
                  <th>Mùa vụ</th>
                  <th>Vùng trồng</th>
                  <th>Giống cây</th>
                  <th>Ngày gieo</th>
                  <th>Thu hoạch dự kiến</th>
                  <th>Thu hoạch thực tế</th>
                  <th>Trạng thái</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>

              <tbody>
                {filteredSeasons.map((season) => {
                  const plot = plots.find((item) => item.id === season.plotId);

                  return (
                    <tr key={season.id}>
                      <td>
                        <div className="season-name-cell">
                          <div className="season-table-icon">
                            <Sprout size={18} />
                          </div>

                          <div>
                            <strong>{season.name}</strong>
                            <span>{season.code}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="season-plot-cell">
                          <MapPinned size={15} />
                          <span>
                            {plot?.name ??
                              "Không xác định"}
                          </span>
                        </div>
                      </td>

                      <td>{season.varietyName}</td>

                      <td>
                        {formatDate(season.sowingDate)}
                      </td>

                      <td>
                        <div className="season-date-cell">
                          <strong>
                            {formatDate(
                              season.expectedHarvestDate,
                            )}
                          </strong>

                          <span>
                            {getHarvestTimeText(season)}
                          </span>
                        </div>
                      </td>

                      <td>
                        {formatDate(
                          season.actualHarvestDate,
                        )}
                      </td>

                      <td>
                        <span
                          className={`season-status season-status-${season.status}`}
                        >
                          {statusLabels[season.status]}
                        </span>
                      </td>

                      <td>
                        <Link
                          className="table-action-button"
                          to={`/seasons/${season.id}`}
                          aria-label={`Xem ${season.name}`}
                        >
                          <Eye size={17} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default SeasonsPage;
