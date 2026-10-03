import "../styles/seasons.css";
import "../styles/season-detail.css";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  Edit3,
  FileText,
  MapPinned,
  RefreshCw,
  Save,
  Sprout,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { farmingLogService } from "../services/farmingLogService";
import { plotService } from "../services/plotService";
import { seasonService } from "../services/seasonService";
import { getTeamList } from "../services/teamService";
import type { Plot } from "../types/plot";
import type { TeamSummary } from "../types/team";
import type { SeasonCultivationNote } from "../types/farmingLog";
import type {
  Season,
  SeasonStatus,
  SeasonTeamAssignment,
} from "../types/season";

type DialogType =
  | "edit"
  | "status"
  | "delete"
  | "delete-blocked"
  | null;

type EditForm = {
  expectedHarvestDate: string;
};

const statusLabels: Record<SeasonStatus, string> = {
  planned: "Đã lên kế hoạch",
  active: "Đang canh tác",
  ready: "Sẵn sàng thu hoạch",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const allowedNextStatuses: Record<
  SeasonStatus,
  SeasonStatus[]
> = {
  planned: ["active"],
  active: ["ready"],
  ready: ["active", "completed"],
  completed: [],
  cancelled: [],
};

function formatDate(date: string | null) {
  if (!date) {
    return "Chưa phát sinh";
  }

  return new Intl.DateTimeFormat("vi-VN").format(
    new Date(`${date}T00:00:00`),
  );
}

function formatNoteDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(date)
    : "Chưa ghi nhận thời gian";
}

