import "../styles/personnel-detail.css";
import "../styles/personnel-form.css";
import "../styles/personnel.css";
import "../styles/teams.css";
import "../styles/team-detail.css";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Crown,
  Edit3,
  LoaderCircle,
  Phone,
  Plus,
  Save,
  UserMinus,
  UserPlus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { getPersonnelList } from "../services/personnelService";
import {
  addTeamMember,
  assignTeamLeader,
  getTeamList,
  getTeamSummaryById,
  removeTeamMember,
  updateTeam,
} from "../services/teamService";
import type { Personnel } from "../types/personnel";
import type { TeamSummary } from "../types/team";

type TeamModal =
  | "edit"
  | "add-member"
  | "leader"
  | "remove-member"
  | null;

function TeamDetailPage() {
  const { teamId } = useParams();
  const { farms } = useFarmContext();

  const [team, setTeam] =
    useState<TeamSummary | null>(null);
  const [allTeams, setAllTeams] = useState<
    TeamSummary[]
  >([]);
  const [personnel, setPersonnel] = useState<
    Personnel[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [operationError, setOperationError] =
    useState("");
  const [openModal, setOpenModal] =
    useState<TeamModal>(null);

  const [teamName, setTeamName] = useState("");
  const [
    selectedPersonnelId,
    setSelectedPersonnelId,
  ] = useState("");

  const loadRequest = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    if (!teamId) {
      setError("Không tìm thấy mã tổ.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const teamResult =
        await getTeamSummaryById(teamId);

      if (!teamResult) {
        if (request !== loadRequest.current) return;
        setTeam(null);
        setError(
          "Tổ công nhân không tồn tại hoặc chưa được khởi tạo.",
        );
        return;
      }

      const [personnelResult, teamListResult] =
        await Promise.all([
          getPersonnelList({
            farmId: teamResult.farmId,
            role: "all",
            teamId: "all",
            status: "all",
          }),
          getTeamList({
            farmId: teamResult.farmId,
            leaderStatus: "all",
          }),
        ]);

      const refreshedTeam =
        teamListResult.find(
          (currentTeam) =>
            currentTeam.id === teamResult.id,
        ) ?? teamResult;

      if (request !== loadRequest.current) return;

      setTeam(refreshedTeam);
      setAllTeams(teamListResult);
      setPersonnel(personnelResult);
    } catch (loadError) {
      if (request !== loadRequest.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải thông tin tổ.",
      );
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  const farmName = useMemo(() => {
    if (!team) {
      return "Không xác định";
    }

    return (
      farms.find((farm) => farm.id === team.farmId)
        ?.name ?? "Không xác định"
    );
  }, [farms, team]);

  const members = useMemo(() => {
    if (!team) {
      return [];
    }

    return personnel
      .filter((person) => person.teamId === team.id)
      .sort((firstPerson, secondPerson) => {
        if (firstPerson.role !== secondPerson.role) {
          return firstPerson.role === "leader"
            ? -1
            : 1;
        }

        if (
          firstPerson.status !== secondPerson.status
        ) {
          return firstPerson.status === "active"
            ? -1
            : 1;
        }

        return firstPerson.fullName.localeCompare(
          secondPerson.fullName,
          "vi",
        );
      });
  }, [personnel, team]);

  const leader = useMemo(() => {
    if (!team?.leaderId) {
      return null;
    }

    return (
      personnel.find(
        (person) => person.id === team.leaderId,
      ) ?? null
    );
  }, [personnel, team]);

  const availablePersonnel = useMemo(() => {
    if (!team) {
      return [];
    }

    return personnel
      .filter(
        (person) =>
          person.teamId !== team.id &&
          person.status === "active" &&
          person.role === "worker",
      )
      .sort((firstPerson, secondPerson) =>
        firstPerson.fullName.localeCompare(
          secondPerson.fullName,
          "vi",
        ),
      );
  }, [personnel, team]);

  const leaderCandidates = useMemo(
    () =>
      members.filter(
        (person) => person.status === "active",
      ),
    [members],
  );

  const teamNameById = useMemo(
    () =>
      new Map(
        allTeams.map((currentTeam) => [
          currentTeam.id,
          currentTeam.name,
        ]),
      ),
    [allTeams],
  );

  const selectedPersonnel = useMemo(
    () =>
      personnel.find(
        (person) =>
          person.id === selectedPersonnelId,
      ) ?? null,
    [personnel, selectedPersonnelId],
  );

  const closeModal = () => {
    if (saving) {
      return;
    }

    setOpenModal(null);
    setSelectedPersonnelId("");
    setOperationError("");
  };

  const openEditModal = () => {
    if (!team) {
      return;
    }

    setTeamName(team.name);
    setOperationError("");
    setOpenModal("edit");
  };

  const openSelectionModal = (
    modal: "add-member" | "leader",
  ) => {
    setSelectedPersonnelId("");
    setOperationError("");
    setOpenModal(modal);
  };

  const saveTeamInformation = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!team) {
      return;
    }

    setSaving(true);
    setOperationError("");

    try {
      await updateTeam(team.id, {
        name: teamName,
      });

      setOpenModal(null);
      await loadData();
    } catch (saveError) {
      setOperationError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể cập nhật tổ.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveNewMember = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!team || !selectedPersonnelId) {
      setOperationError(
        "Vui lòng chọn nhân sự cần thêm.",
      );
      return;
    }

    setSaving(true);
    setOperationError("");

    try {
      await addTeamMember(team.id, {
        personnelId: selectedPersonnelId,
      });

      setOpenModal(null);
      setSelectedPersonnelId("");
      await loadData();
    } catch (saveError) {
      setOperationError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể thêm thành viên.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveTeamLeader = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!team || !selectedPersonnelId) {
      setOperationError(
        "Vui lòng chọn một thành viên.",
      );
      return;
    }

    setSaving(true);
    setOperationError("");

    try {
      await assignTeamLeader(team.id, {
        personnelId: selectedPersonnelId,
      });

      setOpenModal(null);
      setSelectedPersonnelId("");
      await loadData();
    } catch (saveError) {
      setOperationError(
        saveError instanceof Error
          ? saveError.message
          : "Không thể chỉ định Tổ trưởng.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmRemoveMember = (
    personnelId: string,
  ) => {
    setSelectedPersonnelId(personnelId);
    setOperationError("");
    setOpenModal("remove-member");
  };

  const handleRemoveMember = async () => {
    if (!team || !selectedPersonnelId) {
      return;
    }

    setSaving(true);
    setOperationError("");

    try {
      await removeTeamMember(
        team.id,
        selectedPersonnelId,
      );

      setOpenModal(null);
      setSelectedPersonnelId("");
      await loadData();
    } catch (removeError) {
      setOperationError(
        removeError instanceof Error
          ? removeError.message
          : "Không thể gỡ thành viên.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page team-detail-page">
        <div className="personnel-detail-state">
          <LoaderCircle
            className="spin"
            size={30}
          />
          <p>Đang tải thông tin tổ...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="page team-detail-page">
        <div className="personnel-detail-state card">
          <CircleAlert size={34} />
          <h1>Không thể mở tổ</h1>
          <p>{error || "Không tìm thấy tổ."}</p>

          <Link
            className="btn btn-secondary"
            to="/teams"
          >
            <ArrowLeft size={17} />
            Về danh sách tổ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page team-detail-page">
      <div className="personnel-detail-topbar">
        <Link
          className="personnel-back-link"
          to="/teams"
        >
          <ArrowLeft size={18} />
          Danh sách tổ
        </Link>

        <div className="personnel-detail-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={openEditModal}
          >
            <Edit3 size={17} />
            Chỉnh sửa
          </button>

          <button
            className="btn btn-secondary"
            type="button"
            onClick={() =>
              openSelectionModal("add-member")
            }
          >
            <UserPlus size={17} />
            Thêm thành viên
          </button>

          <button
            className="btn btn-primary"
            type="button"
            disabled={leaderCandidates.length === 0}
            onClick={() =>
              openSelectionModal("leader")
            }
          >
            <Crown size={17} />
            {leader
              ? "Đổi Tổ trưởng"
              : "Chỉ định Tổ trưởng"}
          </button>
        </div>
      </div>

      {!leader && (
        <div className="team-vacant-banner">
          <CircleAlert size={20} />

          <div>
            <strong>Tổ đang khuyết Tổ trưởng</strong>
            <p>
              Hãy chỉ định một thành viên đang hoạt
              động trong tổ để điều phối công việc.
            </p>
          </div>
        </div>
      )}

      <section className="team-profile-card card">
        <div className="team-profile-icon">
          <Users size={30} />
        </div>

        <div className="team-profile-main">
          <div className="team-profile-title">
            <div>
              <span>{team.teamCode}</span>
              <h1>{team.name}</h1>
              <p>{farmName}</p>
            </div>

            <span
              className={
                leader
                  ? "team-leader-status assigned"
                  : "team-leader-status vacant"
              }
            >
              <span />
              {leader
                ? "Đã có Tổ trưởng"
                : "Khuyết Tổ trưởng"}
            </span>
          </div>

          {team.note && (
            <p className="team-profile-note">
              {team.note}
            </p>
          )}

          <div className="team-profile-stats">
            <div>
              <span>Tổng thành viên</span>
              <strong>{team.memberCount}</strong>
            </div>

            <div>
              <span>Đang hoạt động</span>
              <strong>
                {team.activeMemberCount}
              </strong>
            </div>

            <div>
              <span>Tài khoản bị khóa</span>
              <strong>
                {team.memberCount -
                  team.activeMemberCount}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <section className="team-leader-section card">
        <div className="personnel-card-heading">
          <div>
            <Crown size={19} />
            <h2>Tổ trưởng</h2>
          </div>

          {leaderCandidates.length > 0 && (
            <button
              type="button"
              onClick={() =>
                openSelectionModal("leader")
              }
            >
              {leader ? "Thay đổi" : "Chỉ định"}
            </button>
          )}
        </div>

        {leader ? (
          <div className="team-current-leader">
            <span className="team-current-leader-avatar">
              {leader.fullName
                .split(" ")
                .slice(-2)
                .map((word) => word[0])
                .join("")
                .toUpperCase()}
            </span>

            <div>
              <strong>{leader.fullName}</strong>
              <span>{leader.employeeCode}</span>

              <p>
                <Phone size={15} />
                {leader.phone}
              </p>
            </div>

            <Link
              className="btn btn-secondary"
              to={`/personnel/${leader.id}`}
            >
              Xem hồ sơ
            </Link>
          </div>
        ) : (
          <div className="team-empty-leader">
            <Crown size={28} />
            <strong>Chưa có Tổ trưởng</strong>
            <p>
              Tổ trưởng phải là thành viên đang hoạt
              động của tổ.
            </p>

            {leaderCandidates.length > 0 && (
              <button
                className="btn btn-primary"
                type="button"
                onClick={() =>
                  openSelectionModal("leader")
                }
              >
                Chỉ định ngay
              </button>
            )}
          </div>
        )}
      </section>

      <section className="team-members-section card">
        <div className="team-members-heading">
          <div>
            <h2>Thành viên trong tổ</h2>
            <p>{members.length} nhân sự</p>
          </div>

          <button
            className="btn btn-secondary"
            type="button"
            onClick={() =>
              openSelectionModal("add-member")
            }
          >
            <Plus size={17} />
            Thêm thành viên
          </button>
        </div>

        {members.length === 0 ? (
          <div className="personnel-state">
            <Users size={34} />
            <strong>Tổ chưa có thành viên</strong>
            <p>
              Thêm nhân sự vào tổ trước khi chỉ định
              Tổ trưởng.
            </p>
          </div>
        ) : (
          <div className="personnel-table-wrapper">
            <table className="personnel-table team-member-table">
              <thead>
                <tr>
                  <th>Nhân sự</th>
                  <th>Số điện thoại</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th aria-label="Thao tác" />
                </tr>
              </thead>

              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="personnel-identity">
                        <span className="personnel-avatar">
                          {member.fullName
                            .split(" ")
                            .slice(-2)
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase()}
                        </span>

                        <div>
                          <strong>
                            {member.fullName}
                          </strong>
                          <span>
                            {member.employeeCode}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>{member.phone}</td>

                    <td>
                      <span
                        className={`personnel-role role-${member.role}`}
                      >
                        {member.role === "leader"
                          ? "Tổ trưởng"
                          : "Công nhân"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`personnel-status status-${member.status}`}
                      >
                        <span />
                        {member.status === "active"
                          ? "Đang hoạt động"
                          : "Bị khóa"}
                      </span>
                    </td>

                    <td>
                      <div className="team-member-actions">
                        {member.role !== "leader" &&
                          member.status ===
                            "active" && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPersonnelId(
                                  member.id,
                                );
                                setOperationError("");
                                setOpenModal("leader");
                              }}
                            >
                              <Crown size={15} />
                              Chọn làm Tổ trưởng
                            </button>
                          )}

                        <Link
                          to={`/personnel/${member.id}`}
                        >
                          Xem hồ sơ
                        </Link>

                        <button
                          className="danger"
                          type="button"
                          onClick={() =>
                            confirmRemoveMember(
                              member.id,
                            )
                          }
                        >
                          <UserMinus size={15} />
                          Gỡ khỏi tổ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {openModal === "edit" && (
        <div className="personnel-modal-backdrop">
          <form
            className="personnel-modal personnel-modal-small card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-team-title"
            onSubmit={saveTeamInformation}
          >
            <div className="personnel-modal-heading">
              <div>
                <h2 id="edit-team-title">
                  Chỉnh sửa tổ
                </h2>
                <p>{team.teamCode}</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            {operationError && (
              <div className="personnel-form-error">
                {operationError}
              </div>
            )}

            <div className="personnel-modal-content">
              <label className="personnel-field">
                <span>
                  Tên tổ <b>*</b>
                </span>

                <input
                  className="input"
                  type="text"
                  value={teamName}
                  required
                  onChange={(event) =>
                    setTeamName(event.target.value)
                  }
                />
              </label>

            </div>

            <div className="personnel-modal-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeModal}
              >
                Hủy
              </button>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <Save size={17} />
                )}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {openModal === "add-member" && (
        <div className="personnel-modal-backdrop">
          <form
            className="personnel-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
            onSubmit={saveNewMember}
          >
            <div className="personnel-modal-heading">
              <div>
                <h2 id="add-member-title">
                  Thêm thành viên
                </h2>
                <p>{team.name}</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            {operationError && (
              <div className="personnel-form-error">
                {operationError}
              </div>
            )}

            <div className="personnel-modal-content">
              {availablePersonnel.length === 0 ? (
                <div className="team-modal-empty">
                  <UserRound size={30} />
                  <strong>
                    Không có nhân sự phù hợp
                  </strong>
                  <p>
                    Tất cả công nhân đang hoạt động đã
                    thuộc tổ này hoặc không thể điều
                    chuyển.
                  </p>
                </div>
              ) : (
                <div className="team-personnel-options">
                  {availablePersonnel.map((person) => (
                    <label
                      key={person.id}
                      className={
                        selectedPersonnelId ===
                        person.id
                          ? "selected"
                          : ""
                      }
                    >
                      <input
                        type="radio"
                        name="new-team-member"
                        value={person.id}
                        checked={
                          selectedPersonnelId ===
                          person.id
                        }
                        onChange={() =>
                          setSelectedPersonnelId(
                            person.id,
                          )
                        }
                      />

                      <span className="personnel-avatar">
                        {person.fullName
                          .split(" ")
                          .slice(-2)
                          .map((word) => word[0])
                          .join("")
                          .toUpperCase()}
                      </span>

                      <div>
                        <strong>
                          {person.fullName}
                        </strong>
                        <span>
                          {person.employeeCode} ·{" "}
                          {person.phone}
                        </span>
                        <small>
                          {person.teamId
                            ? `Hiện thuộc: ${
                                teamNameById.get(
                                  person.teamId,
                                ) ??
                                "Tổ khác"
                              }`
                            : "Chưa thuộc tổ"}
                        </small>
                      </div>

                      {selectedPersonnelId ===
                        person.id && (
                        <Check size={19} />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="personnel-modal-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeModal}
              >
                Hủy
              </button>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={
                  saving || !selectedPersonnelId
                }
              >
                {saving ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <UserPlus size={17} />
                )}
                Thêm vào tổ
              </button>
            </div>
          </form>
        </div>
      )}

      {openModal === "leader" && (
        <div className="personnel-modal-backdrop">
          <form
            className="personnel-modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leader-title"
            onSubmit={saveTeamLeader}
          >
            <div className="personnel-modal-heading">
              <div>
                <h2 id="leader-title">
                  {leader
                    ? "Đổi Tổ trưởng"
                    : "Chỉ định Tổ trưởng"}
                </h2>
                <p>{team.name}</p>
              </div>

              <button
                type="button"
                aria-label="Đóng"
                onClick={closeModal}
              >
                <X size={20} />
              </button>
            </div>

            {operationError && (
              <div className="personnel-form-error">
                {operationError}
              </div>
            )}

            <div className="personnel-modal-content">
              <div className="personnel-modal-note">
                <CircleAlert size={18} />
                <p>
                  Chỉ thành viên đang hoạt động trong
                  tổ mới có thể được chọn. Nếu đổi Tổ
                  trưởng, người cũ sẽ trở lại vai trò
                  Công nhân.
                </p>
              </div>

              <div className="team-personnel-options">
                {leaderCandidates.map((person) => (
                  <label
                    key={person.id}
                    className={
                      selectedPersonnelId === person.id
                        ? "selected"
                        : ""
                    }
                  >
                    <input
                      type="radio"
                      name="team-leader"
                      value={person.id}
                      checked={
                        selectedPersonnelId === person.id
                      }
                      onChange={() =>
                        setSelectedPersonnelId(person.id)
                      }
                    />

                    <span className="personnel-avatar">
                      {person.fullName
                        .split(" ")
                        .slice(-2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </span>

                    <div>
                      <strong>
                        {person.fullName}
                      </strong>
                      <span>
                        {person.employeeCode} ·{" "}
                        {person.phone}
                      </span>
                      <small>
                        {person.id === leader?.id
                          ? "Tổ trưởng hiện tại"
                          : "Thành viên trong tổ"}
                      </small>
                    </div>

                    {selectedPersonnelId ===
                      person.id && (
                      <Check size={19} />
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="personnel-modal-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={closeModal}
              >
                Hủy
              </button>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={
                  saving || !selectedPersonnelId
                }
              >
                {saving ? (
                  <LoaderCircle
                    className="spin"
                    size={17}
                  />
                ) : (
                  <Crown size={17} />
                )}
                Xác nhận
              </button>
            </div>
          </form>
        </div>
      )}

      {openModal === "remove-member" &&
        selectedPersonnel && (
          <div className="personnel-modal-backdrop">
            <div
              className="personnel-modal personnel-modal-small card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="remove-member-title"
            >
              <div className="personnel-modal-heading">
                <div>
                  <h2 id="remove-member-title">
                    Gỡ thành viên khỏi tổ?
                  </h2>
                  <p>{selectedPersonnel.fullName}</p>
                </div>

                <button
                  type="button"
                  aria-label="Đóng"
                  onClick={closeModal}
                >
                  <X size={20} />
                </button>
              </div>

              {operationError && (
                <div className="personnel-form-error">
                  {operationError}
                </div>
              )}

              <div className="personnel-modal-content">
                {selectedPersonnel.role ===
                  "leader" && (
                  <div className="personnel-lock-warning">
                    <CircleAlert size={19} />
                    <p>
                      Đây là Tổ trưởng hiện tại. Sau
                      khi gỡ, tổ sẽ chuyển sang trạng
                      thái khuyết Tổ trưởng.
                    </p>
                  </div>
                )}

                <p className="team-remove-description">
                  Nhân sự sẽ chuyển về trạng thái
                  <strong> Chưa thuộc tổ</strong>. Tài
                  khoản và toàn bộ dữ liệu cũ vẫn được
                  giữ nguyên.
                </p>
              </div>

              <div className="personnel-modal-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={closeModal}
                >
                  Hủy
                </button>

                <button
                  className="btn personnel-lock-button"
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    void handleRemoveMember()
                  }
                >
                  {saving ? (
                    <LoaderCircle
                      className="spin"
                      size={17}
                    />
                  ) : (
                    <UserMinus size={17} />
                  )}
                  Gỡ khỏi tổ
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default TeamDetailPage;
