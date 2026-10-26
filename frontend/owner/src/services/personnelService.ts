import type { ChangePersonnelRoleInput, CreatePersonnelInput, CreatePersonnelResult, LockPersonnelInput, Personnel, PersonnelFilters, TransferPersonnelInput, UpdatePersonnelInput } from "../types/personnel";
import { accountService } from "./accountService";
import { httpClient } from "./httpClient";

type UserDto = {
  user_id: string;
  full_name: string;
  phone: string;
  national_id: string | null;
  date_of_birth: string | null;
  address: string | null;
  role: string;
  status: string;
  org_id?: string | null;
  team_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function mapPersonnel(user: UserDto): Personnel {
  const createdAt = user.created_at ?? "";
  return {
    id: user.user_id,
    farmId: user.org_id ?? "",
    employeeCode: `NV-${user.user_id.slice(-4).toUpperCase()}`,
    fullName: user.full_name,
    phone: user.phone,
    citizenId: user.national_id,
    dateOfBirth: user.date_of_birth,
    address: user.address,
    professionalNote: null,
    role: user.role === "leader" ? "leader" : "worker",
    teamId: user.team_id ?? null,
    status: user.status === "locked" ? "locked" : "active",
    joinedAt: createdAt.slice(0, 10),
    lastLoginAt: null,
    lockedAt: null,
    lockedReason: null,
    lockDuration: null,
    createdAt,
    updatedAt: user.updated_at ?? createdAt,
  };
}

async function getUserDetail(userId: string) {
  return httpClient.get<UserDto>(`/users/${userId}`);
}

function makeUsersQuery(filters: PersonnelFilters, role: string) {
  const params = new URLSearchParams();
  if (role !== "leader" && role !== "worker" && filters.farmId !== "all") {
    params.set("org_id", filters.farmId);
  }
  if (filters.search?.trim()) params.set("keyword", filters.search.trim());
  if (filters.role && filters.role !== "all") params.set("role", filters.role);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (role === "owner" && filters.teamId && filters.teamId !== "all" && filters.teamId !== "unassigned") {
    params.set("team_id", filters.teamId);
  }
  return params.toString();
}

export const getPersonnelList = async (filters: PersonnelFilters): Promise<Personnel[]> => {
  const currentUser = await accountService.getCurrentUser();
  if (currentUser.role === "worker") {
    const self = mapPersonnel({
      ...currentUser,
      status: "active",
    } as UserDto);
    return [self].filter((person) =>
      (!filters.role || filters.role === "all" || person.role === filters.role)
      && (!filters.status || filters.status === "all" || person.status === filters.status)
      && (!filters.teamId || filters.teamId === "all" || person.teamId === filters.teamId),
    );
  }
  if (currentUser.role === "owner" && filters.farmId === "all") {
    const farms = await httpClient.get<Array<{ org_id: string }>>("/organizations/mine");
    return (await Promise.all(farms.map((farm) => getPersonnelList({ ...filters, farmId: farm.org_id })))).flat();
  }
  const query = makeUsersQuery(filters, currentUser.role);
  const summaries = await httpClient.get<UserDto[]>(`/users${query ? `?${query}` : ""}`);
  const details = await Promise.all(summaries.filter((user) => ["worker", "leader"].includes(user.role)).map((user) => getUserDetail(user.user_id)));
  return details
    .map(mapPersonnel)
    .filter((person) => filters.teamId !== "unassigned" || person.teamId === null)
    .sort((first, second) => first.fullName.localeCompare(second.fullName, "vi"));
};

export const getPersonnelById = async (personnelId: string): Promise<Personnel | null> => {
  try {
    return mapPersonnel(await getUserDetail(personnelId));
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 404) return null;
    throw error;
  }
};

export const getPersonnelByTeam = async (teamId: string): Promise<Personnel[]> => {
  const team = await httpClient.get<{ org_id: string }>(`/teams/${teamId}`);
  return getPersonnelList({ farmId: team.org_id, teamId, role: "all", status: "all" });
};

