import BackButton from "../../components/owner/BackButton_wb";
import "../../styles/harvests_wb.css";
import {
  Check,
  PackageCheck,
  Scale,
  Sprout,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { harvestService } from "../../sevices/harvestService_wb";
import { plotService } from "../../sevices/plotService_wb";
import { seasonService } from "../../sevices/seasonService_wb";
import type { Plot } from "../../features/owner/plot_wb";
import type { Season } from "../../features/owner/season_wb";

function todayKey() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
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
  const selectedSeasonIds = Object.keys(quantities);
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
    if (saving || loading) return;
    if (!selectedSeasonIds.length || selectedSeasonIds.some(id => !Number.isFinite(quantities[id]) || quantities[id] <= 0)) {
      setError("Chọn ít nhất một mùa vụ và nhập sản lượng lớn hơn 0.");
      return;
    }
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
        <BackButton to="/harvests" label="Quay lại danh sách thu hoạch" />
        <div>
          <h1>Tạo lô thu hoạch</h1>
          <p>Gộp sản lượng từ các mùa vụ đủ điều kiện và sinh mã lô tự động.</p>
        </div>
      </div>

      <form className="harvest-form harvest-create-form card" onSubmit={submit}>
        <section className="harvest-form-card">
          <div className="harvest-form-heading">
            <div className="harvest-form-icon">
              <PackageCheck size={21} />
            </div>
            <div>
              <h2>Thông tin lô thu hoạch</h2>
              <p>Chọn nông trại và ngày thu hoạch. Mã lô được tạo tự động.</p>
            </div>
          </div>

          <div className="harvest-form-grid">
            <label>
              <span>Nông trại <b>*</b></span>
              <select
                required
                disabled={saving}
                value={farmId}
                onChange={(event) => { setFarmId(event.target.value); setSeasons([]); setPlots([]); setQuantities({}); setError(""); setLoading(!!event.target.value); }}
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
              <span>Ngày thu hoạch <b>*</b></span>
              <input
                required
                disabled={saving}
                type="date"
                max={todayKey()}
                value={harvestDate}
                onChange={(event) => setHarvestDate(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="harvest-form-card harvest-create-seasons">
          <div className="harvest-form-heading">
            <div className="harvest-form-icon">
              <Sprout size={21} />
            </div>
            <div>
              <h2>Mùa vụ đóng góp sản lượng</h2>
              <p>
                Chọn các mùa vụ cùng giống cây và nhập sản lượng đóng góp.
              </p>
            </div>
          </div>

          <div className="harvest-selection-layout">
          <div className="harvest-selection-list">
          {loading ? (
            <div className="page-loading">Đang tải mùa vụ...</div>
          ) : seasons.length === 0 ? (
            <div className="harvest-form-empty">
              {farmId ? "Chưa có mùa vụ sẵn sàng thu hoạch hoặc đã hoàn thành tại nông trại này." : "Chọn nông trại để xem mùa vụ đủ điều kiện."}
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
                        disabled={incompatible || saving}
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
                        <small>{season.varietyName}</small>
                        <span className={`harvest-create-season-status ${season.status === "ready" ? "is-ready" : "is-completed"}`}>
                          {season.status === "ready"
                            ? "Sẵn sàng thu hoạch"
                            : "Đã hoàn thành"}
                        </span>
                      </div>
                    </label>

                    {selected && (
                      <label className="harvest-quantity-field">
                        <span>Sản lượng đóng góp <b>*</b></span>
                        <div>
                          <Scale size={16} />
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            disabled={saving}
                            aria-label={`Sản lượng đóng góp của ${season.name} (kg)`}
                            value={quantities[season.id] || ""}
                            onChange={(event) =>
                              setQuantities((current) => ({
                                ...current,
                                [season.id]: Number(event.target.value) || 0,
                              }))
                            }
                          />
                          <span className="harvest-create-unit">kg</span>
                        </div>
                      </label>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          </div>
        <aside className="harvest-form-total" aria-live="polite">
          <div>
            <Scale size={28} />
            <span>Tổng sản lượng</span>
            <strong>{formatQuantity(totalQuantity)} kg</strong>
          </div>
        </aside>
          </div>
        </section>

        {error && <div className="form-error-block harvest-create-error" role="alert">{error}</div>}

        <footer className="harvest-form-footer">
          <button
            className="btn btn-secondary"
            type="button"
            disabled={saving}
            onClick={() => navigate("/harvests")}
          >
            Hủy
          </button>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={saving || loading || !farmId || selectedSeasonIds.length === 0}
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

