export type ErrorReportCategory = "interface" | "data" | "performance" | "other";
export type ErrorReportStatus = "new" | "processing" | "resolved" | "rejected";

export type ErrorReport = {
  id: string;
  category: ErrorReportCategory;
  subject: string;
  description: string;
  pageUrl: string;
  status: ErrorReportStatus;
  response: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateErrorReportInput = Pick<
  ErrorReport,
  "category" | "subject" | "description" | "pageUrl"
>;

export const errorReportCategoryLabels: Record<ErrorReportCategory, string> = {
  interface: "Giao diện",
  data: "Dữ liệu",
  performance: "Hiệu năng",
  other: "Khác",
};

export const errorReportStatusLabels: Record<ErrorReportStatus, string> = {
  new: "Mới gửi",
  processing: "Đang xử lý",
  resolved: "Đã xử lý",
  rejected: "Không tiếp nhận",
};
