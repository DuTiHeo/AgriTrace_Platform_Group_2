import { LockOpen, PauseCircle, Pencil } from "lucide-react";
import { useLocation } from "react-router-dom";
import { adminAuditMessage } from "../../features/admin/adminAudit_wb";
import { useRef, useState } from "react";
import AdminDialog from "../../components/admin/AdminDialog_wb";
import AdminToast from "../../components/admin/AdminToast_wb";
import { Badge, DataTable, Filter, LoadFeedback, PageHead, SearchBox } from "../../components/admin/AdminUi_wb";
import { roles, search, userStatuses } from "../../features/admin/data_wb";
import { useAdminData } from "../../features/admin/useAdminData_wb";
import type { AssignableRole, UserDetail, UserSummary } from "../../sevices/backend_api_types_wb";
import { webApi } from "../../sevices/webApi_wb";

const loadUsers = (signal: AbortSignal) => webApi.user.listUsers({ signal });
type Action = { kind: "create" } | { kind: "status" | "edit"; user: UserSummary };

function RoleFields({ user }: { user: UserDetail }) {
  const [role, setRole] = useState(user.role);
  const [loadTeams] = useState(() => async (signal: AbortSignal) => {
    if (!user.org_id) return [];
    return webApi.team.listTeams({ query: { org_id: user.org_id }, signal });
  });
  const teams = useAdminData(loadTeams);
  const availableTeams = teams.data?.filter(team =>
    user.role === "worker" || !team.team_leader_id || team.team_leader_id === user.user_id
  );
  return <>

    <label>Vai trò<select name="role" value={role} onChange={event => setRole(event.target.value as AssignableRole)}>
      <option value="leader">Tổ trưởng</option><option value="worker">Công nhân</option>
    </select></label>
    {role === "leader" && <>
      <LoadFeedback pending={teams.pending} error={teams.error} retry={teams.reload} />
      <label>Tổ phụ trách<select name="team" required defaultValue={user.team_id ?? ""}>
        <option value="">Chọn tổ</option>
        {user.role === "leader" && user.team_id && !availableTeams?.some(team => team.team_id === user.team_id) &&
          <option value={user.team_id}>Tổ hiện tại</option>}
        {availableTeams?.map(team => (
          <option key={team.team_id} value={team.team_id}>
            {team.name} — {team.team_leader_id ? team.leader_name || "Đã có tổ trưởng" : "Chưa có tổ trưởng"}
          </option>
        ))}
      </select></label>
      {user.role === "worker" && <small>Nếu tổ đã có tổ trưởng, người đó sẽ trở thành công nhân trong tổ khi bạn lưu.</small>}
    </>}
  </>;
}

