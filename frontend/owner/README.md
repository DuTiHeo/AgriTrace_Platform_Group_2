# AgriTrace Owner Web

Web dành cho Chủ nông trại, nằm tại `frontend/owner` trong repo chung. Ứng dụng React/Vite có dependencies riêng; ứng dụng Expo của Worker/Leader vẫn nằm ở `frontend/src/app`.

Owner dùng đúng API của backend trên `origin/master` tại commit `cee870e`. Không cần thay đổi code backend, schema, seed, migration hoặc Docker Compose để tích hợp Owner Web.

## Chạy trên máy hiện tại

1. Mở Docker Desktop, Start `agritrace_db`, sau đó Start `agritrace_backend` đã có.
2. Mở `frontend/owner/START_OWNER.cmd` bằng cách nhấp đúp. Lần đầu script tự cài dependencies; giữ cửa sổ này mở.
3. Truy cập http://localhost:5173 và đăng nhập bằng tài khoản Owner đang sử dụng.

Có thể dùng PowerShell từ thư mục `frontend`:

```powershell
npm.cmd run owner:install
npm.cmd run owner:dev
```

Hoặc từ `frontend/owner`: `npm.cmd ci`, rồi `npm.cmd run dev`. Node.js cần đáp ứng phiên bản ghi trong `package-lock.json` (Node 22.12+ hoặc 24+).

Không nạp lại seed, không chạy migration và không reset database khi chạy Owner Web. Tài khoản trong seed gốc dùng `0901000001 / Test@1234`; nếu đã đổi mật khẩu, dùng mật khẩu mới. Mật khẩu mẫu này hiện không khớp tài khoản `0901000001` trên database local đã có.

Nếu clone trên máy khác, cấu hình và khởi động backend/database theo hướng dẫn của nhóm trong [GETTING_STARTED.md](../../docs/GETTING_STARTED.md). Chủ nông trại sở hữu dữ liệu qua backend; frontend không kết nối SQL trực tiếp.

## Cấu hình API

Mặc định frontend gọi `/api`, Vite proxy tới `http://localhost:8000`. Proxy `/uploads` phục vụ ảnh nhật ký. Để dùng API khác, tạo `frontend/owner/.env.local`:

```dotenv
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8000
```

Giá trị này chỉ là địa chỉ API; không đưa secret/token vào biến `VITE_*`. Dev server dùng cổng 5173 cố định; nếu cổng đang bị chiếm, đóng cửa sổ Owner Web cũ trước khi chạy.

## Tương thích API

- `/auth/me` trả thông tin đăng nhập nhưng không có ID/ngày sinh/ngày tạo. Owner lấy `sub` từ JWT để gọi `/users/{id}` xem hồ sơ đầy đủ; backend vẫn kiểm tra quyền. Web chỉ chấp nhận role `owner`.
- Danh sách dùng các route summary có sẵn, lấy detail khi cần ranh giới/thành viên/ảnh/ghi chú/tổ hỗ trợ. Không gửi `include_details`. GET trùng được gộp, cache 15 giây, giới hạn 6 request đồng thời và xóa cache khi mutation/đổi phiên.
- Số liệu vùng trồng được nối từ danh sách mùa vụ/công việc/nhật ký. Thống kê lô thu hoạch dùng dữ liệu API. Công việc không có quan hệ mùa vụ/người giao trong API hiện tại; web không suy đoán các thông tin này.
- Tạo nhân sự mặc định là công nhân chưa có tổ. Sau khi tạo, dùng chi tiết nhân sự để gán tổ/phong tổ trưởng qua API sẵn có. Chuyển công nhân trực tiếp bằng `POST /teams/{id}/members`; không gỡ tổ cũ trước khi thêm tổ mới. Leader cần hạ vai trò trước khi chuyển tổ.
- Tạo công việc gửi `plot_id`, `team_id`, `worker_id`, nội dung và thời gian có múi giờ; không gửi `season_id` hoặc `assigned_by_id`.
- Thông báo, gửi báo lỗi, tự sửa hồ sơ Owner và truy xuất công khai chưa được backend của nhóm hỗ trợ. Giao diện hiển thị trạng thái chưa khả dụng và không gọi các route thiếu. Không tạo dữ liệu demo thay thế hoặc nút gửi báo thành công giả.
- Đổi mật khẩu, quản lý nông trại/vùng trồng/mùa vụ/nhân sự/tổ/công việc/lô thu hoạch và ghi chú nhật ký dùng các API hiện có. Các thao tác ghi chỉ đi qua API và quyền backend, không sửa database trực tiếp.

