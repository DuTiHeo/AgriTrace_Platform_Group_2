import { getPersonnelById } from "./personnelService";
import type { AddTeamMemberInput, AssignTeamLeaderInput, CreateTeamInput, Team, TeamFilters, TeamSummary, UpdateTeamInput } from "../types/team";
import { ApiError, httpClient } from "./httpClient";

type TeamDto = {
  team_id: string;
  org_id: string;
  name: string;
  team_leader_id: string | null;
  leader_name?: string | null;
  member_count?: number;
  active_member_count?: number;
  created_at: string | null;
  updated_at?: string | null;
  members?: Array<{
    user_id: string;
    full_name: string;
    phone: string;
    role: string;
    status: string;
  }>;
};

function mapTeam(dto: TeamDto): Team {
  return {
    id: dto.team_id,
    farmId: dto.org_id,
    teamCode: `TO-${dto.team_id.slice(-4).toUpperCase()}`,
    name: dto.name,
    note: null,
    leaderId: dto.team_leader_id,
    createdAt: dto.created_at ?? "",
    updatedAt: dto.updated_at ?? dto.created_at ?? "",
  };
}

function mapTeamSummary(dto: TeamDto): TeamSummary {
  const team = mapTeam(dto);
  return {
    ...team,
    memberCount: dto.member_count ?? dto.members?.length ?? 0,
    activeMemberCount: dto.active_member_count ?? dto.members?.filter((member) => member.status === "active").length ?? 0,
  };
}

async function getTeamDetail(teamId: string) {
  return httpClient.get<TeamDto>(`/teams/${teamId}`);
}

export const getTeamList = async (filters: TeamFilters): Promise<TeamSummary[]> => {
  const params = new URLSearchParams();
  if (filters.farmId !== "all") params.set("org_id", filters.farmId);
  if (filters.search?.trim()) params.set("keyword", filters.search.trim());
  const teams = await httpClient.get<TeamDto[]>(`/teams?${params}`);
  const details = await Promise.all(teams.map((team) => getTeamDetail(team.team_id)));
  return details
    .map(mapTeamSummary)
    .filter((team) => filters.leaderStatus !== "assigned" || team.leaderId !== null)
    .filter((team) => filters.leaderStatus !== "vacant" || team.leaderId === null)
    .sort((first, second) => first.name.localeCompare(second.name, "vi"));
};

export const getTeamById = async (teamId: string): Promise<Team | null> => {
  try {
    return mapTeam(await getTeamDetail(teamId));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

export const getTeamSummaryById = async (teamId: string): Promise<TeamSummary | null> => {
  try {
    return mapTeamSummary(await getTeamDetail(teamId));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

export const createTeam = async (input: CreateTeamInput): Promise<Team> => {
  const created = await httpClient.post<TeamDto>("/teams", {
    org_id: input.farmId,
    name: input.name.trim(),
  });
  window.dispatchEvent(new Event("teams-updated"));
  return mapTeam(created);
};

export const updateTeam = async (teamId: string, input: UpdateTeamInput): Promise<Team> => {
  const updated = await httpClient.patch<TeamDto>(`/teams/${teamId}`, {
    name: input.name.trim(),
  });
  window.dispatchEvent(new Event("teams-updated"));
  return mapTeam(updated);
};

export const addTeamMember = async (teamId: string, input: AddTeamMemberInput) => {
  const [team, personnel] = await Promise.all([
    getTeamById(teamId),
    getPersonnelById(input.personnelId),
  ]);
  if (!team) throw new Error("Không tìm thấy tổ công nhân.");
  if (!personnel) throw new Error("Không tìm thấy nhân sự.");
  if (personnel.farmId !== team.farmId) throw new Error("Không thể thêm nhân sự thuộc nông trại khác.");
  if (personnel.status === "locked") throw new Error("Không thể thêm tài khoản đang bị khóa vào tổ.");
  if (personnel.role === "leader" && personnel.teamId !== teamId) {
    throw new Error("Hãy thay đổi vai trò Tổ trưởng trước khi chuyển người này sang tổ khác.");
  }
  if (personnel.teamId === teamId) return personnel;
  await httpClient.post(`/teams/${teamId}/members`, { worker_ids: [input.personnelId] });
  window.dispatchEvent(new Event("teams-updated"));
  window.dispatchEvent(new Event("personnel-updated"));
  return getPersonnelById(input.personnelId);
};

export const removeTeamMember = async (teamId: string, personnelId: string) => {
  await httpClient.delete<void>(`/teams/${teamId}/members/${personnelId}`);
  window.dispatchEvent(new Event("teams-updated"));
  window.dispatchEvent(new Event("personnel-updated"));
  return getPersonnelById(personnelId);
};

export const assignTeamLeader = async (
  teamId: string,
  input: AssignTeamLeaderInput,
): Promise<Team> => {
  const updated = await httpClient.patch<TeamDto>(`/teams/${teamId}`, {
    team_leader_id: input.personnelId,
  });
  window.dispatchEvent(new Event("teams-updated"));
  window.dispatchEvent(new Event("personnel-updated"));
  return mapTeam(updated);
};

export const removeTeamLeader = async (teamId: string): Promise<Team> => {
  const updated = await httpClient.patch<TeamDto>(`/teams/${teamId}`, {
    team_leader_id: null,
  });
  window.dispatchEvent(new Event("teams-updated"));
  window.dispatchEvent(new Event("personnel-updated"));
  return mapTeam(updated);
};

export const deleteTeam = async (teamId: string): Promise<void> => {
  await httpClient.delete<void>(`/teams/${teamId}`);
  window.dispatchEvent(new Event("teams-updated"));
};
