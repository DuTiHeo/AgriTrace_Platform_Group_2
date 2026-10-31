import BackButton from "../../components/owner/BackButton_wb";
import CreationReview from "../../components/owner/CreationReview_wb";
import "../../styles/plots_wb.css";
import "../../styles/plot_form_wb.css";
import {
  Check,
  ChevronRight,
  MapPinned,
  Save,
  Sprout,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import PlotBoundaryEditor from "../../components/owner/PlotBoundaryEditor_wb";
import { useFarmContext } from "../../contexts/FarmContext_wb";
import { plotService } from "../../sevices/plotService_wb";
import type { BoundaryPoint } from "../../features/owner/plot_wb";
import { calculatePlotArea, plotBoundaryError } from "../../utils/geometry_wb";

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
  const createdPlotId = useRef<string | null>(null);
  const [activityStatus, setActivityStatus] = useState<"active" | "inactive">("active");

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

    const boundaryError = plotBoundaryError(formData.boundary, selectedFormFarm, true);
    if (boundaryError) nextErrors.boundary = boundaryError;

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
      if (!createdPlotId.current) {
        const newPlot = await plotService.create({
        farmId: formData.farmId,
        code: formData.code,
        area: Number(formData.area),
        boundary: formData.boundary,
      });
        createdPlotId.current = newPlot.id;
      } else {
        await plotService.update(createdPlotId.current, { code: formData.code, area: Number(formData.area), boundary: formData.boundary, status: activityStatus });
      }
      if (activityStatus === "inactive") await plotService.setStatus(createdPlotId.current, "inactive");
      navigate(`/plots/${createdPlotId.current}`, {
        replace: true,
      });
    } catch (error) {
      setSubmitError(
        createdPlotId.current ? `Vùng trồng đã được tạo nhưng chưa lưu được trạng thái. Bấm tạo lại để lưu trạng thái, không tạo thêm vùng trồng. ${error instanceof Error ? error.message : ""}` : error instanceof Error
          ? error.message
          : "Không thể tạo vùng trồng.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page plot-form-page">
      <div className="page-heading plot-create-heading">
        <BackButton label={currentStep > 1 ? "Quay lại bước trước" : "Quay lại danh sách"} onClick={() => { if (currentStep > 1) setCurrentStep(step => step - 1); else navigate("/plots"); }} />
        <div>
          <h1>Thêm vùng trồng</h1>
          <p>
            Khai báo thông tin và ranh giới của vùng trồng
            mới.
          </p>
        </div>
      </div>

      <form className="plot-form plot-create-form card" onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <section className="plot-form-card">
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
              <label className="form-field">
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

              <fieldset className="plot-activity-field">
                <legend>Trạng thái hoạt động</legend>
                <div className="plot-activity-options">
                  <label className="plot-activity-option">
                    <input type="radio" name="plot-activity" value="active" checked={activityStatus === "active"} onChange={() => setActivityStatus("active")} />
                    <span><strong>Đang hoạt động</strong><small>Sẵn sàng sử dụng</small></span>
                  </label>
                  <label className="plot-activity-option">
                    <input type="radio" name="plot-activity" value="inactive" checked={activityStatus === "inactive"} onChange={() => setActivityStatus("inactive")} />
                    <span><strong>Ngừng hoạt động</strong><small>Chưa đưa vào sử dụng</small></span>
                  </label>
                </div>
              </fieldset>

              <label className="form-field">
                <span>
                  Mã vùng trồng <b>*</b>
                </span>

                <input
                  value={formData.code}
                  placeholder="Ví dụ: A1"
                  maxLength={50}
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
          <section className="plot-form-card">
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
              key={formData.farmId}
              farm={selectedFormFarm}
              points={formData.boundary}
              onChange={handleBoundaryChange}
              summary={
              <div className="calculated-area">
                <span>Diện tích từ ranh giới</span>
                <strong>
                  {calculatedArea.toLocaleString("vi-VN")} ha
                </strong>


              </div>

              }
            />

            {errors.boundary && (
              <div className="form-error-block">
                {errors.boundary}
              </div>
            )}


          </section>
        )}

        {currentStep === 3 && (
          <section className="plot-form-card">
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

            <CreationReview sections={[
              {
                title: "Thông tin vùng trồng",
                items: [
                  { label: "Nông trại", value: selectedFormFarm?.name ?? "Chưa xác định" },
                  { label: "Mã vùng trồng", value: formData.code.toLocaleUpperCase("vi") },
                  { label: "Trạng thái hoạt động", value: (
                    <span className={`creation-review-status is-${activityStatus}`}>
                      {activityStatus === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                  ) },
                ],
              },
              {
                title: "Ranh giới và diện tích",
                metric: { label: "Diện tích từ ranh giới", value: `${Number(formData.area).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ha` },
                items: [
                  { label: "Số điểm tọa độ", value: `${formData.boundary.length} điểm` },
                  { label: "Ranh giới", value: <span className="creation-review-status is-active">Đã xác định</span> },
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

        <div className="plot-form-footer">
          <div>
            <Link
                className="btn btn-secondary"
                to="/plots"
              >
                Hủy
              </Link>
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
