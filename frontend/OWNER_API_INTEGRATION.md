# Tích hợp API web Owner

Ngày rà soát: 01/11/2026. Phạm vi: web Owner, không sửa backend/database hoặc ứng dụng mobile.

Các màn hình dùng service tại `src/sevices`; HTTP, token, lỗi và cache dùng chung `httpClient_wb.ts`. Danh mục transport đủ 97 thao tác thuộc 17 nhóm được kiểm tra đối chiếu router backend. Có transport không có nghĩa Owner được dùng API riêng Admin.

## Các trang và thao tác đã nối trong code

| Màn hình | Thao tác và API |
| --- | --- |
| Đăng nhập, đổi/quên mật khẩu, đăng xuất | `/auth/login`, `/auth/me`, `/auth/change-password`, `/auth/forgot-password`, `/auth/verify-otp`, `/auth/reset-password`, `/auth/logout` |
| Khung web | Hồ sơ từ `/auth/me`, `/users/{id}`; nông trại từ `/organizations/mine`; chuông từ `/notifications/unread-count`, cập nhật mỗi phút khi tab đang hiển thị và sau các sự kiện thay đổi |
| Tổng quan | GET tổ chức, vùng trồng, mùa vụ, công việc, thu hoạch; bộ lọc hôm nay theo giờ Việt Nam; nút cập nhật gọi lại service |
| Nông trại | Danh sách/chi tiết/tạo/cập nhật thông tin và ranh giới, trạng thái, xóa mềm qua `/organizations`; lựa chọn lưu nháp được PATCH sau khi tạo khi cần |
| Vùng trồng | Danh sách/chi tiết/tạo/sửa thông tin, ranh giới và trạng thái, xóa mềm qua `/plots`; lựa chọn chưa hoạt động được PATCH sau khi tạo |
| Mùa vụ | Danh sách/chi tiết/tạo/sửa ngày thu hoạch, đổi trạng thái, xóa qua `/seasons`; giống cây từ `/crops`; gán/gỡ tổ qua `/seasons/{id}/teams` |
| Lịch nhắc trong chi tiết mùa vụ | GET/POST/PATCH/DELETE `/reminders`; đánh dấu đã xem qua `/{id}/status`; nút gửi nhắc đến hạn gọi `/reminders/dispatch?season_id=...` sau xác nhận |
| Nhân sự | GET/POST/PATCH `/users`, khóa/mở khóa qua `/{id}/status`; form tạo sinh mật khẩu ban đầu và dùng đúng payload backend |
| Tổ công tác | GET/POST/PATCH/DELETE `/teams`; thêm/gỡ thành viên qua `/{id}/members`; đổi/gỡ tổ trưởng qua PATCH tổ |
| Công việc | Danh sách từ `/tasks`; giao việc POST `/tasks`; thu hồi DELETE `/tasks/{id}` sau xác nhận; ngày bắt đầu 08:00, hạn 17:00 với offset +07:00 |
| Nhật ký canh tác | Danh sách/chi tiết/ảnh từ `/farming-logs`; thêm ghi chú POST `/log-notes`, đánh dấu xử lý PATCH `/log-notes/{id}`. Owner không gọi API tạo nhật ký/upload ảnh vốn dành cho Worker/Leader |
| Thu hoạch | Danh sách/chi tiết/tạo/sửa/hủy `/harvest-batches`; sửa kg đóng góp qua `/batch-seasons/{batch}/{season}`; tổng kg có nguồn đóng góp không gửi trực tiếp trong PATCH lô |
| QR | Nút tạo gọi POST `/harvest-batches/{id}/generate-qr`; dùng `qr_url` trả về vẽ QR, tải PNG tại trình duyệt, mở đường dẫn; không gọi dịch vụ tạo ảnh bên thứ ba |
| Thông báo | Bỏ dữ liệu mẫu. GET `/notifications` có phân trang lấy đủ, PATCH một/tất cả đã đọc; đọc lỗi giữ trạng thái cũ; hiển thị cả thông báo cũ hơn hôm qua; liên kết loại báo lỗi đến Hỗ trợ |
| Hỗ trợ & báo lỗi | GET/POST `/error-reports`, theo nông trại; hiển thị phản hồi Admin; DELETE có xác nhận chỉ khi báo cáo do tài khoản hiện tại gửi và còn `new`; lọc/tìm tức thời |

Nút điều hướng, tìm kiếm/lọc trên dữ liệu đã tải, mở/đóng popup và tải PNG là thao tác tại trình duyệt, không cần API ghi riêng.

## Giới hạn và API còn thiếu

