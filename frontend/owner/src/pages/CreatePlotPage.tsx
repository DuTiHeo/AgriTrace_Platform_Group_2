import "../styles/plots.css";
import "../styles/plot-form.css";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MapPinned,
  Save,
  Sprout,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import PlotBoundaryEditor from "../components/plots/PlotBoundaryEditor";
import { useFarmContext } from "../contexts/FarmContext";
import { plotService } from "../services/plotService";
import type { BoundaryPoint } from "../types/plot";
import { calculatePlotArea } from "../utils/geometry";

type FormData = {
  farmId: string;
  code: string;
  area: string;
  boundary: BoundaryPoint[];
};

type FormErrors = Partial<
  Record<
    | "farmId"
    | "code"
    | "area"
    | "boundary",
    string
  >
>;

const steps = [
  {
    number: 1,
    title: "Thông tin",
  },
  {
    number: 2,
    title: "Ranh giới và diện tích",
  },
  {
    number: 3,
    title: "Xác nhận",
  },
];

function CreatePlotPage() {
  const navigate = useNavigate();

  const {
    farms,
    selectedFarmId,
    loadingFarms,
  } = useFarmContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    farmId:
      selectedFarmId === "all" ? "" : selectedFarmId,
    code: "",
    area: "",
    boundary: [],
  });

  useEffect(() => {
    if (
      formData.farmId === "" &&
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

  const selectedFormFarm = useMemo(
    () =>
      farms.find(
        (farm) => farm.id === formData.farmId,
      ) ?? null,
    [farms, formData.farmId],
  );

  const calculatedArea = useMemo(
    () => calculatePlotArea(formData.boundary),
    [formData.boundary],
  );

  const updateField = (
    field: keyof FormData,
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

  const handleBoundaryChange = (
    boundary: BoundaryPoint[],
  ) => {
    const newCalculatedArea =
      calculatePlotArea(boundary);

    setFormData((current) => ({
      ...current,
      boundary,
      area:
        newCalculatedArea > 0
          ? String(newCalculatedArea)
          : current.area,
    }));

    setErrors((current) => ({
      ...current,
      boundary: undefined,
      area: undefined,
    }));
  };

  const validateStepOne = () => {
    const nextErrors: FormErrors = {};

    if (!formData.farmId) {
      nextErrors.farmId = "Vui lòng chọn nông trại.";
    }

    if (!formData.code.trim()) {
      nextErrors.code = "Vui lòng nhập mã vùng trồng.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const validateStepTwo = () => {
    const nextErrors: FormErrors = {};
    const area = Number(formData.area);

    if (formData.boundary.length < 3) {
      nextErrors.boundary =
        "Ranh giới phải có ít nhất 3 điểm tọa độ.";
    }

    if (!Number.isFinite(area) || area <= 0) {
      nextErrors.area =
        "Diện tích phải là một số lớn hơn 0.";
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

    if (!validateStepOne() || !validateStepTwo()) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const newPlot = await plotService.create({
        farmId: formData.farmId,
        code: formData.code,
        area: Number(formData.area),
        boundary: formData.boundary,
      });

      navigate(`/plots/${newPlot.id}`, {
        replace: true,
      });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Không thể tạo vùng trồng.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page plot-form-page">
      <div className="page-heading">
        <div>
          <h1>Thêm vùng trồng</h1>
          <p>
            Khai báo thông tin và ranh giới của vùng trồng
            mới.
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

      <form className="plot-form" onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <section className="plot-form-card card">
            <div className="plot-form-section-heading">
              <div className="plot-form-section-icon">
                <Sprout size={20} />
              </div>

              <div>
                <h2>Thông tin vùng trồng</h2>
                <p>
                  Các thông tin cơ bản để nhận diện vùng
                  trồng.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <label className="form-field form-field-full">
                <span>
                  Nông trại <b>*</b>
                </span>

                <select
                  value={formData.farmId}
                  disabled={loadingFarms}
                  onChange={(event) =>
                    updateField(
                      "farmId",
                      event.target.value,
                    )
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

              <label className="form-field">
                <span>
                  Mã vùng trồng <b>*</b>
                </span>

                <input
                  value={formData.code}
                  placeholder="Ví dụ: A1"
                  maxLength={20}
                  onChange={(event) =>
                    updateField(
                      "code",
                      event.target.value,
                    )
                  }
                />

                {errors.code && (
                  <small className="form-error">
                    {errors.code}
                  </small>
                )}
              </label>

            </div>
          </section>
        )}

        {currentStep === 2 && (
          <section className="plot-form-card card">
            <div className="plot-form-section-heading">
              <div className="plot-form-section-icon">
                <MapPinned size={20} />
              </div>

              <div>
                <h2>Ranh giới và diện tích</h2>
                <p>
                  Đánh dấu ranh giới trực tiếp hoặc nhập tệp
                  tọa độ.
                </p>
              </div>
            </div>

            <PlotBoundaryEditor
              points={formData.boundary}
              onChange={handleBoundaryChange}
            />

            {errors.boundary && (
              <div className="form-error-block">
                {errors.boundary}
              </div>
            )}

            <div className="plot-area-field">
              <label className="form-field">
                <span>
                  Diện tích sử dụng <b>*</b>
                </span>

                <div className="input-with-unit">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.area}
                    placeholder="0"
                    onChange={(event) =>
                      updateField(
                        "area",
                        event.target.value,
                      )
                    }
                  />

                  <span>ha</span>
                </div>

                {errors.area && (
                  <small className="form-error">
                    {errors.area}
                  </small>
                )}
              </label>

              <div className="calculated-area">
                <span>Diện tích từ ranh giới</span>
                <strong>
                  {calculatedArea.toLocaleString("vi-VN")} ha
                </strong>

                {calculatedArea > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      updateField(
                        "area",
                        String(calculatedArea),
                      )
                    }
                  >
                    Sử dụng kết quả này
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {currentStep === 3 && (
          <section className="plot-form-card card">
            <div className="plot-form-section-heading">
              <div className="plot-form-section-icon">
                <Check size={20} />
              </div>

              <div>
                <h2>Xác nhận thông tin</h2>
                <p>
                  Kiểm tra lại trước khi tạo vùng trồng.
                </p>
              </div>
            </div>

            <div className="plot-review-grid">
              <div className="plot-review-item">
                <span>Nông trại</span>
                <strong>
                  {selectedFormFarm?.name ??
                    "Chưa xác định"}
                </strong>
              </div>

              <div className="plot-review-item">
                <span>Mã vùng trồng</span>
                <strong>
                  {formData.code.toUpperCase()}
                </strong>
              </div>

              <div className="plot-review-item">
                <span>Diện tích</span>
                <strong>{formData.area} ha</strong>
              </div>

              <div className="plot-review-item">
                <span>Số điểm ranh giới</span>
                <strong>
                  {formData.boundary.length} điểm
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

        <div className="plot-form-footer">
          <div>
            {currentStep === 1 ? (
              <Link
                className="btn btn-secondary"
                to="/plots"
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
          </div>

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
                : "Tạo vùng trồng"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default CreatePlotPage;