## Kiểm tra

Từ `frontend`:

```powershell
npm.cmd run owner:lint
npm.cmd run owner:build
npm.cmd run owner:test
```

`owner:test` kiểm tra method/path so với mã backend local và `origin/master`, payload theo hợp đồng hiện có, auth/cache/queue/QR. Chạy bằng transport giả lập; không ghi dữ liệu thật. Kiểm tra bảo vệ xác nhận backend/database/Docker Compose không có diff với bản GitHub.

Kiểm thử browser từ `frontend/owner`, khi API đã chạy:

```powershell
$env:OWNER_BROWSER_API_URL = 'http://127.0.0.1:8000'
node review/check-browser.cjs
```

Browser check dùng Edge headless, profile tạm, Vite cổng 15173. Chỉ gọi GET và login; không logout phía server, đổi hồ sơ/mật khẩu hay tạo/sửa/xóa dữ liệu. Mặc định dùng tài khoản mẫu; có thể truyền `OWNER_BROWSER_ACCESS_TOKEN` là phiên kiểm thử Owner sẵn có nếu mật khẩu đã đổi. Không lưu token vào source hoặc commit. `EDGE_PATH` chọn Edge executable khác.

## Đưa lên GitHub

Nhánh làm việc: `feature/owner-web`. Các file thay đổi chỉ thuộc `frontend/owner`, scripts trong `frontend/package.json`, và cấu hình TypeScript/ESLint của Expo để loại trừ thư mục owner.

```powershell
# Từ gốc AgriTrace_Platform_Group_2
git status
git diff -- backend database docker-compose.yml
git add frontend/owner frontend/package.json frontend/tsconfig.json frontend/eslint.config.js
git diff --cached --stat
git commit -m "feat: integrate owner web with existing group APIs"
git push -u origin feature/owner-web
```

Tạo PR vào `master` theo quy trình của nhóm. Chưa commit/push tự động. Không đưa thư mục dự phòng, `.env.local`, `node_modules` hoặc `dist` lên GitHub.

Kiểm tra phần Expo hiện có phát hiện lỗi TypeScript `TS2882` ở `src/constants/theme.ts` (import `@/global.css`) và lint 29 lỗi/14 cảnh báo trong source của nhóm. Các file Expo này khớp bản GitHub và chưa được sửa trong task Owner; `owner:lint`, `owner:build`, `owner:test` chạy riêng.

Kiểm chứng ngày 2026-10-03: Owner lint/build đạt, 19 kiểm tra hợp đồng/transport đạt, 62 method/path đều có ở backend GitHub. Edge đã kiểm tra 11 route danh sách, 7 trang chi tiết, các form tạo, modal giao việc, hồ sơ, đổi nông trại khi response cũ bị trễ và trạng thái các chức năng chưa hỗ trợ. Browser dùng backend GitHub gắn source chỉ đọc và `PGOPTIONS=-c default_transaction_read_only=on` trên database local hiện có; không thực hiện mutation. Phiên Owner được cấp tạm cho kiểm thử do mật khẩu local đã đổi; Worker được kiểm tra bằng login thật. Kiểm tra này chưa xác nhận mọi thao tác ghi nghiệp vụ hoặc tải dữ liệu lớn.

## Giới hạn

Backend chưa hỗ trợ phân trang/bulk details; hydrate danh sách nhiều dòng cần thêm GET và chưa tối ưu cho dữ liệu lớn. Một số luồng backend gồm nhiều transaction (tạo lô kèm đóng góp, phong vai trò rồi gán tổ); frontend không thể bảo đảm tính nguyên tử thay backend. Không tự thêm rollback hay migration.

Bộ chọn bản đồ còn mô phỏng; ranh giới thực cần tọa độ/GeoJSON WGS84 chính xác. VN-2000 chưa tự chuyển đổi. Khôi phục mật khẩu dùng OTP demo của backend, chưa có SMS thật.

Khi deploy bản build, máy chủ cần SPA fallback và reverse proxy `/api`, `/uploads`; Vite proxy chỉ áp dụng lúc dev. Backend/database local hiện có được giữ nguyên dữ liệu, kể cả schema đã tồn tại trước lần tích hợp frontend này; không rollback hoặc thay đổi schema.
