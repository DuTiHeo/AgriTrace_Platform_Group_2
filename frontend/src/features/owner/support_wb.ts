export type ErrorReportStatus = "new" | "processing" | "resolved" | "rejected";
export type ErrorReport = { report_id: string; user_id: string; user_full_name?: string | null; org_id: string; org_name?: string | null; error_type: string | null; description: string; screenshot_url: string | null; status: ErrorReportStatus; admin_response: string | null; submitted_at: string };
export const errorReportStatuses: Record<ErrorReportStatus, string> = { new: "Mới gửi", processing: "Đang xử lý", resolved: "Đã xử lý", rejected: "Từ chối" };
export const errorReportCategories: Record<string, string> = { interface: "Giao diện", data: "Dữ liệu", performance: "Hiệu năng", bug: "Lỗi chức năng", other: "Khác" };
