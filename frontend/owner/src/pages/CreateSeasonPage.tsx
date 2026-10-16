import "../styles/seasons.css";
import "../styles/season-form.css";
import {
  CalendarDays,
  Check,
  ChevronLeft,
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
import { useFarmContext } from "../contexts/FarmContext";
import { plotService } from "../services/plotService";
import {
  calculateExpectedHarvestDate,
  seasonService,
} from "../services/seasonService";
import type { Plot } from "../types/plot";
import type { CropVariety } from "../types/season";

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

const steps = [
  {
    number: 1,
    title: "Vùng trồng và giống",
  },
  {
    number: 2,
    title: "Thời gian canh tác",
  },
  {
    number: 3,
    title: "Xác nhận",
  },
];

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

  const validateStepOne = () => {
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

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = () => {
    const nextErrors: FormErrors = {};

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
    const isValid =
      currentStep === 1
        ? validateStepOne()
        : validateStepTwo();

    if (!isValid) {
      return;
    }

    setCurrentStep((step) =>
      Math.min(step + 1, 3),
    );
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
      !validateStepOne() ||
      !validateStepTwo() ||
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
      <div className="page-heading">
        <div>
          <h1>Tạo mùa vụ</h1>
          <p>
            Thiết lập vùng trồng, giống cây và thời gian
            canh tác.
          </p>
        </div>
      </div>

      <div className="form-stepper">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`form-step ${
              currentStep === step.number
                ? "active"
                : ""
            } ${
              currentStep > step.number
                ? "completed"
                : ""
            }`}
          >
            <div className="form-step-number">
              {currentStep > step.number ? (
                <Check size={16} />
              ) : (
                step.number
              )}
            </div>

            <span>{step.title}</span>
          </div>
        ))}
      </div>

      <form className="season-form" onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <section className="season-form-card card">
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

              {selectedPlot && (
                <div className="selected-plot-card">
                  <div className="selected-plot-icon">
                    <MapPinned size={21} />
                  </div>

                  <div>
                    <strong>{selectedPlot.name}</strong>
                    <span>
                      {selectedPlot.cropType} ·{" "}
                      {selectedPlot.area} ha
                    </span>
                    <small>{selectedPlot.address}</small>
                  </div>
                </div>
              )}

              <label className="season-form-field season-form-full">
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
          </section>
        )}

        {currentStep === 2 && (
          <section className="season-form-card card">
            <div className="season-form-heading">
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
                  Thu hoạch dự kiến <b>*</b>
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

              {selectedVariety &&
                formData.sowingDate && (
                  <div className="harvest-calculation season-form-full">
                    <div>
                      <span>Ngày gieo trồng</span>
                      <strong>
                        {formatDate(formData.sowingDate)}
                      </strong>
                    </div>

                    <div className="calculation-arrow">
                      + {selectedVariety.growthDays} ngày
                    </div>

                    <div>
                      <span>Thu hoạch dự kiến</span>
                      <strong>
                        {formatDate(
                          formData.expectedHarvestDate,
                        )}
                      </strong>
                    </div>
                  </div>
                )}

            </div>
          </section>
        )}

        {currentStep === 3 && (
          <section className="season-form-card card">
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

            <div className="season-review-grid">
              <div className="season-review-item">
                <span>Nông trại</span>
                <strong>
                  {selectedFormFarm?.name ??
                    "Chưa xác định"}
                </strong>
              </div>

              <div className="season-review-item">
                <span>Vùng trồng</span>
                <strong>
                  {selectedPlot?.name ??
                    "Chưa xác định"}
                </strong>
              </div>

              <div className="season-review-item">
                <span>Giống cây</span>
                <strong>
                  {selectedVariety?.name ??
                    "Chưa xác định"}
                </strong>
              </div>

              <div className="season-review-item">
                <span>Thời gian sinh trưởng</span>
                <strong>
                  {selectedVariety?.growthDays ?? 0} ngày
                </strong>
              </div>

              <div className="season-review-item">
                <span>Ngày gieo trồng</span>
                <strong>
                  {formatDate(formData.sowingDate)}
                </strong>
              </div>

              <div className="season-review-item">
                <span>Thu hoạch dự kiến</span>
                <strong>
                  {formatDate(
                    formData.expectedHarvestDate,
                  )}
                </strong>
              </div>

            </div>

            {submitError && (
              <div className="form-error-block">
                {submitError}
              </div>
            )}
          </section>
        )}

        <div className="season-form-footer">
          {currentStep === 1 ? (
            <Link
              className="btn btn-secondary"
              to="/seasons"
            >
              Hủy
            </Link>
          ) : (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() =>
                setCurrentStep((step) => step - 1)
              }
            >
              <ChevronLeft size={18} />
              Quay lại
            </button>
          )}

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