1. **Sửa hồ sơ của chính Owner:** PATCH `/users/{user_id}` hiện gọi `ensure_owns_org(target.org_id)`. Owner thường không có `org_id` nên bị từ chối ngay cả khi sửa chính mình. Web giữ chỉ đọc; cần backend có endpoint tự cập nhật hoặc quyền self-update. `email` cũng không có trong schema hồ sơ hiện tại.
2. **Tùy chọn nhận từng loại thông báo:** chưa có endpoint lưu preferences/đăng ký từng loại. Các tùy chọn trên trang Tài khoản vẫn vô hiệu hóa; không báo lưu thành công vào backend. Khác với danh sách thông báo đã nối API thật.
3. **Ghi chú mùa vụ:** `SeasonCreate`/`SeasonUpdate` chưa nhận `notes`. Ô ghi chú được giữ nhưng khóa với giải thích; không cho nhập rồi mất sau khi lưu. Ghi chú trên từng nhật ký dùng `/log-notes` vẫn hoạt động độc lập.
4. **Truy xuất công khai:** có API tạo `qr_url` nhưng chưa thấy router public cho người không đăng nhập tra cứu lô theo mã. URL mặc định do `TRACE_BASE_URL` cấu hình (fallback `https://quicklog.agritrace.vn/qr`). Sinh/tải hình QR không chứng minh địa chỉ đích đã được triển khai.
5. **Upload ảnh báo lỗi:** API chỉ nhận `screenshot_url`, chưa có endpoint upload file riêng. Web chỉ nhận URL ảnh đã có, không đưa file cục bộ vào trường URL và không dùng API upload ảnh nhật ký thay thế.
6. **VN-2000:** API ranh giới chỉ nhận Polygon GeoJSON WGS84; chưa có endpoint chuyển hệ tọa độ. Service đang chặn lưu VN-2000 chưa chuyển đổi, tránh gửi sai tọa độ. Nhánh vẽ bản đồ WGS84 lưu bằng API bình thường.
7. **Email/SMS nhắc nhở:** schema có các giá trị `push/sms/email`, nhưng phần dispatch được kiểm tra chỉ đổi trạng thái và dựa trigger sinh notifications; chưa xác minh có dịch vụ gửi SMS/email thực tế. Không tự gọi dispatch nền; chỉ chạy khi người dùng bấm xác nhận.
8. **Diện tích:** schema cho phép m² hoặc ha, còn nhánh PostGIS tự tính khi bỏ `area` dùng m², trong khi web hiển thị ha. Cần thống nhất đơn vị/metadata backend trước khi tự đổi toàn bộ dữ liệu hiện có; lần này không sửa dữ liệu.
9. **Mã mùa vụ/mã nhân sự/mã tổ:** nhiều mã hiển thị đang suy ra từ ID hoặc vùng trồng/năm, không có trường mã riêng tương ứng trong API. Không gửi các trường suy ra làm dữ liệu sửa.

## Lưu nhiều bước

- Tạo nông trại/vùng trồng rồi cập nhật trạng thái là hai request. Web giữ ID vừa tạo để retry bước trạng thái không tạo trùng trong cùng phiên form; lỗi nêu rõ tài nguyên đã được tạo.
- Sửa nhiều sản lượng đóng góp và thông tin lô là nhiều request, không phải một transaction. Mỗi lần thành công cập nhật bản ghi đang hiển thị; lỗi còn lại hiện trong popup. Backend chưa có endpoint atomic cập nhật toàn bộ lô và các nguồn cùng lúc.
- Backend quyết định quyền và ràng buộc cuối cùng. Không nuốt lỗi HTTP thành danh sách rỗng hay thông báo thành công ở các service mới.

## Kiểm tra

- GET backend cục bộ `/health`: trả `status=ok`, xác nhận kết nối DB. GET `/openapi.json`: trả version `1.1.0`.
- `npm run owner:lint`, `npm run owner:build`: kiểm tra ESLint, TypeScript và Vite.
- `node --test test/owner_api_integration.test.cjs test/web_api_services.test.cjs`: kiểm tra HTTP giả lập, phân trang, payload, lỗi quyền, trạng thái đọc, QR, sản lượng đóng góp, lịch nhắc và tính ngày thu hoạch. Toàn bộ 97 transport được đối chiếu router bằng AST Python.
- Không gọi API tạo/sửa/xóa thật, không gửi báo lỗi/thông báo thật, không thay đổi DB để kiểm tra. Chưa thực hiện end-to-end với tài khoản đăng nhập hoặc kiểm tra giao diện trực tiếp trên trình duyệt; quyền và ràng buộc DB khi ghi cần kiểm tra tiếp trên dữ liệu thử được cho phép.