function generatedPassword() {
  return `Fql@${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

export const createPersonnel = async (input: CreatePersonnelInput): Promise<CreatePersonnelResult> => {
  if (input.role !== "worker" || input.teamId) {
    throw new Error("Tạo công nhân trước, sau đó gán tổ hoặc phong tổ trưởng trong trang chi tiết nhân sự.");
  }
  if (!input.fullName.trim()) throw new Error("Vui lòng nhập họ và tên.");
  const initialPassword = input.autoGeneratePassword || !input.initialPassword?.trim()
    ? generatedPassword()
    : input.initialPassword.trim();
  if (initialPassword.length < 8) throw new Error("Mật khẩu khởi tạo phải có ít nhất 8 ký tự.");

  const created = await httpClient.post<UserDto>("/users", {
    org_id: input.farmId,
    full_name: input.fullName.trim(),
    phone: input.phone.trim(),
    national_id: input.citizenId?.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    address: input.address?.trim() || null,
    password: initialPassword,
  });

  window.dispatchEvent(new Event("personnel-updated"));
  window.dispatchEvent(new Event("teams-updated"));
  return { personnel: mapPersonnel(created), initialPassword };
};

export const updatePersonnel = async (
  personnelId: string,
  input: UpdatePersonnelInput,
): Promise<Personnel> => {
  const updated = await httpClient.patch<UserDto>(`/users/${personnelId}`, {
    full_name: input.fullName.trim(),
    phone: input.phone.trim(),
    national_id: input.citizenId?.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    address: input.address?.trim() || null,
  });
  window.dispatchEvent(new Event("personnel-updated"));
  return mapPersonnel(updated);
};

export const changePersonnelRole = async (
  personnelId: string,
  input: ChangePersonnelRoleInput,
): Promise<Personnel> => {
  const current = await getPersonnelById(personnelId);
  if (!current) throw new Error("Không tìm thấy nhân sự.");
  const rolePayload = input.role === "leader"
    ? { role: input.role, team_id: input.teamId ?? current.teamId }
    : { role: input.role };
  const updated = await httpClient.patch<UserDto>(`/users/${personnelId}/role`, rolePayload);
  if (input.role === "worker" && input.teamId !== undefined && input.teamId !== current.teamId) {
    return transferPersonnel(personnelId, { teamId: input.teamId });
  }
  window.dispatchEvent(new Event("personnel-updated"));
  window.dispatchEvent(new Event("teams-updated"));
  return mapPersonnel(updated);
};

export const transferPersonnel = async (
  personnelId: string,
  input: TransferPersonnelInput,
): Promise<Personnel> => {
  const current = await getPersonnelById(personnelId);
  if (!current) throw new Error("Không tìm thấy nhân sự.");
  if (current.teamId === input.teamId) return current;
  if (current.role === "leader") throw new Error("Hãy hạ vai trò tổ trưởng trước khi chuyển tổ.");
  if (input.teamId) {
    const team = await httpClient.get<{ org_id: string }>(`/teams/${input.teamId}`);
    if (team.org_id !== current.farmId) throw new Error("Không thể chuyển sang tổ thuộc nông trại khác.");
    if (current.status === "locked") throw new Error("Không thể thêm tài khoản đang bị khóa vào tổ.");
    // Existing POST moves directly; never remove the old membership first.
    await httpClient.post(`/teams/${input.teamId}/members`, { worker_ids: [personnelId] });
  } else if (current.teamId) {
    await httpClient.delete<void>(`/teams/${current.teamId}/members/${personnelId}`);
  }
  const updated = await getUserDetail(personnelId);
  window.dispatchEvent(new Event("personnel-updated"));
  window.dispatchEvent(new Event("teams-updated"));
  return mapPersonnel(updated);
};

export const lockPersonnel = async (
  personnelId: string,
  input?: LockPersonnelInput,
): Promise<Personnel> => {
  void input;
  const updated = await httpClient.patch<UserDto>(`/users/${personnelId}/status`, { status: "locked" });
  window.dispatchEvent(new Event("personnel-updated"));
  return mapPersonnel(updated);
};

export const unlockPersonnel = async (personnelId: string): Promise<Personnel> => {
  const updated = await httpClient.patch<UserDto>(`/users/${personnelId}/status`, { status: "active" });
  window.dispatchEvent(new Event("personnel-updated"));
  return mapPersonnel(updated);
};
