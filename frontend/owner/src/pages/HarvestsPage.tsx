import "../styles/harvests.css";
import {
  CalendarDays,
  Eye,
  PackageCheck,
  Plus,
  QrCode,
  Scale,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { harvestService } from "../services/harvestService";
import { seasonService } from "../services/seasonService";
import type { HarvestBatch, HarvestBatchStatus } from "../types/harvest";
import { harvestStatusLabels } from "../types/harvest";
import type { Season } from "../types/season";

type StatusFilter = "all" | HarvestBatchStatus;

function formatDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : null;
  if (!date || !Number.isFinite(date.getTime())) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN").format(
    date,
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function HarvestsPage() {
  const { selectedFarmId, selectedFarm, farms } = useFarmContext();
  const [batches, setBatches] = useState<HarvestBatch[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [searchText, setSearchText] = useState("");
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
      const [batchData, seasonData] = await Promise.all([
        harvestService.getAll(selectedFarmId),
        seasonService.getAll(selectedFarmId),
      ]);
      setBatches(batchData);
      if (request !== loadRequest.current) return;
      setSeasons(seasonData);
    } catch {
      if (request !== loadRequest.current) return;
      setError("Không thể tải danh sách lô thu hoạch.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [selectedFarmId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  useEffect(() => {
    window.addEventListener("harvest-batches-updated", loadData);
    return () =>
      window.removeEventListener("harvest-batches-updated", loadData);
  }, [loadData]);

  const seasonById = useMemo(
    () => new Map(seasons.map((season) => [season.id, season])),
    [seasons],
  );
  const farmById = useMemo(
    () => new Map(farms.map((farm) => [farm.id, farm])),
    [farms],
  );

  const filteredBatches = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase("vi");

    return batches.filter((batch) => {
      const seasonNames = batch.contributions
        .map((item) => seasonById.get(item.seasonId)?.name ?? "")
        .join(" ");
      const matchesSearch =
        !keyword ||
        `${batch.code} ${seasonNames}`
          .toLocaleLowerCase("vi")
          .includes(keyword);

      return (
        matchesSearch &&
        (statusFilter === "all" || batch.status === statusFilter)
      );
    });
  }, [batches, searchText, statusFilter, seasonById]);

  const activeBatches = batches.filter(
    (batch) => batch.status !== "cancelled",
  );
  const totalQuantity = activeBatches.reduce(
    (total, batch) => total + batch.quantityKg,
    0,
  );
  const readyCount = batches.filter(
    (batch) => batch.status === "ready",
  ).length;
  const pendingCount = batches.filter(
    (batch) => batch.status === "pending",
  ).length;
  const scopeName =
    selectedFarmId === "all"
      ? "tất cả nông trại"
      : selectedFarm?.name ?? "nông trại đã chọn";

  return (
    <div className="page harvests-page">
      <div className="page-heading harvests-heading">
        <div>
          <h1>Lô thu hoạch</h1>
          <p>
            Quản lý sản lượng và mã truy xuất nguồn gốc của {scopeName}.
          </p>
        </div>
        <Link className="btn btn-primary" to="/harvests/new">
          <Plus size={18} />
          Tạo lô thu hoạch
        </Link>
      </div>

      <section className="harvest-summary-grid">
        <article className="harvest-summary card">
          <PackageCheck size={21} />
          <span>Lô đang quản lý</span>
          <strong>{activeBatches.length}</strong>
        </article>
        <article className="harvest-summary harvest-summary-weight card">
          <Scale size={21} />
          <span>Tổng sản lượng</span>
          <strong>{formatQuantity(totalQuantity)} kg</strong>
        </article>
        <article className="harvest-summary harvest-summary-ready card">
          <QrCode size={21} />
          <span>Sẵn sàng truy xuất</span>
          <strong>{readyCount}</strong>
        </article>
        <article className="harvest-summary harvest-summary-pending card">
          <CalendarDays size={21} />
          <span>Chờ tạo tem</span>
          <strong>{pendingCount}</strong>
        </article>
      </section>

      <section className="harvest-list-panel card">
        <div className="harvest-toolbar">
          <label className="harvest-search">
            <Search size={18} />
            <input
              type="search"
              value={searchText}
              placeholder="Tìm mã lô hoặc mùa vụ..."
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            aria-label="Lọc trạng thái lô thu hoạch"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ tạo tem</option>
            <option value="ready">Sẵn sàng truy xuất</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        {error && <div className="page-error">{error}</div>}

        {loading ? (
          <div className="page-loading">Đang tải lô thu hoạch...</div>
        ) : filteredBatches.length === 0 ? (
          <div className="harvest-empty">
            <PackageCheck size={34} />
            <strong>Chưa có lô thu hoạch phù hợp</strong>
            <span>
              Chọn mùa vụ sẵn sàng thu hoạch để khởi tạo lô mới.
            </span>
            <Link className="btn btn-primary" to="/harvests/new">
              <Plus size={17} />
              Tạo lô thu hoạch
            </Link>
          </div>
        ) : (
          <div className="harvest-table-wrapper">
            <table className="harvest-table">
              <thead>
                <tr>
                  <th>Mã lô</th>
                  <th>Nông trại</th>
                  <th>Ngày thu hoạch</th>
                  <th>Mùa vụ đóng góp</th>
                  <th>Sản lượng</th>
                  <th>Trạng thái</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <div className="harvest-code-cell">
                        <PackageCheck size={18} />
                        <div>
                          <strong>{batch.code}</strong>
                          <span>
                            {"Truy xuất công khai chưa khả dụng"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{farmById.get(batch.farmId)?.name ?? "Không xác định"}</td>
                    <td>{formatDate(batch.harvestDate)}</td>
                    <td>
                      <div className="harvest-season-cell">
                        <strong>{batch.contributions.length} mùa vụ</strong>
                        <span>
                          {batch.contributions
                            .map(
                              (item) =>
                                seasonById.get(item.seasonId)?.name ??
                                "Không xác định",
                            )
                            .join(", ")}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{formatQuantity(batch.quantityKg)} kg</strong>
                    </td>
                    <td>
                      <span className={`harvest-status harvest-status-${batch.status}`}>
                        {harvestStatusLabels[batch.status]}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="table-action-button"
                        to={`/harvests/${batch.id}`}
                        aria-label={`Xem ${batch.code}`}
                      >
                        <Eye size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default HarvestsPage;

