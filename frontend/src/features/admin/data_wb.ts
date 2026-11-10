export const pages = {
  overview: ["Tổng quan", "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  users: ["Người dùng", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4-4a4 4 0 0 1 0 8"],
  reports: ["Báo cáo lỗi", "M4 4h16v12H8l-4 4zM8 8h8m-8 4h5"],
  catalog: ["Danh mục giống cây", "M4 6h16M4 12h16M4 18h16"],
  logs: ["Nhật ký hệ thống", "M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h4"],
};
export type AdminPage = keyof typeof pages;
const formatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh",
});

export function time(value: string) {
  return formatter.format(new Date(value));
}

export function search(query: string, ...values: string[]) {
  return values.join(" ").toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi"));
}

export const roles = { admin: "Quản trị viên", owner: "Chủ nông trại", leader: "Tổ trưởng", worker: "Công nhân" };
export const userStatuses = { active: "Đang hoạt động", locked: "Bị khóa" };
export const reportStatuses = { new: "Mới", processing: "Đang xử lý", resolved: "Đã xử lý", rejected: "Từ chối" };
export const reportTypes: Record<string, string> = {
  interface: "Giao diện", data: "Dữ liệu", performance: "Hiệu năng", bug: "Lỗi ứng dụng", other: "Khác",
};
export const logResults = { success: "Thông tin", failed: "Lỗi" };

const logActionLabels = new Map([
  ["create", "Tạo mới"], ["update", "Cập nhật"], ["delete", "Xóa"],
  ["login", "Đăng nhập"], ["logout", "Đăng xuất"], ["change_password", "Đổi mật khẩu"],
  ["lock_user", "Khóa tài khoản"], ["unlock_user", "Mở khóa tài khoản"], ["change_role", "Đổi vai trò"],
  ["complete_season", "Hoàn thành mùa vụ"], ["update_season_status", "Cập nhật trạng thái mùa vụ"],
]);

export function logActionLabel(action: string) {
  return logActionLabels.get(action) ?? adminCodeLabel(action);
}

const adminCodeLabels = new Map([
  ["loi_camera", "Lỗi camera"], ["loi_dang_nhap", "Lỗi đăng nhập"],
  ["loi_dong_bo", "Lỗi đồng bộ"], ["loi_gps", "Lỗi GPS"],
  ["loi_hien_thi", "Lỗi hiển thị"], ["loi_tai_anh", "Lỗi tải ảnh"],
  ["loi_thong_bao", "Lỗi thông báo"], ["bao_cao_su_co", "Báo cáo sự cố"],
  ["bon_phan", "Bón phân"], ["gieo_trong", "Gieo trồng"],
  ["kiem_tra_sau_benh", "Kiểm tra sâu bệnh"], ["lam_co", "Làm cỏ"],
  ["lam_gian", "Làm giàn"], ["phun_thuoc", "Phun thuốc"],
  ["thu_hoach", "Thu hoạch"], ["tia_canh", "Tỉa cành"], ["tuoi_nuoc", "Tưới nước"],
  ["users", "Tài khoản"], ["crops", "Giống cây"], ["seasons", "Mùa vụ"],
  ["error_reports", "Báo cáo lỗi"], ["crop_care_milestones", "Mốc chăm sóc"],
  ["farming_logs", "Nhật ký canh tác"], ["harvest_batches", "Lô thu hoạch"],
]);

export function adminCodeLabel(value: string) {
  return adminCodeLabels.get(value) ?? value.replace(/_+/g, " ").trim();
}
