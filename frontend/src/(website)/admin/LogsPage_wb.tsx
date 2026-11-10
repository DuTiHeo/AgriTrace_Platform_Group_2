import { Link } from "react-router-dom";
import { listAdminLogs } from "../../features/admin/adminAudit_wb";
import { useState } from "react";
import AdminDialog from "../../components/admin/AdminDialog_wb";
import { Badge, DataTable, Filter, LoadFeedback, PageHead, SearchBox } from "../../components/admin/AdminUi_wb";
import { adminCodeLabel, logActionLabel, logResults, search, time } from "../../features/admin/data_wb";
import { useAdminData } from "../../features/admin/useAdminData_wb";
import type { SystemLogOut } from "../../sevices/backend_api_types_wb";

const actor = (log: SystemLogOut) => log.actor_name || log.actor_phone || "Hệ thống";
const level = (log: SystemLogOut) => <Badge tone={log.result === "failed" ? "danger" : "info"}>{logResults[log.result ?? "success"]}</Badge>;

const targetPages = new Map([
  ["users", "/admin/users"], ["crops", "/admin/catalog"],
  ["crop_care_milestones", "/admin/catalog"], ["error_reports", "/admin/reports"],
]);

export default function LogsPage() {
  const logs = useAdminData(listAdminLogs);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [selected, setSelected] = useState<SystemLogOut>();
  const targetPage = targetPages.get(selected?.target_type ?? "");
  const rows = (logs.data ?? []).filter(log => (!result || log.result === result) && search(query, actor(log), logActionLabel(log.action), log.action))
    .map(log => ({ id: log.log_id, cells: [time(log.performed_at), actor(log), logActionLabel(log.action), level(log), <button onClick={() => setSelected(log)}>Chi tiết</button>] }));

  return <>
    <PageHead title="Nhật ký hệ thống" description="Tra cứu hoạt động quản trị, lỗi và các sự kiện cần kiểm tra." />
    <LoadFeedback pending={logs.pending} error={logs.error} retry={logs.reload} />
    <section className="panel admin-list-panel admin-logs-panel"><div className="filters">
      <SearchBox label="Tìm hoạt động hoặc người thực hiện" value={query} onChange={setQuery} />
      <Filter label="Tất cả loại nhật ký" options={logResults} value={result} onChange={setResult} />
    </div><DataTable headers={["Thời gian", "Người thực hiện", "Hoạt động", "Loại nhật ký", "Thao tác"]} rows={rows} /></section>
    {selected && <AdminDialog title="Chi tiết nhật ký" onClose={() => setSelected(undefined)} footer={targetPage ? (
      <Link className="btn btn-primary" to={targetPage} state={{ logTargetId: selected.target_type === "crop_care_milestones" ? undefined : selected.target_id }}>Xem chi tiết</Link>
    ) : null}>
      <section className="report-detail-section">
        <h3>Hoạt động</h3>
        <p className="description"><strong>{logActionLabel(selected.action)}</strong></p>
      </section>
      <dl className="log-detail-meta">
        <div><dt>Thời gian</dt><dd>{time(selected.performed_at)}</dd></div>
        <div><dt>Người thực hiện</dt><dd>{actor(selected)}</dd></div>
        <div><dt>Loại nhật ký</dt><dd>{level(selected)}</dd></div>
        {selected.target_type && <div><dt>Đối tượng</dt><dd>{adminCodeLabel(selected.target_type)}</dd></div>}
      </dl>
    </AdminDialog>}
  </>;
}
