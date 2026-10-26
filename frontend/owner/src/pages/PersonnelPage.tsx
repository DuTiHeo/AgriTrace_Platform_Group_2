import "../styles/personnel.css";
import {
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  UserRoundPlus,
  Users,
  UserX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { useFarmContext } from "../contexts/FarmContext";
import { getPersonnelList } from "../services/personnelService";
import { getTeamList } from "../services/teamService";
import type {
  Personnel,
  PersonnelRole,
  PersonnelStatus,
} from "../types/personnel";
import type { TeamSummary } from "../types/team";

const roleLabels: Record<PersonnelRole, string> = {
  worker: "Công nhân",
  leader: "Tổ trưởng",
};

const statusLabels: Record<PersonnelStatus, string> = {
  active: "Đang hoạt động",
  locked: "Bị khóa",
};

function PersonnelPage() {
  const { farms, selectedFarmId, loadingFarms } =
    useFarmContext();

  const [personnel, setPersonnel] = useState<
    Personnel[]
  >([]);
  const [teams, setTeams] = useState<TeamSummary[]>(
    [],
  );

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    PersonnelRole | "all"
  >("all");
  const [teamFilter, setTeamFilter] =
    useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    PersonnelStatus | "all"
  >("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedFarmIds = useMemo(() => {
    if (selectedFarmId === "all") {
      return farms.map((farm) => farm.id);
    }

    return selectedFarmId ? [selectedFarmId] : [];
  }, [farms, selectedFarmId]);

  const farmNameById = useMemo(
    () =>
      new Map(
        farms.map((farm) => [farm.id, farm.name]),
      ),
    [farms],
  );

  const teamNameById = useMemo(
    () =>
      new Map(
        teams.map((team) => [team.id, team.name]),
      ),
    [teams],
  );

  const loadRequest = useRef(0);
  const loadData = useCallback(async () => {
    const request = ++loadRequest.current;
    if (
      loadingFarms ||
      selectedFarmIds.length === 0
    ) {
      if (!loadingFarms) {
        if (request !== loadRequest.current) return;
        setPersonnel([]);
        setTeams([]);
        setLoading(false);
      }

      return;
    }

    setLoading(true);
    setError("");

    try {
      const [personnelGroups, teamGroups] =
        await Promise.all([
          Promise.all(
            selectedFarmIds.map((farmId) =>
              getPersonnelList({
                farmId,
                role: "all",
                teamId: "all",
                status: "all",
              }),
            ),
          ),
          Promise.all(
            selectedFarmIds.map((farmId) =>
              getTeamList({
                farmId,
                leaderStatus: "all",
              }),
            ),
          ),
        ]);

      if (request !== loadRequest.current) return;

      setPersonnel(
        personnelGroups
          .flat()
          .sort((firstPerson, secondPerson) =>
            firstPerson.fullName.localeCompare(
              secondPerson.fullName,
              "vi",
            ),
          ),
      );

      setTeams(teamGroups.flat());
    } catch (loadError) {
      if (request !== loadRequest.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách nhân sự.",
      );
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [loadingFarms, selectedFarmIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  const filteredPersonnel = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("vi");

    return personnel.filter((person) => {
      const matchesSearch =
        !normalizedSearch ||
        [
          person.fullName,
          person.employeeCode,
          person.phone,
        ].some((value) =>
          value
            .toLocaleLowerCase("vi")
            .includes(normalizedSearch),
        );

      const matchesRole =
        roleFilter === "all" ||
        person.role === roleFilter;

      const matchesStatus =
        statusFilter === "all" ||
        person.status === statusFilter;

      const matchesTeam =
        teamFilter === "all" ||
        (teamFilter === "unassigned"
          ? person.teamId === null
          : person.teamId === teamFilter);

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus &&
        matchesTeam
      );
    });
  }, [
    personnel,
    roleFilter,
    search,
    statusFilter,
    teamFilter,
  ]);

  const summary = useMemo(
    () => ({
      total: personnel.length,
      active: personnel.filter(
        (person) => person.status === "active",
      ).length,
      locked: personnel.filter(
        (person) => person.status === "locked",
      ).length,
      unassigned: personnel.filter(
        (person) => person.teamId === null,
      ).length,
    }),
    [personnel],
  );

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setTeamFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    roleFilter !== "all" ||
    teamFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div className="page personnel-page">
      <div className="page-heading">
        <div>
          <h1>Nhân sự &amp; Tổ</h1>
          <p>
            Quản lý tài khoản, vai trò và tổ công tác
            trong nông trại.
          </p>
        </div>

        <Link
          className="btn btn-primary"
          to="/personnel/new"
        >
          <UserPlus size={18} />
          Thêm nhân sự
        </Link>
      </div>

      <nav
        className="staff-tabs"
        aria-label="Điều hướng nhân sự và tổ"
      >
        <Link
          className="staff-tab active"
          to="/personnel"
        >
          <Users size={17} />
          Nhân sự
        </Link>

        <Link className="staff-tab" to="/teams">
          <Users size={17} />
          Tổ công nhân
        </Link>
      </nav>

      <section
        className="personnel-summary-grid"
        aria-label="Tổng quan nhân sự"
      >
        <article className="personnel-summary-card card">
          <span className="personnel-summary-icon">
            <Users size={21} />
          </span>

          <div>
            <span>Tổng nhân sự</span>
            <strong>{summary.total}</strong>
          </div>
        </article>

        <article className="personnel-summary-card card">
          <span className="personnel-summary-icon success">
            <UserCheck size={21} />
          </span>

          <div>
            <span>Đang hoạt động</span>
            <strong>{summary.active}</strong>
          </div>
        </article>

        <article className="personnel-summary-card card">
          <span className="personnel-summary-icon danger">
            <UserX size={21} />
          </span>

          <div>
            <span>Tài khoản bị khóa</span>
            <strong>{summary.locked}</strong>
          </div>
        </article>

        <article className="personnel-summary-card card">
          <span className="personnel-summary-icon warning">
            <UserRoundPlus size={21} />
          </span>

          <div>
            <span>Chưa thuộc tổ</span>
            <strong>{summary.unassigned}</strong>
          </div>
        </article>
      </section>

      <section className="personnel-list-card card">
        <div className="personnel-toolbar">
          <label className="personnel-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              placeholder="Tìm tên, mã nhân sự, số điện thoại..."
              aria-label="Tìm kiếm nhân sự"
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <select
            className="input personnel-filter"
            value={roleFilter}
            aria-label="Lọc theo vai trò"
            onChange={(event) =>
              setRoleFilter(
                event.target.value as
                  | PersonnelRole
                  | "all",
              )
            }
          >
            <option value="all">Tất cả vai trò</option>
            <option value="leader">Tổ trưởng</option>
            <option value="worker">Công nhân</option>
          </select>

          <select
            className="input personnel-filter"
            value={teamFilter}
            aria-label="Lọc theo tổ"
            onChange={(event) =>
              setTeamFilter(event.target.value)
            }
          >
            <option value="all">Tất cả các tổ</option>
            <option value="unassigned">
              Chưa thuộc tổ
            </option>

            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
                {selectedFarmId === "all"
                  ? ` · ${
                      farmNameById.get(team.farmId) ??
                      "Nông trại"
                    }`
                  : ""}
              </option>
            ))}
          </select>

          <select
            className="input personnel-filter"
            value={statusFilter}
            aria-label="Lọc theo trạng thái"
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | PersonnelStatus
                  | "all",
              )
            }
          >
            <option value="all">
              Tất cả trạng thái
            </option>
            <option value="active">
              Đang hoạt động
            </option>
            <option value="locked">Bị khóa</option>
          </select>

          {hasActiveFilters && (
            <button
              className="btn btn-secondary"
              type="button"
              onClick={resetFilters}
            >
              <RefreshCw size={17} />
              Xóa lọc
            </button>
          )}
        </div>

        {loading ? (
          <div className="personnel-state">
            <LoaderCircle
              className="spin"
              size={28}
            />
            <p>Đang tải danh sách nhân sự...</p>
          </div>
        ) : error ? (
          <div className="personnel-state personnel-error">
            <UserX size={32} />
            <strong>Không thể tải dữ liệu</strong>
            <p>{error}</p>

            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => void loadData()}
            >
              <RefreshCw size={17} />
              Thử lại
            </button>
          </div>
        ) : filteredPersonnel.length === 0 ? (
          <div className="personnel-state">
            <Users size={36} />
            <strong>Không tìm thấy nhân sự</strong>
            <p>
              Hãy thay đổi bộ lọc hoặc thêm nhân sự mới.
            </p>
          </div>
        ) : (
          <>
            <div className="personnel-table-wrapper">
              <table className="personnel-table">
                <thead>
                  <tr>
                    <th>Nhân sự</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò</th>
                    <th>Tổ công tác</th>
                    <th>Trạng thái</th>
                    <th aria-label="Thao tác" />
                  </tr>
                </thead>

                <tbody>
                  {filteredPersonnel.map((person) => {
                    const initials = person.fullName
                      .split(" ")
                      .slice(-2)
                      .map((word) => word[0])
                      .join("")
                      .toUpperCase();

                    return (
                      <tr key={person.id}>
                        <td>
                          <div className="personnel-identity">
                            <span className="personnel-avatar">
                              {initials}
                            </span>

                            <div>
                              <strong>
                                {person.fullName}
                              </strong>

                              <span>
                                {person.employeeCode}
                                {selectedFarmId === "all"
                                  ? ` · ${
                                      farmNameById.get(
                                        person.farmId,
                                      ) ?? "Nông trại"
                                    }`
                                  : ""}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>{person.phone}</td>

                        <td>
                          <span
                            className={`personnel-role role-${person.role}`}
                          >
                            {roleLabels[person.role]}
                          </span>
                        </td>

                        <td>
                          {person.teamId
                            ? teamNameById.get(
                                person.teamId,
                              ) ?? "Không xác định"
                            : (
                              <span className="personnel-unassigned">
                                Chưa thuộc tổ
                              </span>
                            )}
                        </td>

                        <td>
                          <span
                            className={`personnel-status status-${person.status}`}
                          >
                            <span />
                            {statusLabels[person.status]}
                          </span>
                        </td>

                        <td>
                          <Link
                            className="personnel-detail-link"
                            to={`/personnel/${person.id}`}
                          >
                            Chi tiết
                            <ChevronRight size={17} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="personnel-list-footer">
              Hiển thị {filteredPersonnel.length} trên{" "}
              {personnel.length} nhân sự
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default PersonnelPage;
