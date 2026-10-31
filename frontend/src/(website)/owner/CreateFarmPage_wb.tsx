import BackButton from "../../components/owner/BackButton_wb";
import CreationReview from "../../components/owner/CreationReview_wb";
import "../../styles/farms_wb.css";
import "../../styles/farm_form_wb.css";
import {
  Check,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FarmBoundaryEditor from "../../components/owner/FarmBoundaryEditor_wb";
import { accountService } from "../../sevices/accountService_wb";
import { farmService } from "../../sevices/farmService_wb";
import type {
  FarmFormData,
} from "../../features/owner/farm_wb";

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
  const createdFarmId = useRef<string | null>(null);
  const expectedStatus = form.status === "incomplete"
    ? { label: "Lưu nháp", className: "incomplete" }
    : form.boundary?.isValid
      ? { label: "Đang hoạt động", className: "active" }
      : { label: "Cần hoàn thiện", className: "incomplete" };
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
      setMessage("Vui lòng nhập xã/phường và tỉnh/thành phố.");
      return false;
    }

    setMessage("");
    return true;
  };

  const goToBoundaryStep = () => {
    if (validateBasicInformation()) setStep(2);
  };

  const goToReview = () => {
    if (form.boundary && !form.boundary.isValid) {
      setMessage("Ranh giới chưa hợp lệ. Vui lòng hoàn thiện hoặc chọn Bổ sung ranh giới sau.");
      return;
    }
    setStep(3);
  };

  const createFarm = async () => {
    if (!validateBasicInformation()) {
      setStep(1);
      return;
    }

    setSaving(true);

    try {
      if (!createdFarmId.current) {
        const newFarm = await farmService.create(form);
        createdFarmId.current = newFarm.id;
      } else {
        await farmService.update(createdFarmId.current, form);
      }
      if (form.status === "incomplete" && form.boundary?.isValid) {
        await farmService.changeStatus(createdFarmId.current, "incomplete");
      }
      navigate(`/farms/${createdFarmId.current}`);
    } catch (error) {
      setMessage(createdFarmId.current ? `Nông trại đã được tạo nhưng chưa lưu được trạng thái. Bấm tạo lại để thử lưu trạng thái, không tạo thêm nông trại. ${error instanceof Error ? error.message : ""}` : error instanceof Error ? error.message : "Không thể tạo nông trại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page create-farm-page">
      <div className="create-farm-header">
        <BackButton label={step > 1 ? "Quay lại bước trước" : "Quay lại danh sách nông trại"} disabled={saving} onClick={() => { setMessage(""); if (step > 1) setStep(step - 1); else navigate("/farms"); }} />

        <div>
          <h1>Thêm nông trại</h1>
          <p>Tạo hồ sơ quản lý cho nông trại mới.</p>
        </div>
      </div>

      <section className="farm-form-card card">
        {step === 1 && (
          <>
            <div className="form-section-heading farm-information-heading">
              <div>
                <h2>Thông tin nông trại</h2>
                <p>
                  Nhập thông tin cần thiết để tạo hồ sơ.
                </p>
              </div>
              <div className="farm-owner-heading">
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

                </div>
              </div>
            </div>

            <div className="basic-farm-form">
              <label>
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

              <div role="group" aria-labelledby="farm-activity-label">
                <span className="farm-field-label" id="farm-activity-label">Trạng thái hoạt động</span>
                <div className="status-options farm-create-status-options">
                  <label className="status-option">
                    <input
                      type="radio"
                      name="farm-status"
                      value="active"
                      checked={form.status === "active"}
                      onChange={() => setForm({ ...form, status: "active" })}
                    />
                    <div><strong>Đang hoạt động</strong><span>Đưa vào sử dụng ngay</span></div>
                  </label>
                  <label className="status-option">
                    <input
                      type="radio"
                      name="farm-status"
                      value="incomplete"
                      checked={form.status === "incomplete"}
                      onChange={() => setForm({ ...form, status: "incomplete" })}
                    />
                    <div><strong>Lưu nháp</strong><span>Lưu lại, chưa hoạt động</span></div>
                  </label>
                </div>
              </div>

              <div className="farm-address-fields">
              <label>
                <span>Địa chỉ hành chính *</span>

                <input
                  className="input"
                  placeholder="Số nhà, đường, thôn/ấp"
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
                <span>Xã/Phường *</span>
                <input
                  className="input"
                  placeholder="Nhập xã hoặc phường"
                  value={form.district}
                  onChange={(event) => setForm({ ...form, district: event.target.value })}
                />
              </label>

              <label>
                <span>Tỉnh/Thành phố *</span>
                <input
                  className="input"
                  placeholder="Nhập tỉnh hoặc thành phố"
                  value={form.province}
                  onChange={(event) => setForm({ ...form, province: event.target.value })}
                />
              </label>
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
            <section aria-labelledby="farm-boundary-title">
              <div className="farm-create-boundary-heading">
                <div>
                  <h2 id="farm-boundary-title">Ranh giới nông trại</h2>
                  <p>Vẽ ranh giới GPS trực tiếp trên bản đồ. Có thể bổ sung sau.</p>
                </div>
              </div>
              <FarmBoundaryEditor
                boundary={form.boundary}
                onChange={(boundary) => setForm({ ...form, boundary, estimatedArea: boundary.area })}
                summary={
                  <div className="farm-boundary-area" aria-live="polite">
                    <span>Diện tích từ ranh giới</span>
                    <strong>{form.boundary?.isValid ? `${form.boundary.area.toLocaleString("vi-VN")} ha` : "Chưa xác định"}</strong>
                    <div className="farm-boundary-expected-status">
                      <span>Trạng thái dự kiến</span>
                      <span className={`status-badge status-${expectedStatus.className}`}>{expectedStatus.label}</span>
                    </div>
                  </div>
                }
              />
            </section>

            {message && <p className="form-message form-message-error">{message}</p>}
            <div className="form-footer">
              <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => navigate("/farms")}>Hủy</button>
              <div className="form-footer-right">
                <button className="btn btn-secondary" type="button" onClick={() => {
                  setForm({ ...form, boundary: null, estimatedArea: 0 });
                  setMessage("");
                  setStep(3);
                }}>Bổ sung sau</button>
                <button className="btn btn-primary" type="button" onClick={goToReview}>
                  Tiếp tục<ChevronRight size={17} />
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

            <CreationReview sections={[
              {
                title: "Thông tin nông trại",
                items: [
                  { label: "Tên nông trại", value: form.name },
                  { label: "Địa chỉ", value: [form.address, form.district, form.province].filter(Boolean).join(", ") || "Chưa cung cấp" },
                  { label: "Chủ sở hữu", value: owner.fullName },
                  { label: "Trạng thái dự kiến", value: <span className={`creation-review-status is-${expectedStatus.className}`}>{expectedStatus.label}</span> },
                ],
              },
              {
                title: "Ranh giới và diện tích",
                metric: { label: "Diện tích ước tính từ ranh giới", value: form.boundary?.isValid ? `${form.boundary.area.toLocaleString("vi-VN")} ha` : "Chưa xác định" },
                items: [
                  { label: "Ranh giới", value: <span className={`creation-review-status is-${form.boundary?.isValid ? "active" : "incomplete"}`}>{form.boundary?.isValid ? "Đã xác định" : "Chưa thiết lập"}</span> },
                  { label: "Phương thức", value: form.boundary?.method === "vn2000" ? "Tọa độ VN-2000" : form.boundary?.method === "map" ? "Vẽ trên bản đồ" : "Bổ sung sau" },
                  { label: "Số điểm tọa độ", value: `${form.boundary?.points.length ?? 0} điểm` },
                  { label: "Chu vi", value: form.boundary?.isValid ? `${form.boundary.perimeter.toLocaleString("vi-VN")} m` : "—" },
                ],
              },
            ]} />

            <div className="form-footer">
              <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => navigate("/farms")}>Hủy</button>

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
