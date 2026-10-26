import "../styles/harvests.css";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  PackageCheck,
  Scale,
  Sprout,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { harvestService } from "../services/harvestService";
import { plotService } from "../services/plotService";
import { seasonService } from "../services/seasonService";
import type { Plot } from "../types/plot";
import type { Season } from "../types/season";

function todayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function CreateHarvestPage() {
  const navigate = useNavigate();
  const { farms, selectedFarmId } = useFarmContext();
  const initialFarmId =
    selectedFarmId !== "all" ? selectedFarmId : farms[0]?.id ?? "";
  const [farmId, setFarmId] = useState(initialFarmId);
  const [harvestDate, setHarvestDate] = useState(todayKey());
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (farmId || farms.length === 0) return;
    const timer = window.setTimeout(() => setFarmId(farms[0].id), 0);
    return () => window.clearTimeout(timer);
  }, [farmId, farms]);

  useEffect(() => {
    if (!farmId) {
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void Promise.all([
        seasonService.getAll(farmId),
        plotService.getAll(farmId),
      ])
        .then(([seasonData, plotData]) => {
          if (!active) return;
          setSeasons(
            seasonData.filter(
              (season) =>
                season.status === "ready" || season.status === "completed",
            ),
          );
          setPlots(plotData);
          setQuantities({});
          setError("");
        })
        .catch(() => {
          if (active) setError("Không thể tải mùa vụ đủ điều kiện.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [farmId]);

  const plotById = useMemo(
    () => new Map(plots.map((plot) => [plot.id, plot])),
    [plots],
  );
  const selectedSeasonIds = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([seasonId]) => seasonId);
  const selectedVarietyId = seasons.find((season) =>
    selectedSeasonIds.includes(season.id),
  )?.varietyId;
  const totalQuantity = Object.values(quantities).reduce(
    (total, quantity) => total + (quantity || 0),
    0,
  );

  const setSeasonSelected = (seasonId: string, selected: boolean) => {
    setQuantities((current) => {
      if (selected) {
        return { ...current, [seasonId]: current[seasonId] || 1 };
      }

      const next = { ...current };
      delete next[seasonId];
      return next;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const batch = await harvestService.create({
        farmId,
        harvestDate,
        contributions: selectedSeasonIds.map((seasonId) => ({
          seasonId,
          quantityKg: quantities[seasonId],
        })),
      });
      navigate(`/harvests/${batch.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể tạo lô thu hoạch.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page harvest-form-page">
      <div className="harvest-form-header">
        <button
          type="button"
          aria-label="Quay lại danh sách"
          onClick={() => navigate("/harvests")}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1>Tạo lô thu hoạch</h1>
          <p>Gộp sản lượng từ các mùa vụ đủ điều kiện và sinh mã lô tự động.</p>
        </div>
      </div>

      <form className="harvest-form" onSubmit={submit}>
        <section className="card harvest-form-card">
          <div className="harvest-form-heading">
            <div className="harvest-form-icon">
              <PackageCheck size={21} />
            </div>
            <div>
              <h2>Thông tin lô</h2>
              <p>Mã định danh được hệ thống sinh sau khi lưu.</p>
            </div>
          </div>

          <div className="harvest-form-grid">
            <label>
              <span>Nông trại *</span>
              <select
                required
                value={farmId}
                onChange={(event) => setFarmId(event.target.value)}
              >
                <option value="">Chọn nông trại</option>
                {farms
                  .filter((farm) => farm.status !== "suspended")
                  .map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              <span>Ngày thu hoạch *</span>
              <input
                required
                type="date"
                max={todayKey()}
                value={harvestDate}
                onChange={(event) => setHarvestDate(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="card harvest-form-card">
          <div className="harvest-form-heading">
            <div className="harvest-form-icon">
              <Sprout size={21} />
            </div>
            <div>
              <h2>Mùa vụ đóng góp sản lượng</h2>
              <p>
                Chỉ mùa vụ sẵn sàng thu hoạch hoặc đã hoàn thành mới được chọn;
                các mùa vụ trong cùng lô phải cùng giống cây.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="page-loading">Đang tải mùa vụ...</div>
          ) : seasons.length === 0 ? (
            <div className="harvest-form-empty">
              Chưa có mùa vụ nào đủ điều kiện thu hoạch tại nông trại này.
            </div>
          ) : (
            <div className="harvest-season-options">
              {seasons.map((season) => {
                const selected = season.id in quantities;
                const incompatible =
                  !!selectedVarietyId &&
                  season.varietyId !== selectedVarietyId &&
                  !selected;
                const plot = plotById.get(season.plotId);

                return (
                  <article
                    className={`harvest-season-option ${
                      selected ? "selected" : ""
                    } ${incompatible ? "disabled" : ""}`}
                    key={season.id}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={incompatible}
                        onChange={(event) =>
                          setSeasonSelected(season.id, event.target.checked)
                        }
                      />
                      <span className="harvest-season-check">
                        {selected && <Check size={14} />}
                      </span>
                      <div>
                        <strong>{season.name}</strong>
                        <span>
                          {season.code} · {plot?.name ?? "Không xác định"}
                        </span>
                        <small>
                          {season.varietyName} · {season.status === "ready"
                            ? "Sẵn sàng thu hoạch"
                            : "Đã hoàn thành"}
                        </small>
                      </div>
                    </label>

                    {selected && (
                      <label className="harvest-quantity-field">
                        <span>Sản lượng đóng góp (kg)</span>
                        <div>
                          <Scale size={16} />
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={quantities[season.id] || ""}
                            onChange={(event) =>
                              setQuantities((current) => ({
                                ...current,
                                [season.id]: Number(event.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </label>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="card harvest-form-total">
          <div>
            <CalendarDays size={20} />
            <span>{selectedSeasonIds.length} mùa vụ được chọn</span>
          </div>
          <div>
            <span>Tổng sản lượng</span>
            <strong>{formatQuantity(totalQuantity)} kg</strong>
          </div>
        </section>

        {error && <div className="form-error-block">{error}</div>}

        <footer className="harvest-form-footer">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => navigate("/harvests")}
          >
            Hủy
          </button>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={saving || selectedSeasonIds.length === 0}
          >
            <PackageCheck size={17} />
            {saving ? "Đang tạo..." : "Tạo lô thu hoạch"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default CreateHarvestPage;

