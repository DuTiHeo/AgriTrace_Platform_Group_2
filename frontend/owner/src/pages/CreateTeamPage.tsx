import "../styles/personnel-form.css";
import "../styles/personnel.css";
import "../styles/teams.css";
import {
  ArrowLeft,
  LoaderCircle,
  Save,
  Users,
} from "lucide-react";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { createTeam } from "../services/teamService";

function CreateTeamPage() {
  const navigate = useNavigate();

  const {
    farms,
    selectedFarmId,
    loadingFarms,
  } = useFarmContext();

  const [farmId, setFarmId] = useState("");
  const [name, setName] = useState("");

  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loadingFarms || farms.length === 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (selectedFarmId !== "all") {
        setFarmId(selectedFarmId);
        return;
      }

      const currentFarmStillExists = farms.some(
        (farm) => farm.id === farmId,
      );

      if (!currentFarmStillExists) {
        const firstActiveFarm =
          farms.find((farm) => farm.status !== "suspended") ?? farms[0];
        setFarmId(firstActiveFarm.id);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [
    farmId,
    farms,
    loadingFarms,
    selectedFarmId,
  ]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === farmId),
    [farmId, farms],
  );

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (!farmId) {
      setError("Vui lòng chọn nông trại.");
      return;
    }

    setSubmitting(true);

    try {
      const newTeam = await createTeam({
        farmId,
        name,
      });

      navigate(`/teams/${newTeam.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Không thể tạo tổ công nhân.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page personnel-form-page">
      <div className="personnel-form-heading">
        <Link
          className="personnel-back-link"
          to="/teams"
        >
          <ArrowLeft size={18} />
          Quay lại danh sách tổ
        </Link>

        <div>
          <h1>Tạo tổ công nhân</h1>
          <p>
            Tạo nhóm làm việc mới trong nông trại.
          </p>
        </div>
      </div>

      <form
        className="personnel-form"
        onSubmit={handleSubmit}
      >
        {error && (
          <div
            className="personnel-form-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <section className="personnel-form-section card">
          <div className="personnel-section-heading">
            <span>
              <Users size={20} />
            </span>

            <div>
              <h2>Thông tin tổ</h2>
              <p>
                Tổ có thể được tạo trước, sau đó mới
                thêm thành viên và chỉ định Tổ trưởng.
              </p>
            </div>
          </div>

          <div className="personnel-form-grid">
            <label className="personnel-field">
              <span>
                Nông trại trực thuộc <b>*</b>
              </span>

              <select
                className="input"
                value={farmId}
                required
                disabled={
                  loadingFarms ||
                  selectedFarmId !== "all"
                }
                onChange={(event) =>
                  setFarmId(event.target.value)
                }
              >
                <option value="">
                  Chọn nông trại
                </option>

                {farms.map((farm) => (
                  <option
                    key={farm.id}
                    value={farm.id}
                    disabled={
                      farm.status === "suspended"
                    }
                  >
                    {farm.name}
                    {farm.status === "suspended"
                      ? " (Tạm ngưng)"
                      : ""}
                  </option>
                ))}
              </select>

              {selectedFarm && (
                <small>
                  Tổ sẽ thuộc {selectedFarm.name}.
                </small>
              )}
            </label>

            <label className="personnel-field">
              <span>
                Tên tổ <b>*</b>
              </span>

              <input
                className="input"
                type="text"
                value={name}
                required
                maxLength={100}
                placeholder="Ví dụ: Tổ 4 - Thu hoạch"
                onChange={(event) =>
                  setName(event.target.value)
                }
              />

              <small>
                Mã tổ sẽ được hệ thống tự động tạo.
              </small>
            </label>

          </div>
        </section>

        <div className="personnel-form-actions">
          <Link
            className="btn btn-secondary"
            to="/teams"
          >
            Hủy
          </Link>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting || loadingFarms}
          >
            {submitting ? (
              <LoaderCircle
                className="spin"
                size={18}
              />
            ) : (
              <Save size={18} />
            )}

            {submitting
              ? "Đang tạo tổ..."
              : "Tạo tổ"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateTeamPage;
