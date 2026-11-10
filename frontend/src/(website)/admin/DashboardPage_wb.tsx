import { listAdminLogs } from "../../features/admin/adminAudit_wb";
import { Link } from "react-router-dom";
import { Badge, DataTable, Icon, LoadFeedback, PageHead } from "../../components/admin/AdminUi_wb";
import { logActionLabel, logResults, time } from "../../features/admin/data_wb";
import { readPages, useAdminData } from "../../features/admin/useAdminData_wb";
import { webApi } from "../../sevices/webApi_wb";

async function loadDashboard(signal: AbortSignal) {
  const [owners, reports, crops, logs] = await Promise.all([
    webApi.user.listUsers({ query: { role: "owner" }, signal }),
    readPages((limit, offset) => webApi.errorReports.listErrorReports({ query: { status: "new", limit, offset }, signal })),
    webApi.cropCatalog.listCrops({ signal }),
    listAdminLogs(signal),
  ]);
  return { owners, reports, crops, logs };
}

export default function DashboardPage() {
  const dashboard = useAdminData(loadDashboard);
  return <>
    <PageHead title="Tổng quan quản trị" description="Quản lý tài khoản, tiếp nhận báo cáo lỗi và theo dõi nhật ký hệ thống." />
    <LoadFeedback pending={dashboard.pending} error={dashboard.error} retry={dashboard.reload} />
    <section className="metrics" aria-label="Chỉ số vận hành">
      <Link className="metric" to="/admin/users"><span className="metric-icon"><Icon page="users" /></span><span className="metric-copy"><span>Tài khoản Chủ nông trại</span><strong>{dashboard.data?.owners.length ?? "—"}</strong><small>Tổng số tài khoản Chủ nông trại</small></span></Link>
      <Link className="metric metric-reports" to="/admin/reports"><span className="metric-icon"><Icon page="reports" /></span><span className="metric-copy"><span>Báo cáo mới</span><strong>{dashboard.data?.reports.length ?? "—"}</strong><small>Chờ phân loại và phản hồi</small></span></Link>
      <Link className="metric" to="/admin/catalog"><span className="metric-icon"><Icon page="catalog" /></span><span className="metric-copy"><span>Danh mục giống cây</span><strong>{dashboard.data?.crops.length ?? "—"}</strong><small>Tổng số giống cây trong danh mục</small></span></Link>
    </section>
    <div className="two-cols dashboard-lists">
      <section className="panel"><div className="panel-head"><h2>Báo cáo cần tiếp nhận</h2><Link className="button" to="/admin/reports">Xem báo cáo</Link></div>
        <DataTable headers={["Báo cáo", "Nông trại"]} rows={(dashboard.data?.reports ?? []).map(report => ({
          id: report.report_id, cells: [<><strong title={report.description}>{report.description}</strong><small>{report.report_id}</small></>, report.org_name || "—"],
        }))} />
      </section>
      <section className="panel dashboard-log-panel"><div className="panel-head"><h2>Hoạt động gần đây</h2><Link className="button" to="/admin/logs">Xem nhật ký</Link></div>
        <DataTable headers={["Hoạt động", "Loại nhật ký"]} rows={(dashboard.data?.logs ?? []).map(log => ({
          id: log.log_id, cells: [<><strong title={logActionLabel(log.action)}>{logActionLabel(log.action)}</strong><small>{time(log.performed_at)}</small></>,
            <Badge tone={log.result === "failed" ? "danger" : "info"}>{logResults[log.result ?? "success"]}</Badge>],
        }))} />
      </section>
    </div>
  </>;
}
