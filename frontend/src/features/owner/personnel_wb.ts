export type PersonnelRole = "worker" | "leader";

export type PersonnelStatus = "active" | "locked";

export type LockDuration = "temporary" | "indefinite";

export type Personnel = {
  id: string;
  farmId: string;
  employeeCode: string;

  fullName: string;
  phone: string;
  citizenId: string | null;
  dateOfBirth: string | null;
  address: string | null;
  professionalNote: string | null;

  role: PersonnelRole;
  teamId: string | null;
  status: PersonnelStatus;

  joinedAt: string;
  lastLoginAt: string | null;

  lockedAt: string | null;
  lockedReason: string | null;
  lockDuration: LockDuration | null;

  createdAt: string;
  updatedAt: string;
};

export type CreatePersonnelInput = {
  farmId: string;

  fullName: string;
  phone: string;
  citizenId?: string;
  dateOfBirth?: string;
  address?: string;
  professionalNote?: string;

  initialPassword?: string;
  autoGeneratePassword: boolean;

  role: PersonnelRole;
  teamId?: string | null;
};

export type CreatePersonnelResult = {
  personnel: Personnel;
  initialPassword: string;
};

export type UpdatePersonnelInput = {
  fullName: string;
  phone: string;
  citizenId?: string;
  dateOfBirth?: string;
  address?: string;
  professionalNote?: string;
};

export type ChangePersonnelRoleInput = {
  role: PersonnelRole;
  teamId?: string | null;
};

export type TransferPersonnelInput = {
  teamId: string | null;
};

export type LockPersonnelInput = {
  reason: string;
  duration: LockDuration;
};

export type PersonnelFilters = {
  farmId: string;
  search?: string;
  role?: PersonnelRole | "all";
  teamId?: string | "all" | "unassigned";
  status?: PersonnelStatus | "all";
};