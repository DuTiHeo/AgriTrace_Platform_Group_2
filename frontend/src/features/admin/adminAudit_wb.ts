import { webApi } from "../../sevices/webApi_wb";
import { readPages } from "./useAdminData_wb";

export async function listAdminLogs(signal: AbortSignal) {
  const logs = await readPages(async (limit, offset) =>
    (await webApi.systemLogs.listSystemLogs({ query: { limit, offset }, signal })).items);
  return logs.filter(log => log.actor_role === "admin" || !log.actor_id);
}

export async function adminAuditMessage(message: string, target_type: string, target_id: string, action: string) {
  try {
    await webApi.systemLogs.createSystemLog({ body: { target_type, target_id, action, result: "success" } });
    return message;
  } catch {
    return message + " Không ghi được nhật ký hệ thống.";
  }
}