function SeasonDetailPage() {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const { farms } = useFarmContext();

  const [season, setSeason] =
    useState<Season | null>(null);
  const [plot, setPlot] = useState<Plot | null>(null);
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamAssignments, setTeamAssignments] =
    useState<SeasonTeamAssignment[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [teamError, setTeamError] = useState("");
  const [pageLoadError, setPageLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] =
    useState<DialogType>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notesState, setNotesState] = useState<{
    seasonId: string;
    items: SeasonCultivationNote[];
    loading: boolean;
    error: string;
  }>({ seasonId: "", items: [], loading: true, error: "" });

  const [editForm, setEditForm] =
    useState<EditForm>({
      expectedHarvestDate: "",
    });

  const [nextStatus, setNextStatus] =
    useState<SeasonStatus>("active");

  const [
    actualHarvestDate,
    setActualHarvestDate,
  ] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const loadRequest = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    if (!seasonId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageLoadError("");

    try {
      const seasonData =
        await seasonService.getById(seasonId);

      if (request !== loadRequest.current) return;

      setSeason(seasonData);

      if (seasonData) {
        const [plotData, teamData, assignmentData] =
          await Promise.all([
            plotService.getById(seasonData.plotId),
            getTeamList({
              farmId: seasonData.farmId,
              leaderStatus: "all",
            }),
            seasonService.getTeamAssignments(seasonData.id),
          ]);

        if (request !== loadRequest.current) return;

        setPlot(plotData);
        setTeams(teamData);
        setTeamAssignments(assignmentData);
      }
    } catch (error) {
      if (request === loadRequest.current) setPageLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu.");
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [seasonId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  const notesRequest = useRef(0);
  const loadNotes = useCallback(async () => {
    const request = ++notesRequest.current;
    if (!seasonId) return;
    setNotesState({ seasonId, items: [], loading: true, error: "" });
    try {
      const items = await farmingLogService.getSeasonNotes(seasonId);
      if (request !== notesRequest.current) return;
      setNotesState({ seasonId, items, loading: false, error: "" });
    } catch (error) {
      if (request !== notesRequest.current) return;
      setNotesState({
        seasonId, items: [], loading: false,
        error: error instanceof Error ? error.message : "Không thể tải ghi chú canh tác.",
      });
    }
  }, [seasonId]);

  useEffect(() => {
    const requestCounter = notesRequest;
    const timer = window.setTimeout(() => void loadNotes(), 0);
    const refresh = () => void loadNotes();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("farming-logs-updated", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      requestCounter.current += 1;
      window.removeEventListener("farming-logs-updated", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadNotes]);

  const farmName = useMemo(
    () =>
      farms.find(
        (farm) => farm.id === season?.farmId,
      )?.name ?? "Không xác định",
    [farms, season?.farmId],
  );

  const nextStatusOptions = season
    ? allowedNextStatuses[season.status]
    : [];

  const canEdit =
    season !== null &&
    season.status !== "completed" &&
    season.status !== "cancelled";

  const hasLinkedData =
    season !== null &&
    ((season.linkedData.tasks ?? 0) > 0 ||
      season.linkedData.cultivationLogs > 0 ||
      season.linkedData.harvestLots > 0);

  const isOpenSeason =
    season !== null &&
    (season.status === "planned" ||
      season.status === "active" ||
      season.status === "ready");

  const deleteBlocked =
    isOpenSeason || hasLinkedData;

  const closeDialog = () => {
    if (saving) {
      return;
    }

    setDialog(null);
    setActionError("");
  };

  const openEditDialog = () => {
    if (!season || !canEdit) {
      return;
    }

    setEditForm({
      expectedHarvestDate:
        season.expectedHarvestDate,
    });

    setActionError("");
    setDialog("edit");
  };

  const openStatusDialog = () => {
    if (!season || nextStatusOptions.length === 0) {
      return;
    }

    setNextStatus(nextStatusOptions[0]);
    setActualHarvestDate(
      new Date().toISOString().slice(0, 10),
    );
    setActionError("");
    setDialog("status");
  };

  const openDeleteDialog = () => {
    setActionError("");

    setDialog(
      deleteBlocked
        ? "delete-blocked"
        : "delete",
    );
  };

  const handleSaveEdit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!season) {
      return;
    }

    if (!editForm.expectedHarvestDate) {
      setActionError(
        "Vui lòng nhập ngày thu hoạch dự kiến.",
      );
      return;
    }

    if (
      editForm.expectedHarvestDate <=
      season.sowingDate
    ) {
      setActionError(
        "Ngày thu hoạch dự kiến phải sau ngày gieo.",
      );
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      const updatedSeason =
        await seasonService.update(season.id, {
          expectedHarvestDate:
            editForm.expectedHarvestDate,
        });

      setSeason(updatedSeason);
      setDialog(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật mùa vụ.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!season) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      const updatedSeason =
        await seasonService.changeStatus(
          season.id,
          nextStatus,
          nextStatus === "completed"
            ? actualHarvestDate
            : undefined,
        );

      setSeason(updatedSeason);

      const updatedPlot = await plotService.getById(
        season.plotId,
      );

      setPlot(updatedPlot);
      setDialog(null);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật trạng thái.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!season) {
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      await seasonService.delete(season.id);
      navigate("/seasons", { replace: true });
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Không thể xóa mùa vụ.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTeam = async () => {
    if (!season || !selectedTeamId) {
      return;
    }

    setTeamError("");

    try {
      const assignment = await seasonService.assignTeam(
        season.id,
        selectedTeamId,
      );
      setTeamAssignments((current) =>
        current.some(
          (item) => item.teamId === assignment.teamId,
        )
          ? current
          : [...current, assignment],
      );
      setSelectedTeamId("");
    } catch (error) {
      setTeamError(
        error instanceof Error
          ? error.message
          : "Không thể phân công tổ hỗ trợ.",
      );
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!season) {
      return;
    }

    try {
      await seasonService.removeTeam(season.id, teamId);
      setTeamAssignments((current) => current.filter((assignment) => assignment.teamId !== teamId));
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : "Không thể gỡ tổ hỗ trợ.");
    }
  };

  if (pageLoadError) return <div className="page" role="alert">{pageLoadError} <button type="button" onClick={() => void loadData()}>Thử lại</button></div>;

  if (loading) {
    return (
      <div className="page">
        <div className="page-loading">
          Đang tải thông tin mùa vụ...
        </div>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="page">
        <div className="not-found-card card">
          <Sprout size={35} />
          <h1>Không tìm thấy mùa vụ</h1>

          <Link
            className="btn btn-primary"
            to="/seasons"
          >
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page season-detail-page">
      <div className="season-detail-topbar">
        <Link
          className="back-link"
          to="/seasons"
        >
          <ArrowLeft size={18} />
          Mùa vụ
        </Link>

        <div className="season-detail-actions">
          {canEdit && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={openEditDialog}
            >
              <Edit3 size={17} />
              Chỉnh sửa
            </button>
          )}

          {nextStatusOptions.length > 0 && (
            <button
              className="btn btn-primary"
              type="button"
              onClick={openStatusDialog}
            >
              <RefreshCw size={17} />
              Cập nhật trạng thái
            </button>
          )}

          <button
            className="season-delete-button"
            type="button"
            onClick={openDeleteDialog}
          >
            <Trash2 size={17} />
            Xóa
          </button>
        </div>
      </div>

      <section className="season-detail-hero card">
        <div className="season-detail-hero-icon">
          <Sprout size={28} />
        </div>

        <div className="season-detail-title">
          <div>
            <h1>{season.name}</h1>

            <span
              className={`season-status season-status-${season.status}`}
            >
              {statusLabels[season.status]}
            </span>
          </div>

          <p>
            {season.code} · {season.varietyName}
          </p>
        </div>
      </section>

      <section className="season-detail-summary">
        <article className="season-detail-summary-card card">
          <MapPinned size={20} />

          <div>
            <span>Vùng trồng</span>
            <strong>
              {plot?.name ?? "Không xác định"}
            </strong>
          </div>
        </article>

        <article className="season-detail-summary-card card">
          <CalendarDays size={20} />

          <div>
            <span>Ngày gieo</span>
            <strong>
              {formatDate(season.sowingDate)}
            </strong>
          </div>
        </article>

        <article className="season-detail-summary-card card">
          <Clock3 size={20} />

          <div>
            <span>Thu hoạch dự kiến</span>
            <strong>
              {formatDate(
                season.expectedHarvestDate,
              )}
            </strong>
          </div>
        </article>

      </section>

      <div className="season-detail-grid">
        <section className="season-detail-card card">
          <div className="season-detail-section-heading">
            <h2>Thông tin mùa vụ</h2>
          </div>

          <div className="season-information-list">
            <div className="season-information-item">
              <Building2 size={18} />
              <div>
                <span>Nông trại</span>
                <strong>{farmName}</strong>
              </div>
            </div>

            <div className="season-information-item">
              <MapPinned size={18} />
              <div>
                <span>Vùng trồng</span>
                <strong>
                  {plot?.name ?? "Không xác định"} ·{" "}
                  {plot?.area ?? 0} ha
                </strong>
              </div>
            </div>

            <div className="season-information-item">
              <Sprout size={18} />
              <div>
                <span>Giống cây</span>
                <strong>
                  {season.varietyName}
                </strong>
              </div>
            </div>

            <div className="season-information-item">
              <CalendarDays size={18} />
              <div>
                <span>Thu hoạch thực tế</span>
                <strong>
                  {formatDate(
                    season.actualHarvestDate,
                  )}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className="season-detail-card season-cultivation-notes card">
          <div className="season-detail-section-heading">
            <div><h2>Ghi chú canh tác</h2><p>Ghi chú từ nhật ký của mùa vụ này.</p></div>
            <button className="btn btn-secondary" type="button"
              disabled={notesState.loading} onClick={() => void loadNotes()}>
              <RefreshCw size={15} />Làm mới
            </button>
          </div>
          {notesState.seasonId !== season.id || notesState.loading ? (
            <p className="season-notes-status" role="status">Đang tải ghi chú...</p>
          ) : notesState.error ? (
            <p className="form-error" role="alert">{notesState.error}</p>
          ) : notesState.items.length ? (
            <ul className="season-note-list">
              {notesState.items.map((note) => <li key={note.id}>
                <div className="season-note-meta"><strong>{note.authorName || "Chưa ghi nhận người viết"}</strong>
                  <span>{formatNoteDate(note.createdAt)}</span></div>
                <p>{note.content}</p>
                <div className="season-note-footer">
                  <span className={note.resolved ? "resolved" : "pending"}>{note.resolved ? "Đã xử lý" : "Cần theo dõi"}</span>
                  <Link to={`/farming-logs/${note.logId}`}>Xem nhật ký{note.activityType ? ` · ${note.activityType}` : ""}</Link>
                </div>
              </li>)}
            </ul>
          ) : (
            <div className="season-notes"><FileText size={20} />
              <p>Chưa có ghi chú trong nhật ký của mùa vụ này.</p>
            </div>
          )}
        </section>
      </div>

      <section className="season-detail-card season-team-support card">
        <div className="season-detail-section-heading">
          <div>
            <h2>Tổ hỗ trợ mùa vụ</h2>
            <p>Một tổ có thể đồng thời hỗ trợ nhiều mùa vụ.</p>
          </div>
          <Users size={20} />
        </div>

        <div className="season-team-assign-form">
          <label>
            <span>Thêm tổ hỗ trợ</span>
            <select
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
            >
              <option value="">Chọn tổ trong nông trại</option>
              {teams
                .filter(
                  (team) =>
                    !teamAssignments.some(
                      (assignment) => assignment.teamId === team.id,
                    ),
                )
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamCode} · {team.name}
                  </option>
                ))}
            </select>
          </label>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!selectedTeamId}
            onClick={() => void handleAssignTeam()}
          >
            <UserPlus size={17} />
            Gán tổ
          </button>
        </div>

        {teamError && (
          <p className="season-team-error" role="alert">
            {teamError}
          </p>
        )}

        {teamAssignments.length ? (
          <ul className="season-team-list">
            {teamAssignments.map((assignment) => {
              const team = teams.find(
                (item) => item.id === assignment.teamId,
              );

              return (
                <li key={assignment.teamId}>
                  <div className="season-team-avatar">
                    <Users size={17} />
                  </div>
                  <div className="season-team-info">
                    <strong>{team?.name ?? "Tổ không còn tồn tại"}</strong>
                    <span>
                      {team?.teamCode ?? ""} · {team?.activeMemberCount ?? 0} thành viên hoạt động
                    </span>
                  </div>
                  <button
                    type="button"
                    className="season-team-remove"
                    aria-label={`Bỏ ${team?.name ?? "tổ"} khỏi mùa vụ`}
                    onClick={() => void handleRemoveTeam(assignment.teamId)}
                  >
                    <X size={17} />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="season-team-empty">
            Chưa có tổ hỗ trợ. Hãy gán tổ trước khi tạo công việc cho mùa vụ này.
          </p>
        )}
      </section>

      {dialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <div
            className="app-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="app-modal-header">
              <h2>
                {dialog === "edit" &&
                  "Chỉnh sửa mùa vụ"}
                {dialog === "status" &&
                  "Cập nhật trạng thái"}
                {dialog === "delete" &&
                  "Xóa mùa vụ?"}
                {dialog === "delete-blocked" &&
                  "Không thể xóa mùa vụ"}
              </h2>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeDialog}
              >
                <X size={20} />
              </button>
            </div>

            {dialog === "edit" && (
              <form
                className="season-edit-form"
                onSubmit={handleSaveEdit}
              >
                <label>
                  <span>Thu hoạch dự kiến</span>
                  <input
                    type="date"
                    value={editForm.expectedHarvestDate}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        expectedHarvestDate: event.target.value,
                      }))
                    }
                  />
                </label>

                {actionError && (
                  <div className="form-error-block">
                    {actionError}
                  </div>
                )}

                <div className="app-modal-footer">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={closeDialog}
                  >
                    Hủy
                  </button>

                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={saving}
                  >
                    <Save size={17} />
                    {saving
                      ? "Đang lưu..."
                      : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}

            {dialog === "status" && (
              <>
                <div className="app-modal-body">
                  <label className="season-status-field">
                    <span>Trạng thái tiếp theo</span>

                    <select
                      value={nextStatus}
                      onChange={(event) =>
                        setNextStatus(
                          event.target
                            .value as SeasonStatus,
                        )
                      }
                    >
                      {nextStatusOptions.map(
                        (status) => (
                          <option
                            key={status}
                            value={status}
                          >
                            {statusLabels[status]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  {nextStatus === "completed" && (
                    <label className="season-status-field">
                      <span>
                        Ngày thu hoạch thực tế
                      </span>

                      <input
                        type="date"
                        value={actualHarvestDate}
                        onChange={(event) =>
                          setActualHarvestDate(
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  )}

                  {actionError && (
                    <div className="form-error-block">
                      {actionError}
                    </div>
                  )}
                </div>

                <div className="app-modal-footer">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={closeDialog}
                  >
                    Hủy
                  </button>

                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={saving}
                    onClick={handleChangeStatus}
                  >
                    <RefreshCw size={17} />
                    {saving
                      ? "Đang xử lý..."
                      : "Xác nhận"}
                  </button>
                </div>
              </>
            )}

            {dialog === "delete-blocked" && (
              <>
                <div className="app-modal-body">
                  <div className="blocked-delete-message">
                    <Clock3 size={22} />

                    <div>
                      <strong>
                        Mùa vụ chưa thể xóa
                      </strong>

                      <p>
                        {isOpenSeason &&
                          "Cần kết thúc hoặc hủy mùa vụ trước. "}

                        {hasLinkedData &&
                          `Mùa vụ đang có ${season.linkedData.cultivationLogs} nhật ký và ${season.linkedData.harvestLots} lô thu hoạch liên quan.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="app-modal-footer">
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={closeDialog}
                  >
                    Đã hiểu
                  </button>
                </div>
              </>
            )}

            {dialog === "delete" && (
              <>
                <div className="app-modal-body">
                  <p>
                    Mùa vụ <strong>{season.name}</strong>{" "}
                    sẽ bị xóa vĩnh viễn. Hành động này không
                    thể hoàn tác.
                  </p>

                  {actionError && (
                    <div className="form-error-block">
                      {actionError}
                    </div>
                  )}
                </div>

                <div className="app-modal-footer">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={closeDialog}
                  >
                    Hủy
                  </button>

                  <button
                    className="season-confirm-delete"
                    type="button"
                    disabled={saving}
                    onClick={handleDelete}
                  >
                    <Trash2 size={17} />
                    {saving
                      ? "Đang xóa..."
                      : "Xóa mùa vụ"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SeasonDetailPage;
