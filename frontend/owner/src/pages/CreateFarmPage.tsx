import "../styles/farms.css";
import "../styles/farm-form.css";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FarmBoundaryEditor from "../components/farms/FarmBoundaryEditor";
import { accountService } from "../services/accountService";
import { farmService } from "../services/farmService";
import {
  farmStatusLabels,
} from "../types/farm";
import type {
  FarmFormData,
} from "../types/farm";

const initialForm: FarmFormData = {
  name: "",
  address: "",
  province: "Đắk Lắk",
  district: "",
  estimatedArea: 0,
  status: "active",
  boundary: null,
};

function CreateFarmPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] =
    useState<FarmFormData>(initialForm);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [owner, setOwner] = useState({
    fullName: "Chủ nông trại",
    phone: "",
    email: "",
  });

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      void accountService.getAccount().then((account) => {
        if (mounted) setOwner(account);
      }).catch((error: unknown) => {
        if (mounted) setMessage(error instanceof Error ? error.message : "Không thể tải thông tin chủ nông trại.");
      });
    }, 0);
    return () => { mounted = false; window.clearTimeout(timer); };
  }, []);

  const validateBasicInformation = () => {
    if (!form.name.trim()) {
      setMessage("Vui lòng nhập tên nông trại.");
      return false;
    }

    if (!form.address.trim()) {
      setMessage("Vui lòng nhập địa chỉ nông trại.");
      return false;
    }

    if (!form.province.trim() || !form.district.trim()) {
      setMessage("Vui lòng nhập tỉnh và huyện.");
      return false;
    }

    setMessage("");
    return true;
  };

  const goToBoundaryStep = () => {
    if (validateBasicInformation()) {
      setStep(2);
    }
  };

  const continueWithBoundary = () => {
    if (!form.boundary?.isValid) {
      setMessage(
        "Ranh giới cần ít nhất 3 điểm hợp lệ. Bạn có thể bỏ qua và bổ sung sau.",
      );
      return;
    }

    setMessage("");
    setStep(3);
  };

  const skipBoundary = () => {
    setForm({
      ...form,
      boundary: null,
    });
    setMessage("");
    setStep(3);
  };

  const createFarm = async () => {
    if (!validateBasicInformation()) {
      setStep(1);
      return;
    }

    setSaving(true);

    try {
      const newFarm = await farmService.create(form);
      navigate(`/farms/${newFarm.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo nông trại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page create-farm-page">
      <div className="create-farm-header">
        <button
          type="button"
          aria-label="Quay lại danh sách"
          onClick={() => navigate("/farms")}
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1>Thêm nông trại</h1>
          <p>Tạo hồ sơ quản lý cho nông trại mới.</p>
        </div>
      </div>

      <div className="farm-stepper">
        <button
          className={
            step === 1
              ? "farm-step active"
              : step > 1
                ? "farm-step completed"
                : "farm-step"
          }
          type="button"
          onClick={() => setStep(1)}
        >
          <span className="farm-step-number">
            {step > 1 ? <Check size={16} /> : "1"}
          </span>

          <span>
            <strong>Thông tin</strong>
            <small>Thông tin cơ bản</small>
          </span>
        </button>

        <button
          className={
            step === 2
              ? "farm-step active"
              : step > 2
                ? "farm-step completed"
                : "farm-step"
          }
          type="button"
          disabled={step < 2}
          onClick={() => setStep(2)}
        >
          <span className="farm-step-number">
            {step > 2 ? <Check size={16} /> : "2"}
          </span>

          <span>
            <strong>Ranh giới</strong>
            <small>Tọa độ hoặc bản đồ</small>
          </span>
        </button>

        <button
          className={
            step === 3
              ? "farm-step active"
              : "farm-step"
          }
          type="button"
          disabled={step < 3}
          onClick={() => setStep(3)}
        >
          <span className="farm-step-number">3</span>

          <span>
            <strong>Kiểm tra</strong>
            <small>Xác nhận thông tin</small>
          </span>
        </button>
      </div>

      <section className="farm-form-card card">
        {step === 1 && (
          <>
            <div className="form-section-heading">
              <div>
                <h2>Thông tin nông trại</h2>
                <p>
                  Nhập thông tin cần thiết để tạo hồ sơ.
                </p>
              </div>
            </div>

            <div className="basic-farm-form">
              <label className="form-field-full">
                <span>Tên nông trại *</span>

                <input
                  className="input"
                  maxLength={100}
                  placeholder="Ví dụ: Nông trại Hồng Hiền"
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                />
              </label>

              <label className="form-field-full">
                <span>Địa chỉ hành chính *</span>

                <input
                  className="input"
                  placeholder="Thôn, xã, huyện, tỉnh"
                  value={form.address}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Tỉnh/Thành phố *</span>

                <input
                  className="input"
                  value={form.province}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      province: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                <span>Huyện/Thành phố *</span>

                <input
                  className="input"
                  placeholder="Ví dụ: Cư Kuin"
                  value={form.district}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      district: event.target.value,
                    })
                  }
                />
              </label>

              <div>
                <span className="farm-field-label">
                  Trạng thái khởi tạo
                </span>

                <div className="status-options">
                  <label className="status-option">
                    <input
                      type="radio"
                      name="farm-status"
                      checked={form.status === "active"}
                      onChange={() =>
                        setForm({
                          ...form,
                          status: "active",
                        })
                      }
                    />

                    <div>
                      <strong>Đang hoạt động</strong>
                      <span>Sẵn sàng sử dụng</span>
                    </div>
                  </label>

                  <label className="status-option">
                    <input
                      type="radio"
                      name="farm-status"
                      checked={
                        form.status === "incomplete"
                      }
                      onChange={() =>
                        setForm({
                          ...form,
                          status: "incomplete",
                        })
                      }
                    />

                    <div>
                      <strong>Cần hoàn thiện</strong>
                      <span>Lưu để bổ sung sau</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-field-full">
                <span className="farm-field-label">
                  Chủ sở hữu
                </span>

                <div className="owner-summary">
                  <div className="owner-summary-avatar">
                    {owner.fullName.split(" ").filter(Boolean).slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi") || "CN"}
                  </div>

                  <div className="owner-summary-info">
                    <strong>{owner.fullName}</strong>
                    <span>
                      {[owner.phone, owner.email].filter(Boolean).join(" · ")}
                    </span>
                  </div>

                  <span>Tài khoản hiện tại</span>
                </div>
              </div>
            </div>

            {message && (
              <p className="form-message form-message-error">
                {message}
              </p>
            )}

            <div className="form-footer">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => navigate("/farms")}
              >
                Hủy
              </button>

              <div className="form-footer-right">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={goToBoundaryStep}
                >
                  Tiếp tục
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-section-heading">
              <div>
                <h2>Ranh giới nông trại</h2>
                <p>
                  Nhập tọa độ hoặc vẽ trực tiếp trên bản đồ.
                  Có thể bỏ qua và bổ sung sau.
                </p>
              </div>
            </div>

            <FarmBoundaryEditor
              boundary={form.boundary}
              onChange={(boundary) =>
                setForm({
                  ...form,
                  boundary,
                  estimatedArea:
                    boundary.area > 0
                      ? boundary.area
                      : form.estimatedArea,
                })
              }
            />

            {message && (
              <p className="form-message form-message-error">
                {message}
              </p>
            )}

            <div className="form-footer">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setMessage("");
                  setStep(1);
                }}
              >
                <ChevronLeft size={17} />
                Quay lại
              </button>

              <div className="form-footer-right">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={skipBoundary}
                >
                  Bổ sung sau
                </button>

                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={continueWithBoundary}
                >
                  Tiếp tục
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="form-section-heading">
              <div>
                <h2>Kiểm tra thông tin</h2>
                <p>
                  Xác nhận thông tin trước khi tạo nông trại.
                </p>
              </div>
            </div>

            <div className="review-grid">
              <article className="review-card">
                <h3>Thông tin nông trại</h3>

                <div className="review-list">
                  <div className="review-item">
                    <span>Tên nông trại</span>
                    <strong>{form.name}</strong>
                  </div>

                  <div className="review-item">
                    <span>Địa chỉ</span>
                    <strong>{form.address}</strong>
                  </div>

                  <div className="review-item">
                    <span>Khu vực</span>
                    <strong>
                      {form.district}, {form.province}
                    </strong>
                  </div>

                  <div className="review-item">
                    <span>Diện tích</span>
                    <strong>
                      {form.boundary
                        ? `${form.boundary.area.toLocaleString("vi-VN")} ha (ước tính từ ranh giới)`
                        : "Chưa xác định từ ranh giới"}
                    </strong>
                  </div>

                  <div className="review-item">
                    <span>Trạng thái</span>
                    <strong>
                      {form.boundary
                        ? farmStatusLabels[form.status]
                        : "Cần hoàn thiện"}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="review-card">
                <h3>Ranh giới</h3>

                <div className="review-list">
                  <div className="review-item">
                    <span>Trạng thái</span>
                    <strong>
                      {form.boundary?.isValid
                        ? "Đã xác định"
                        : "Chưa thiết lập"}
                    </strong>
                  </div>

                  <div className="review-item">
                    <span>Phương thức</span>
                    <strong>
                      {form.boundary?.method === "vn2000"
                        ? "Tọa độ VN-2000"
                        : form.boundary?.method === "map"
                          ? "Vẽ trên bản đồ"
                          : "Bổ sung sau"}
                    </strong>
                  </div>

                  <div className="review-item">
                    <span>Số điểm</span>
                    <strong>
                      {form.boundary?.points.length ?? 0}
                    </strong>
                  </div>

                  <div className="review-item">
                    <span>Chu vi</span>
                    <strong>
                      {form.boundary
                        ? `${form.boundary.perimeter.toLocaleString(
                            "vi-VN",
                          )} m`
                        : "—"}
                    </strong>
                  </div>
                </div>
              </article>
            </div>

            <div className="form-footer">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setStep(2)}
              >
                <ChevronLeft size={17} />
                Quay lại
              </button>

              <div className="form-footer-right">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={saving}
                  onClick={() => void createFarm()}
                >
                  <Check size={17} />
                  {saving
                    ? "Đang tạo..."
                    : "Tạo nông trại"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default CreateFarmPage;
