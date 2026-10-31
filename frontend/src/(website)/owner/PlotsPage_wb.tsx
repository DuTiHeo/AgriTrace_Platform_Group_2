import ListRowActions from "../../components/owner/ListRowActions_wb";
import GeographicMap from "../../components/owner/GeographicMap_wb";
import "../../styles/plots_wb.css";
import {
  Eye,
  Grid2X2,
  List,
  Map,
  MapPinned,
  Plus,
  Ruler,
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
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { plotService } from "../../sevices/plotService_wb";
import type {
  Plot,
  PlotStatus,
} from "../../features/owner/plot_wb";

type ViewMode = "list" | "map";
type StatusFilter = "all" | PlotStatus;

function PlotsPage() {
  const {
    farms,
    selectedFarmId,
    selectedFarm,
  } = useFarmContext();

  const [plots, setPlots] = useState<Plot[]>([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [viewMode, setViewMode] =
    useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequest = useRef(0);
  const loadPlots = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setError("");

    try {
      const data = await plotService.getAll(selectedFarmId);
      if (request !== loadRequest.current) return;
      setPlots(data);
    } catch {
      if (request !== loadRequest.current) return;
      setError("Không thể tải danh sách vùng trồng.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [selectedFarmId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPlots(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadPlots]);

  useEffect(() => {
    const handlePlotUpdate = () => {
      void loadPlots();
    };

    window.addEventListener(
      "plots-updated",
      handlePlotUpdate,
    );

    return () => {
      window.removeEventListener(
        "plots-updated",
        handlePlotUpdate,
      );
    };
  }, [loadPlots]);

  const filteredPlots = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return plots.filter((plot) => {
      const matchesStatus =
        statusFilter === "all" ||
        plot.status === statusFilter;

      const matchesSearch =
        keyword.length === 0 ||
        plot.name.toLowerCase().includes(keyword) ||
        plot.code.toLowerCase().includes(keyword) ||
        plot.cropType.toLowerCase().includes(keyword) ||
        plot.address.toLowerCase().includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [plots, searchText, statusFilter]);

  const totalArea = useMemo(
    () =>
      filteredPlots.reduce(
        (total, plot) => total + plot.area,
        0,
      ),
    [filteredPlots],
  );

  const activePlots = useMemo(
    () =>
      filteredPlots.filter(
        (plot) => plot.status === "active",
      ).length,
    [filteredPlots],
  );

  const getFarmName = (farmId: string) =>
    farms.find((farm) => farm.id === farmId)?.name ??
    "Không xác định";

  const scopeName =
    selectedFarmId === "all"
      ? "tất cả nông trại"
      : selectedFarm?.name ?? "nông trại đã chọn";

  return (
    <div className="page plots-page">
      <div className="page-heading plots-heading">
        <div>
          <h1>Vùng trồng</h1>
          <p>
            Quản lý vùng trồng thuộc {scopeName}.
          </p>
        </div>

        <Link className="btn btn-primary" to="/plots/new">
          <Plus size={18} />
          Thêm vùng trồng
        </Link>
      </div>

      <section
        className="plot-summary-grid"
        aria-label="Tổng quan vùng trồng"
      >
        <article className="plot-summary-card card">
          <div className="plot-summary-icon">
            <Grid2X2 size={21} />
          </div>

          <div>
            <span>Tổng vùng trồng</span>
            <strong>{filteredPlots.length}</strong>
          </div>
        </article>

        <article className="plot-summary-card card">
          <div className="plot-summary-icon">
            <Sprout size={21} />
          </div>

          <div>
            <span>Đang sử dụng</span>
            <strong>{activePlots}</strong>
          </div>
        </article>

        <article className="plot-summary-card card">
          <div className="plot-summary-icon">
            <Ruler size={21} />
          </div>

          <div>
            <span>Tổng diện tích</span>
            <strong>
              {totalArea.toLocaleString("vi-VN", {
                maximumFractionDigits: 2,
              })}{" "}
              ha
            </strong>
          </div>
        </article>
      </section>

      <section className="plots-content card">
        <div className="plots-toolbar">
          <div className="plots-search">
            <Search size={18} />

            <input
              type="search"
              value={searchText}
              placeholder="Tìm theo tên, mã hoặc cây trồng..."
              onChange={(event) =>
                setSearchText(event.target.value)
              }
            />
          </div>

          <select
            className="plots-status-filter"
            value={statusFilter}
            aria-label="Lọc trạng thái vùng trồng"
            onChange={(event) =>
              setStatusFilter(
                event.target.value as StatusFilter,
              )
            }
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang sử dụng</option>
            <option value="inactive">Ngừng sử dụng</option>
          </select>

          <div
            className="view-switcher"
            aria-label="Chế độ hiển thị"
          >
            <button
              type="button"
              className={
                viewMode === "list" ? "active" : ""
              }
              aria-label="Xem dạng danh sách"
              onClick={() => setViewMode("list")}
            >
              <List size={18} />
            </button>

            <button
              type="button"
              className={
                viewMode === "map" ? "active" : ""
              }
              aria-label="Xem dạng bản đồ"
              onClick={() => setViewMode("map")}
            >
              <Map size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div className="page-error">{error}</div>
        )}

        {loading ? (
          <div className="page-loading">
            Đang tải vùng trồng...
          </div>
        ) : filteredPlots.length === 0 ? (
          <div className="plots-empty">
            <div className="plots-empty-icon">
              <MapPinned size={28} />
            </div>

            <h2>Chưa có vùng trồng phù hợp</h2>

            <p>
              Thay đổi điều kiện tìm kiếm hoặc thêm vùng trồng
              mới.
            </p>

            <Link
              className="btn btn-primary"
              to="/plots/new"
            >
              <Plus size={18} />
              Thêm vùng trồng
            </Link>
          </div>
        ) : viewMode === "list" ? (
          <div className="plots-table-wrapper">
            <table className="plots-table">
              <thead>
                <tr>
                  <th>Vùng trồng</th>
                  <th>Nông trại</th>
                  <th>Cây trồng</th>
                  <th>Diện tích</th>
                  <th>Mùa vụ hiện tại</th>
                  <th>Trạng thái</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>

              <tbody>
                {filteredPlots.map((plot) => (
                  <tr key={plot.id}>
                    <td>
                      <div className="plot-name-cell">
                        <div className="plot-table-icon">
                          <MapPinned size={18} />
                        </div>

                        <div>
                          <strong>{plot.name}</strong>
                          <span>Mã: {plot.code}</span>
                        </div>
                      </div>
                    </td>

                    <td>{getFarmName(plot.farmId)}</td>

                    <td>{plot.cropType}</td>

                    <td>
                      <strong>{plot.area} ha</strong>
                    </td>

                    <td>
                      {plot.currentSeasonName ? (
                        <div className="plot-season-cell">
                          <strong>
                            {plot.currentSeasonName}
                          </strong>

                          <span>
                            {plot.currentSeasonStatus ===
                            "active"
                              ? "Đang hoạt động"
                              : "Đã lên kế hoạch"}
                          </span>
                        </div>
                      ) : (
                        <span className="muted-text">
                          Chưa có mùa vụ
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`status-badge status-${plot.status}`}
                      >
                        {plot.status === "active"
                          ? "Đang sử dụng"
                          : "Ngừng sử dụng"}
                      </span>
                    </td>

                    <td>
                      <ListRowActions to={`/plots/${plot.id}`} name={plot.name} statusLabel={plot.status === "active" ? "Ngừng sử dụng" : "Hoạt động lại"} resume={plot.status !== "active"}
                        statusDescription={plot.status === "active" ? "Vùng trồng sẽ chuyển sang ngừng sử dụng." : "Vùng trồng sẽ được đưa vào sử dụng trở lại."}
                        onStatus={async () => { await plotService.setStatus(plot.id, plot.status === "active" ? "inactive" : "active"); }}
                        onDelete={async () => {
                          if (!await plotService.canDelete(plot.id)) throw new Error("Không thể xóa vùng trồng đang có mùa vụ hoạt động.");
                          await plotService.delete(plot.id);
                        }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="plots-map-layout">
            <GeographicMap
              label="Bản đồ các vùng trồng"
              regions={filteredPlots.map(plot => ({ id: plot.id, label: `${plot.code} · ${plot.name}`, points: plot.boundary, href: `/plots/${plot.id}` }))}
            />

            <div className="plots-map-list" role="region" aria-label="Danh sách vùng trồng trên bản đồ" tabIndex={0}>
              {filteredPlots.map((plot) => (
                <Link
                  className="plots-map-item"
                  key={plot.id}
                  to={`/plots/${plot.id}`}
                >
                  <div>
                    <strong>{plot.name}</strong>
                    <span>
                      {plot.cropType} · {plot.area} ha
                    </span>
                  </div>

                  <Eye size={17} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default PlotsPage;
