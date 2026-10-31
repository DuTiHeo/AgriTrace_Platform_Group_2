import BackButton from "../../components/owner/BackButton_wb";
import CreationReview from "../../components/owner/CreationReview_wb";
import "../../styles/seasons_wb.css";
import "../../styles/season_form_wb.css";
import {
  CalendarDays,
  Check,
  ChevronRight,
  MapPinned,
  Save,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { plotService } from "../../sevices/plotService_wb";
import {
  calculateExpectedHarvestDate,
  seasonService,
} from "../../sevices/seasonService_wb";
import type { Plot } from "../../features/owner/plot_wb";
import type { CropVariety } from "../../features/owner/season_wb";

type SeasonFormData = {
  farmId: string;
  plotId: string;
  varietyId: string;
  sowingDate: string;
  expectedHarvestDate: string;
};

type FormErrors = Partial<
  Record<
    | "farmId"
    | "plotId"
    | "varietyId"
    | "sowingDate"
    | "expectedHarvestDate",
    string
  >
>;

function formatDate(date: string) {
  if (!date) {
    return "Chưa xác định";
  }

  return new Intl.DateTimeFormat("vi-VN").format(
    new Date(`${date}T00:00:00`),
  );
}

function CreateSeasonPage() {
  const navigate = useNavigate();

  const {
    farms,
    selectedFarmId,
    loadingFarms,
  } = useFarmContext();

  const [plots, setPlots] = useState<Plot[]>([]);
  const [cropVarieties, setCropVarieties] = useState<CropVariety[]>([]);
  const [cropLoadError, setCropLoadError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [manualHarvestDate, setManualHarvestDate] =
    useState(false);
  const [notes, setNotes] = useState("");

  const [formData, setFormData] =
    useState<SeasonFormData>({
      farmId:
        selectedFarmId === "all"
          ? ""
          : selectedFarmId,
      plotId: "",
      varietyId: "",
      sowingDate: "",
      expectedHarvestDate: "",
    });

  useEffect(() => {
    let active = true;
    void seasonService.getCropVarieties().then((varieties) => {
      if (active) setCropVarieties(varieties);
    }).catch((error: unknown) => {
      if (active) {
        setCropLoadError(error instanceof Error ? error.message : "Không thể tải danh mục giống cây.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadPlots = async () => {
      const data = await plotService.getAll();
      setPlots(data);
    };

    void loadPlots();

    window.addEventListener(
      "plots-updated",
      loadPlots,
    );

    return () => {
      window.removeEventListener(
        "plots-updated",
        loadPlots,
      );
    };
  }, []);

  useEffect(() => {
    if (
      !formData.farmId &&
      selectedFarmId !== "all"
    ) {
      const timer = window.setTimeout(() => {
        setFormData((current) => ({
          ...current,
          farmId: selectedFarmId,
        }));
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [formData.farmId, selectedFarmId]);

  const availablePlots = useMemo(
    () =>
      plots.filter(
        (plot) =>
          plot.farmId === formData.farmId &&
          plot.status === "active" &&
          !plot.currentSeasonId,
      ),
    [plots, formData.farmId],
  );

  const selectedPlot = useMemo(
    () =>
      plots.find(
        (plot) => plot.id === formData.plotId,
      ) ?? null,
    [plots, formData.plotId],
  );

  const availableVarieties = cropVarieties;

  const selectedVariety = useMemo(
    () =>
      cropVarieties.find(
        (variety) =>
          variety.id === formData.varietyId,
      ) ?? null,
    [cropVarieties, formData.varietyId],
  );

  const selectedFormFarm = useMemo(
    () =>
      farms.find(
        (farm) => farm.id === formData.farmId,
      ) ?? null,
    [farms, formData.farmId],
  );

  const updateField = (
    field: keyof SeasonFormData,
    value: string,
  ) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const handleFarmChange = (farmId: string) => {
    setFormData((current) => ({
      ...current,
      farmId,
      plotId: "",
      varietyId: "",
      expectedHarvestDate: "",
    }));

    setErrors({});
  };

  const handlePlotChange = (plotId: string) => {
    setFormData((current) => ({
      ...current,
      plotId,
      varietyId: "",
      expectedHarvestDate: "",
    }));

    setManualHarvestDate(false);

    setErrors((current) => ({
      ...current,
      plotId: undefined,
      varietyId: undefined,
    }));
  };

  const handleVarietyChange = (
    varietyId: string,
  ) => {
    const variety = cropVarieties.find(
      (item) => item.id === varietyId,
    );

    const expectedHarvestDate =
      variety && formData.sowingDate
        ? calculateExpectedHarvestDate(
            formData.sowingDate,
            variety.growthDays,
          )
        : "";

    setFormData((current) => ({
      ...current,
      varietyId,
      expectedHarvestDate,
    }));

    setManualHarvestDate(false);

    setErrors((current) => ({
      ...current,
      varietyId: undefined,
      expectedHarvestDate: undefined,
    }));
  };

  const handleSowingDateChange = (
    sowingDate: string,
  ) => {
    const expectedHarvestDate =
      selectedVariety && !manualHarvestDate
        ? calculateExpectedHarvestDate(
            sowingDate,
            selectedVariety.growthDays,
          )
        : formData.expectedHarvestDate;

    setFormData((current) => ({
      ...current,
      sowingDate,
      expectedHarvestDate,
    }));

    setErrors((current) => ({
      ...current,
      sowingDate: undefined,
      expectedHarvestDate: undefined,
    }));
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!formData.farmId) {
      nextErrors.farmId =
        "Vui lòng chọn nông trại.";
    }

    if (!formData.plotId) {
      nextErrors.plotId =
        "Vui lòng chọn vùng trồng.";
    }

    if (!formData.varietyId) {
      nextErrors.varietyId =
        "Vui lòng chọn giống cây.";
    }

    if (!formData.sowingDate) {
      nextErrors.sowingDate =
        "Vui lòng chọn ngày gieo trồng.";
    }

    if (!formData.expectedHarvestDate) {
      nextErrors.expectedHarvestDate =
        "Vui lòng chọn ngày thu hoạch dự kiến.";
    } else if (
      formData.sowingDate &&
      formData.expectedHarvestDate <=
        formData.sowingDate
    ) {
      nextErrors.expectedHarvestDate =
        "Ngày thu hoạch phải sau ngày gieo.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const goToNextStep = () => {
    if (validateForm()) setCurrentStep(3);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (currentStep < 3) {
      goToNextStep();
      return;
    }

    if (
      !validateForm() ||
      !selectedPlot ||
      !selectedVariety
    ) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const season = await seasonService.create({
        farmId: formData.farmId,
        plotId: formData.plotId,
        name: selectedVariety.name,
        cropType: selectedVariety.name,
        varietyId: selectedVariety.id,
        varietyName: selectedVariety.name,
        sowingDate: formData.sowingDate,
        expectedHarvestDate:
          formData.expectedHarvestDate,
        notes: "",
      });

      navigate(`/seasons/${season.id}`, {
        replace: true,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Không thể tạo mùa vụ.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page season-form-page">
      <div className="page-heading season-create-heading">
        <BackButton label={currentStep > 1 ? "Quay lại bước trước" : "Quay lại danh sách"} onClick={() => { if (currentStep > 1) setCurrentStep(1); else navigate("/seasons"); }} />
        <div>
          <h1>Tạo mùa vụ</h1>
          <p>
            Thiết lập vùng trồng, giống cây và thời gian
            canh tác.
          </p>
        </div>
      </div>

      <form className="season-form season-create-form card" onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <section className="season-form-card">
            <div className="season-form-heading">
              <div className="season-form-icon">
                <MapPinned size={20} />
              </div>

              <div>
                <h2>Vùng trồng và giống cây</h2>
                <p>
                  Chỉ hiển thị vùng trồng đang hoạt động và
                  chưa có mùa vụ hiện hành.
                </p>
              </div>
            </div>

            <div className="season-form-grid">
              <label className="season-form-field">
                <span>
                  Nông trại <b>*</b>
                </span>

                <select
                  value={formData.farmId}
                  disabled={loadingFarms}
                  onChange={(event) =>
                    handleFarmChange(event.target.value)
                  }
                >
                  <option value="">
                    Chọn nông trại
                  </option>

                  {farms
                    .filter(
                      (farm) =>
                        farm.status === "active",
                    )
                    .map((farm) => (
                      <option
                        key={farm.id}
                        value={farm.id}
                      >
                        {farm.name}
                      </option>
                    ))}
                </select>

                {errors.farmId && (
                  <small className="form-error">
                    {errors.farmId}
                  </small>
                )}
              </label>

              <label className="season-form-field">
                <span>
                  Vùng trồng <b>*</b>
                </span>

                <select
                  value={formData.plotId}
                  disabled={!formData.farmId}
                  onChange={(event) =>
                    handlePlotChange(event.target.value)
                  }
                >
                  <option value="">
                    Chọn vùng trồng
                  </option>

                  {availablePlots.map((plot) => (
                    <option
                      key={plot.id}
                      value={plot.id}
                    >
                      {plot.name} · {plot.area} ha
                    </option>
                  ))}
                </select>

                {formData.farmId &&
                  availablePlots.length === 0 && (
                    <small className="season-form-note">
                      Không có vùng trồng trống để tạo mùa
                      vụ.
                    </small>
                  )}

                {errors.plotId && (
                  <small className="form-error">
                    {errors.plotId}
                  </small>
                )}
              </label>

              {cropLoadError && (
                <div className="form-error-block season-form-full">{cropLoadError}</div>
              )}

              <label className="season-form-field">
                <span>
                  Giống cây <b>*</b>
                </span>

                <select
                  value={formData.varietyId}
                  disabled={!selectedPlot || cropVarieties.length === 0}
                  onChange={(event) =>
                    handleVarietyChange(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Chọn giống cây
                  </option>

                  {availableVarieties.map((variety) => (
                    <option
                      key={variety.id}
                      value={variety.id}
                    >
                      {variety.name} ·{" "}
                      {variety.growthDays} ngày
                    </option>
                  ))}
                </select>

                {selectedPlot && !cropLoadError &&
                  availableVarieties.length === 0 && (
                    <small className="season-form-note">
                      Danh mục chưa có giống cây.
                    </small>
                  )}

                {errors.varietyId && (
                  <small className="form-error">
                    {errors.varietyId}
                  </small>
                )}
              </label>
            </div>
            <label className="season-form-field season-create-notes">
              <span>Ghi chú</span>
              <textarea
                disabled
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Nhập ghi chú cho mùa vụ..."
                rows={5}
              />
              <small className="season-form-note">Chức năng lưu ghi chú mùa vụ chưa được hỗ trợ.</small>
            </label>

            <div className="season-form-heading season-form-time-heading">
              <div className="season-form-icon">
                <CalendarDays size={20} />
              </div>

              <div>
                <h2>Thời gian canh tác</h2>
                <p>
                  Ngày thu hoạch được tính tự động theo giống
                  cây đã chọn.
                </p>
              </div>
            </div>

            <div className="season-form-grid">
              <label className="season-form-field">
                <span>
                  Ngày gieo trồng <b>*</b>
                </span>

                <input
                  type="date"
                  value={formData.sowingDate}
                  onChange={(event) =>
                    handleSowingDateChange(
                      event.target.value,
                    )
                  }
                />

                {errors.sowingDate && (
                  <small className="form-error">
                    {errors.sowingDate}
                  </small>
                )}
              </label>

              <label className="season-form-field">
                <span>
                  Thu hoạch dự kiến {manualHarvestDate && <b>*</b>}
                </span>

                <input
                  type="date"
                  value={formData.expectedHarvestDate}
                  disabled={!manualHarvestDate}
                  onChange={(event) =>
                    updateField(
                      "expectedHarvestDate",
                      event.target.value,
                    )
                  }
                />

                {errors.expectedHarvestDate && (
                  <small className="form-error">
                    {errors.expectedHarvestDate}
                  </small>
                )}
              </label>

              <label className="manual-date-toggle season-form-full">
                <input
                  type="checkbox"
                  checked={manualHarvestDate}
                  onChange={(event) => {
                    const manual = event.target.checked;
                    setManualHarvestDate(manual);

                    if (
                      !manual &&
                      selectedVariety &&
                      formData.sowingDate
                    ) {
                      updateField(
                        "expectedHarvestDate",
                        calculateExpectedHarvestDate(
                          formData.sowingDate,
                          selectedVariety.growthDays,
                        ),
                      );
                    }
                  }}
                />

                <span>
                  Điều chỉnh ngày thu hoạch dự kiến thủ công
                </span>
              </label>


            </div>
          </section>
        )}

        {currentStep === 3 && (
          <section className="season-form-card">
            <div className="season-form-heading">
              <div className="season-form-icon">
                <Check size={20} />
              </div>

              <div>
                <h2>Xác nhận mùa vụ</h2>
                <p>
                  Kiểm tra lại thông tin trước khi tạo.
                </p>
              </div>
            </div>

            <CreationReview sections={[
              {
                title: "Thông tin mùa vụ",
                items: [
                  { label: "Nông trại", value: selectedFormFarm?.name ?? "Chưa xác định" },
                  { label: "Vùng trồng", value: selectedPlot?.name ?? "Chưa xác định" },
                  { label: "Giống cây", value: selectedVariety?.name ?? "Chưa xác định" },
                  { label: "Ghi chú", value: notes.trim() ? <span className="season-review-notes">{notes}</span> : "Không có ghi chú" },
                ],
              },
              {
                title: "Thời gian canh tác",
                metric: { label: "Thu hoạch dự kiến", value: formatDate(formData.expectedHarvestDate) },
                items: [
                  { label: "Ngày gieo trồng", value: formatDate(formData.sowingDate) },
                  { label: "Thời gian sinh trưởng", value: `${selectedVariety?.growthDays ?? 0} ngày` },
                  { label: "Cách xác định ngày thu hoạch", value: manualHarvestDate ? "Điều chỉnh thủ công" : "Tự động theo giống cây" },
                ],
              },
            ]} />

            {submitError && (
              <div className="form-error-block">
                {submitError}
              </div>
            )}
          </section>
        )}

        <div className="season-form-footer">
          <Link
              className="btn btn-secondary"
              to="/seasons"
            >
              Hủy
            </Link>

          {currentStep < 3 ? (
            <button
              className="btn btn-primary"
              type="submit"
            >
              Tiếp tục
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              type="submit"
              disabled={submitting}
            >
              <Save size={18} />
              {submitting
                ? "Đang tạo..."
                : "Tạo mùa vụ"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default CreateSeasonPage;