export default function UsersPage() {
  const { state } = useLocation();
  const [logTargetId, setLogTargetId] = useState<string | undefined>(state?.logTargetId);
  const users = useAdminData(loadUsers);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [action, setAction] = useState<Action>();
  const [message, setMessage] = useState("");
  const rows = (users.data ?? []).filter(user => (!logTargetId || user.user_id === logTargetId) && (!role || role === user.role) && (!status || status === user.status) && search(query, user.full_name, user.phone))
    .map(user => ({ id: user.user_id, cells: [
      <><strong>{user.full_name}</strong><small>{user.phone}</small></>, roles[user.role],
      <Badge tone={user.status === "locked" ? "danger" : "success"}>{userStatuses[user.status]}</Badge>,
      <div className="actions">
        <button className="table-icon-action" type="button" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${user.full_name}`} onClick={() => setAction({ kind: "edit", user })}><Pencil size={16} /></button>
        {user.role !== "admin" && <button className="table-icon-action table-danger-action" type="button"
          title={user.status === "locked" ? "Mở khóa" : "Khóa"}
          aria-label={`${user.status === "locked" ? "Mở khóa" : "Khóa"} ${user.full_name}`}
          onClick={() => setAction({ kind: "status", user })}
        >{user.status === "locked" ? <LockOpen size={16} /> : <PauseCircle size={16} />}</button>}
      </div>,
    ] }));
  const label = action?.kind === "status" && action.user.status === "locked" ? "Mở khóa tài khoản" : "Khóa tài khoản";
  const saved = (text: string) => { users.reload(); setMessage(text); };

  return <>
    <PageHead title="Quản lý người dùng" description="Cấp tài khoản và hỗ trợ quản lý quyền truy cập.">
      <button className="primary" onClick={() => setAction({ kind: "create" })}>+ Thêm tài khoản</button>
    </PageHead>
    {logTargetId && <div className="actions"><button type="button" onClick={() => setLogTargetId(undefined)}>Hiện tất cả</button></div>}
    <LoadFeedback pending={users.pending} error={users.error} retry={users.reload} />
    <section className="panel admin-list-panel admin-users-panel"><div className="filters">
      <SearchBox label="Tìm tên hoặc tài khoản" value={query} onChange={setQuery} />
      <Filter label="Tất cả vai trò" options={roles} value={role} onChange={setRole} />
      <Filter label="Tất cả trạng thái" options={userStatuses} value={status} onChange={setStatus} />
    </div><DataTable headers={["Người dùng", "Vai trò", "Trạng thái", "Thao tác"]} rows={rows} /></section>
    {action?.kind === "create" && <AdminDialog title="Thêm tài khoản" submit="Tạo tài khoản" onClose={() => setAction(undefined)} onSave={async data => {
      const owner = await webApi.user.createOwner({ body: { full_name: String(data.get("name")).trim(), phone: String(data.get("phone")).trim(), password: String(data.get("password")) } });
      saved(await adminAuditMessage("Đã tạo tài khoản Chủ nông trại.", "users", owner.user_id, "Tạo tài khoản Chủ nông trại"));
    }}>
      <label>Họ tên Chủ nông trại<input name="name" required /></label>
      <label>Số điện thoại<input name="phone" type="tel" required /></label>
      <label>Mật khẩu tạm thời<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
    </AdminDialog>}
    {action?.kind === "status" && <AdminDialog title={label} submit={label} onClose={() => setAction(undefined)} onSave={async () => {
      await webApi.user.updateStatus({ path: { user_id: action.user.user_id }, body: { status: action.user.status === "locked" ? "active" : "locked" } });
      saved(await adminAuditMessage(`Đã ${label.toLowerCase()}.`, "users", action.user.user_id, label));
    }}><p>{action.user.full_name} · {action.user.phone}</p></AdminDialog>}
    {action?.kind === "edit" && <EditUserDialog user={action.user} onClose={() => setAction(undefined)} onSaved={saved} />}
    <AdminToast message={message} clear={setMessage} />
  </>;
}

function EditUserDialog({ user, onClose, onSaved }: {
  user: UserSummary;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const path = { user_id: user.user_id };
  const [load] = useState(() => (signal: AbortSignal) => webApi.user.getUserDetail({ path, signal }));
  const detail = useAdminData(load);
  const profile = detail.data;
  const savedProfile = useRef<UserDetail>(undefined);
  return <AdminDialog title="Chỉnh sửa thông tin người dùng" submit="Lưu thay đổi" onClose={onClose} onSave={profile ? async data => {
    const full_name = String(data.get("full_name")).trim();
    const phone = String(data.get("phone")).trim();
    if (!full_name || !phone) throw new Error("Nhập họ tên và số điện thoại.");
    const previous = savedProfile.current ?? profile;
    const body = {
      full_name,
      phone,
      national_id: String(data.get("national_id")).trim() || null,
      date_of_birth: String(data.get("date_of_birth")) || null,
      address: String(data.get("address")).trim() || null,
    };
    const role = data.get("role") as AssignableRole | null;
    const teamId = role === "leader" ? String(data.get("team") ?? "") : null;
    if (role === "leader" && !teamId) throw new Error("Chọn tổ phụ trách.");
    let message = "";
    if (Object.entries(body).some(([key, value]) => value !== (previous[key as keyof typeof body] ?? null))) {
      savedProfile.current = await webApi.user.updateUser({ path, body });
      message = await adminAuditMessage("Đã cập nhật thông tin người dùng.", "users", user.user_id, "Chỉnh sửa thông tin người dùng");
    }
    if (role && (role !== previous.role || (role === "leader" && teamId !== previous.team_id))) {
      try {
        if (previous.role === "worker" && role === "leader" && teamId) {
          await webApi.team.updateTeam({
            path: { team_id: teamId },
            body: { team_leader_id: user.user_id },
          });
        } else {
          await webApi.user.updateRole({ path, body: { role, team_id: teamId } });
        }
      } catch (error) {
        if (!message) throw error;
        onSaved(message);
        throw new Error(`${message} Chưa đổi được vai trò: ${error instanceof Error ? error.message : "Vui lòng thử lại."}`);
      }
      message += (message ? " " : "") + await adminAuditMessage("Đã lưu vai trò.", "users", user.user_id, "Đổi vai trò nhân sự");
    }
    if (message) onSaved(message);
  } : undefined}>
    <LoadFeedback pending={detail.pending} error={detail.error} retry={detail.reload} />
    {profile && <>
      <section className="user-edit-section">
        <h3>Thông tin cá nhân</h3>
        <div className="user-edit-grid">
          <label>Họ tên<input name="full_name" defaultValue={profile.full_name} required /></label>
          <label>Số điện thoại<input name="phone" type="tel" defaultValue={profile.phone} required /></label>
          <label>CCCD<input name="national_id" defaultValue={profile.national_id ?? ""} /></label>
          <label>Ngày sinh<input name="date_of_birth" type="date" defaultValue={profile.date_of_birth ?? ""} /></label>
          <label className="user-edit-address">Địa chỉ<textarea name="address" defaultValue={profile.address ?? ""} /></label>
        </div>
      </section>
      <section className="user-edit-section">
        <h3>Quyền truy cập</h3>
        <div className="user-edit-grid">
          {profile.role === "leader" || profile.role === "worker"
            ? <RoleFields user={profile} />
            : <p>Vai trò <strong>{roles[profile.role]}</strong></p>}
        </div>
      </section>
    </>}
  </AdminDialog>;
}
