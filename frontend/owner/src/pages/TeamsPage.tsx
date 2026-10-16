import "../styles/personnel.css";
import "../styles/teams.css";
import {
  ChevronRight,
  Crown,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
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
import type { Personnel } from "../types/personnel";
import type {
  TeamLeaderStatus,
  TeamSummary,
} from "../types/team";

function TeamsPage() {
  const { farms, selectedFarmId, loadingFarms } =
    useFarmContext();

  const [teams, setTeams] = useState<TeamSummary[]>(
    [],
  );
  const [personnel, setPersonnel] = useState<
    Personnel[]
  >([]);

  const [search, setSearch] = useState("");
  const [leaderFilter, setLeaderFilter] =
    useState<TeamLeaderStatus>("all");

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

  const personnelById = useMemo(
    () =>
      new Map(
        personnel.map((person) => [
          person.id,
          person,
        ]),
      ),
    [personnel],
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
        setTeams([]);
        setPersonnel([]);
        setLoading(false);
      }

      return;
    }

    setLoading(true);
    setError("");

    try {
      const [teamGroups, personnelGroups] =
        await Promise.all([
          Promise.all(
            selectedFarmIds.map((farmId) =>
              getTeamList({
                farmId,
                leaderStatus: "all",
              }),
            ),
          ),
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
        ]);

      if (request !== loadRequest.current) return;

      setTeams(teamGroups.flat());
      setPersonnel(personnelGroups.flat());
    } catch (loadError) {
      if (request !== loadRequest.current) return;
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách tổ.",
      );
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [loadingFarms, selectedFarmIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => { window.clearTimeout(timer); loadRequest.current += 1; };
  }, [loadData]);

  const filteredTeams = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase("vi");

    return teams.filter((team) => {
      const leader = team.leaderId
        ? personnelById.get(team.leaderId)
        : null;

      const matchesSearch =
        !normalizedSearch ||
        [
          team.name,
          team.teamCode,
          leader?.fullName ?? "",
        ].some((value) =>
          value
            .toLocaleLowerCase("vi")
            .includes(normalizedSearch),
        );

      const matchesLeader =
        leaderFilter === "all" ||
        (leaderFilter === "assigned"
          ? team.leaderId !== null
          : team.leaderId === null);

      return matchesSearch && matchesLeader;
    });
  }, [
    leaderFilter,
    personnelById,
    search,
    teams,
  ]);

  const summary = useMemo(
    () => ({
      total: teams.length,
      assigned: teams.filter(
        (team) => team.leaderId !== null,
      ).length,
      vacant: teams.filter(
        (team) => team.leaderId === null,
      ).length,
      unassigned: personnel.filter(
        (person) =>
          person.teamId === null &&
          person.status === "active",
      ).length,
    }),
    [personnel, teams],
  );

  const hasActiveFilters =
    search.trim() !== "" || leaderFilter !== "all";

  const resetFilters = () => {
    setSearch("");
    setLeaderFilter("all");
  };

  return (
    <div className="page teams-page">
      <div className="page-heading">
        <div>
          <h1>Nhân sự &amp; Tổ</h1>
          <p>
            Tổ chức nhân sự thành các nhóm làm việc
            trong nông trại.
          </p>
        </div>

        <Link
          className="btn btn-primary"
          to="/teams/new"
        >
          <Plus size={18} />
          Tạo tổ
        </Link>
      </div>

      <nav
        className="staff-tabs"
        aria-label="Điều hướng nhân sự và tổ"
      >
        <Link className="staff-tab" to="/personnel">
          <Users size={17} />
          Nhân sự
        </Link>

        <Link
          className="staff-tab active"
          to="/teams"
        >
          <Users size={17} />
          Tổ công nhân
        </Link>
      </nav>

      <section
        className="personnel-summary-grid"
        aria-label="Tổng quan tổ công nhân"
      >
        <article className="personnel-summary-card card">
          <span className="personnel-summary-icon">
            <Users size={21} />
          </span>

          <div>
            <span>Tổng số tổ</span>
            <strong>{summary.total}</strong>
          </div>
        </article>

        <article className="personnel-summary-card card">
          <span className="personnel-summary-icon success">
            <UserCheck size={21} />
          </span>

          <div>
            <span>Đã có Tổ trưởng</span>
            <strong>{summary.assigned}</strong>
          </div>
        </article>

        <article className="personnel-summary-card card">
          <span className="personnel-summary-icon danger">
            <UserX size={21} />
          </span>

          <div>
            <span>Khuyết Tổ trưởng</span>
            <strong>{summary.vacant}</strong>
          </div>
        </article>

        <article className="personnel-summary-card card">
          <span className="personnel-summary-icon warning">
            <UserRoundPlus size={21} />
          </span>

          <div>
            <span>Nhân sự chưa phân tổ</span>
            <strong>{summary.unassigned}</strong>
          </div>
        </article>
      </section>

      <section className="teams-list-section card">
        <div className="teams-toolbar">
          <label className="personnel-search">
            <Search size={18} />

            <input
              type="search"
              value={search}
              placeholder="Tìm tên tổ, mã tổ hoặc Tổ trưởng..."
              aria-label="Tìm kiếm tổ công nhân"
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <select
            className="input teams-filter"
            value={leaderFilter}
            aria-label="Lọc theo trạng thái Tổ trưởng"
            onChange={(event) =>
              setLeaderFilter(
                event.target
                  .value as TeamLeaderStatus,
              )
            }
          >
            <option value="all">
              Tất cả trạng thái
            </option>
            <option value="assigned">
              Đã có Tổ trưởng
            </option>
            <option value="vacant">
              Chưa có Tổ trưởng
            </option>
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
            <p>Đang tải danh sách tổ...</p>
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
        ) : filteredTeams.length === 0 ? (
          <div className="personnel-state">
            <Users size={36} />
            <strong>Không tìm thấy tổ</strong>
            <p>
              Hãy thay đổi bộ lọc hoặc tạo tổ công
              nhân mới.
            </p>
          </div>
        ) : (
          <div className="team-card-grid">
            {filteredTeams.map((team) => {
              const leader = team.leaderId
                ? personnelById.get(team.leaderId)
                : null;

              return (
                <article
                  className="team-card"
                  key={team.id}
                >
                  <div className="team-card-header">
                    <div>
                      <span className="team-code">
                        {team.teamCode}
                      </span>

                      <h2>{team.name}</h2>

                      {selectedFarmId === "all" && (
                        <p>
                          {farmNameById.get(
                            team.farmId,
                          ) ?? "Nông trại"}
                        </p>
                      )}
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

                  <div className="team-leader-box">
                    {leader ? (
                      <>
                        <span className="team-leader-avatar">
                          {leader.fullName
                            .split(" ")
                            .slice(-2)
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase()}
                        </span>

                        <div>
                          <small>Tổ trưởng</small>
                          <strong>
                            {leader.fullName}
                          </strong>
                          <span>{leader.phone}</span>
                        </div>

                        <Crown size={19} />
                      </>
                    ) : (
                      <>
                        <span className="team-leader-avatar vacant">
                          <UserX size={19} />
                        </span>

                        <div>
                          <small>Tổ trưởng</small>
                          <strong>
                            Chưa được chỉ định
                          </strong>
                          <span>
                            Chọn một thành viên trong tổ.
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="team-card-stats">
                    <div>
                      <span>Thành viên</span>
                      <strong>
                        {team.memberCount} người
                      </strong>
                    </div>

                    <div>
                      <span>Đang hoạt động</span>
                      <strong>
                        {team.activeMemberCount} người
                      </strong>
                    </div>
                  </div>

                  {team.note && (
                    <p className="team-card-note">
                      {team.note}
                    </p>
                  )}

                  <Link
                    className="team-detail-link"
                    to={`/teams/${team.id}`}
                  >
                    Xem chi tiết tổ
                    <ChevronRight size={17} />
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        {!loading &&
          !error &&
          filteredTeams.length > 0 && (
            <div className="personnel-list-footer">
              Hiển thị {filteredTeams.length} trên{" "}
              {teams.length} tổ công nhân
            </div>
          )}
      </section>
    </div>
  );
}

export default TeamsPage;
