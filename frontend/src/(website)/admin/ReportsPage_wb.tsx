import { useLocation } from "react-router-dom";
import { adminAuditMessage } from "../../features/admin/adminAudit_wb";
import { useState } from "react";
import AdminDialog from "../../components/admin/AdminDialog_wb";
import AdminToast from "../../components/admin/AdminToast_wb";
import { Badge, DataTable, Filter, LoadFeedback, PageHead, SearchBox } from "../../components/admin/AdminUi_wb";
import { adminCodeLabel, reportStatuses, reportTypes, search, time } from "../../features/admin/data_wb";
import { listReports, useAdminData } from "../../features/admin/useAdminData_wb";
import type { ErrorReportOut, ErrorReportStatus } from "../../sevices/backend_api_types_wb";
import { resolveMediaUrl } from "../../sevices/httpClient_wb";
import { webApi } from "../../sevices/webApi_wb";

const tones = { new: "info", processing: "warning", resolved: "success", rejected: "danger" };
const sender = (report: ErrorReportOut) => report.user_full_name || report.user_phone || report.user_id;

export default function ReportsPage() {
  const reports = useAdminData(listReports);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [farm, setFarm] = useState("");
  const [type, setType] = useState("");
  const { state } = useLocation();
  const [selected, setSelected] = useState<string | undefined>(state?.logTargetId);
  const [message, setMessage] = useState("");
  const items = reports.data ?? [];
  const farms = Object.fromEntries(items.map(report => [report.org_id, report.org_name || report.org_id]));
  const types = { ...reportTypes, ...Object.fromEntries(items.flatMap(report => report.error_type ? [[report.error_type, reportTypes[report.error_type] ?? adminCodeLabel(report.error_type)]] : [])) };
  const rows = items.filter(report => (!status || report.status === status) && (!farm || report.org_id === farm) &&
    (!type || report.error_type === type) && search(query, report.report_id, report.description, sender(report)))
    .sort((a, b) => Number(b.status === "new") - Number(a.status === "new") || Date.parse(b.submitted_at) - Date.parse(a.submitted_at))
    .map(report => ({ id: report.report_id, cells: [
      <strong className="report-summary">{report.description}</strong>,
      <>{sender(report)}<small>{report.org_name}</small></>,
      <Badge>{types[report.error_type ?? ""] ?? "—"}</Badge>,
      <Badge tone={tones[report.status]}>{reportStatuses[report.status]}</Badge>,
      time(report.submitted_at),
      <button onClick={() => setSelected(report.report_id)}>Xem &amp; phản hồi</button>,
    ] }));

  return <>
    <PageHead title="Báo cáo lỗi từ người dùng" description="Ưu tiên báo cáo mới và phản hồi người gửi." />
    <LoadFeedback pending={reports.pending} error={reports.error} retry={reports.reload} />
    <section className="panel admin-list-panel admin-reports-panel"><div className="filters">
      <SearchBox label="Tìm mã, nội dung hoặc người gửi" value={query} onChange={setQuery} />
      <Filter label="Tất cả trạng thái" options={reportStatuses} value={status} onChange={setStatus} />
      <Filter label="Tất cả nông trại" options={farms} value={farm} onChange={setFarm} />
      <Filter label="Tất cả loại lỗi" options={types} value={type} onChange={setType} />
    </div><DataTable headers={["Báo cáo", "Người gửi", "Loại lỗi", "Trạng thái", "Thời gian gửi", "Thao tác"]} rows={rows} /></section>
    {selected && <ReportDialog key={selected} reportId={selected} onClose={() => setSelected(undefined)} onSaved={message => {
      reports.reload();
      setMessage(message);
    }} />}
    <AdminToast message={message} clear={setMessage} />
  </>;
}

function ReportDialog({ reportId, onClose, onSaved }: {
  reportId: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [load] = useState(() => (signal: AbortSignal) =>
    webApi.errorReports.getErrorReport({ path: { report_id: reportId }, signal }));
  const detail = useAdminData(load);
  const report = detail.data;
  const [brokenImage, setBrokenImage] = useState(false);
  const imageUrl = report?.screenshot_url && /^(?:\/(?!\/)|https?:\/\/)/i.test(report.screenshot_url)
    ? resolveMediaUrl(report.screenshot_url) : undefined;

  return <AdminDialog title="Chi tiết báo cáo lỗi" submit="Lưu phản hồi" onClose={onClose} onSave={report ? async data => {
    const admin_response = String(data.get("reply")).trim();
    if (!admin_response) throw new Error("Nhập nội dung phản hồi.");
    await webApi.errorReports.updateErrorReport({
      path: { report_id: reportId },
      body: { status: data.get("status") as ErrorReportStatus, admin_response },
    });
    onSaved(await adminAuditMessage("Đã lưu phản hồi.", "error_reports", reportId, "Phản hồi báo cáo lỗi"));
  } : undefined}>
    <LoadFeedback pending={detail.pending} error={detail.error} retry={detail.reload} />
    {report && <>
      {(report.user_full_name || (report.user_phone && report.user_phone !== sender(report)) || report.updated_at) && (
        <section className="report-detail-section">
          <div className="report-detail-meta">
            {report.user_full_name && <p>Tên người gửi <strong>{report.user_full_name}</strong></p>}
            {report.user_phone && report.user_phone !== sender(report) && <p>Số điện thoại <strong>{report.user_phone}</strong></p>}
            {report.updated_at && <p>Cập nhật lần cuối <strong>{time(report.updated_at)}</strong></p>}
          </div>
        </section>
      )}
      <section className="report-detail-section">
        <h3>Nội dung lỗi</h3>
        <p className="description">{report.description}</p>
      </section>
      <section className="report-detail-section">
        <h3>Ảnh đính kèm</h3>
        {imageUrl && !brokenImage ? (
          <a href={imageUrl} target="_blank" rel="noreferrer">
            <img className="report-screenshot" src={imageUrl} alt="Ảnh đính kèm báo cáo lỗi" onError={() => setBrokenImage(true)} />
          </a>
        ) : <p className="muted">{report.screenshot_url ? "Không thể tải ảnh đính kèm." : "Không có ảnh đính kèm."}</p>}
      </section>
      <section className="report-detail-section report-response">
      <h3>Phản hồi</h3>
      <label>Trạng thái mới<select name="status" defaultValue={report.status === "new" ? "processing" : report.status}>
        {Object.entries(reportStatuses).filter(([key]) => key !== "new").map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label>Phản hồi cho người gửi<textarea name="reply" defaultValue={report.admin_response ?? ""} required /></label>
      </section>
    </>}
  </AdminDialog>;
}