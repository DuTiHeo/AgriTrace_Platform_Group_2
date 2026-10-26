export type TeamLeaderStatus =
  | "all"
  | "assigned"
  | "vacant";

export type Team = {
  id: string;
  farmId: string;
  teamCode: string;
  name: string;
  note: string | null;

  leaderId: string | null;

  createdAt: string;
  updatedAt: string;
};

export type TeamSummary = Team & {
  memberCount: number;
  activeMemberCount: number;
};

export type CreateTeamInput = {
  farmId: string;
  name: string;
  note?: string;
};

export type UpdateTeamInput = {
  name: string;
  note?: string;
};

export type TeamFilters = {
  farmId: string;
  search?: string;
  leaderStatus?: TeamLeaderStatus;
};

export type AssignTeamLeaderInput = {
  personnelId: string;
};

export type AddTeamMemberInput = {
  personnelId: string;
};