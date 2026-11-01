# Rà soát Worker và Leader — 01/11/2026

Phạm vi: đọc code màn hình, nút điều hướng, hook/context dùng chung và đối chiếu schema/router backend ở chế độ chỉ đọc. Sửa frontend; không sửa backend/database, không tạo dữ liệu thật qua API. Đây là kiểm tra code và kiểm thử giả lập, chưa phải nghiệm thu thao tác trên điện thoại.

## Trường hợp người dùng xác nhận

Leader giao đúng Worker nhưng chọn ngày khác. API lấy việc của Worker là `GET /tasks`, backend tự giới hạn theo tài khoản đăng nhập; app không cần truyền số điện thoại người nhận khi lấy danh sách. Trang chủ trước đây chỉ lọc việc có khoảng ngày chứa hôm nay. Việc ngày khác có thể đã nhận nhưng không xuất hiện ở trang chủ. Đã bổ sung mục Công việc ngày khác, dẫn tới lịch đúng ngày và đúng task ID. Không đổi mọi việc thành việc hôm nay.

## Các nhóm màn hình đã đối chiếu

| Role | Màn hình/nhóm thao tác | Kết quả và phạm vi |
|---|---|---|
| Worker | Trang chủ; bắt đầu; gửi nhật ký hoàn thành; chi tiết | Hiện việc ngày khác; trạng thái bắt đầu theo API; xác định ngày theo UTC+07; chi tiết hiển thị tổ trưởng phụ trách, không khẳng định đó là người tạo việc. |
| Worker | Lịch; tuần trước/sau; chọn ngày; làm mới | Giữ việc tương lai ở ngày được giao; không báo “tổ trưởng chưa giao việc” khi chỉ đang chọn một ngày trống. Ngày lịch và timestamp API được xử lý riêng. |
| Worker | Ghi mới; report_note; camera_report | Đã kiểm tra route tới form dùng chung, validation, GPS, ảnh, lưu và hoàn thành công việc. Chặn gửi nhật ký cho vùng khác rồi hoàn thành task ban đầu. Chưa kiểm tra camera/GPS thực trên Android. |
| Worker | Nhật ký; tìm kiếm/thời gian/khu vực; chi tiết; ảnh/nhận xét | Không bỏ lịch sử chỉ vì mùa vụ đã kết thúc/không còn task. Gửi mới giữ danh sách và bộ lọc. Mở chi tiết tải lại dữ liệu; nhận xét/đánh giá không phụ thuộc vào việc đi từ thông báo. |
| Worker | Cá nhân; thông tin cá nhân; đổi mật khẩu; đăng xuất | Hồ sơ dùng auth/me, đổi mật khẩu/đăng xuất gọi auth API. auth/me chưa trả ngày tham gia. Không tự bổ sung backend. |
| Worker | Thông báo | Đã nối notification API: lọc type, phân trang, số chưa đọc và đánh dấu đọc một/tất cả; trạng thái đọc lưu ở backend. |
| Leader | Trang chủ; việc giao cho bản thân; bắt đầu/gửi nhật ký | Dùng ID trong phiên đăng nhập để nhận diện người nhận thay vì so số điện thoại. Bỏ khẳng định người tạo là Owner khi API không trả creator. |
| Leader | Danh sách giao việc; bộ lọc; tạo; sửa; hủy | Bổ sung khai báo route edit_assignment. Nhiều người nhận dùng allSettled: giữ thành công, báo rõ thất bại; bỏ người đã giao thành công khỏi lựa chọn để tránh giao lại khi thử lại. Sửa/hủy lỗi một phần vẫn tải lại trạng thái thật. |
| Leader | Nhật ký; lọc đánh giá; chi tiết; Đạt/Không đạt; nhận xét; ảnh | Không đánh rơi cache khi tải danh sách cùng phạm vi; cache chi tiết được làm mới sau 10 giây khi tải lại danh sách. Lọc đánh giá tải chi tiết cả tập ứng viên, tránh chỉ tải những dòng đang hiện rồi không tìm thấy Đạt/Không đạt. Chi tiết có cùng đánh giá/nhận xét như danh sách. |
| Leader | Thành viên; lọc/tìm; chi tiết thành viên | Đối chiếu users role=worker và users/{id}; API kiểm soát quyền trong tổ. Ngày tham gia thành viên lấy created_at nếu API trả. Chưa chạy thử bằng tài khoản thật. |
| Leader | Vùng trồng; Cá nhân; thông tin cá nhân | Vùng trồng lấy danh sách được phép từ API; hồ sơ cá nhân dùng component chung. Không sửa quyền backend. |
| Leader | Thông báo; cài đặt; báo lỗi | Thông báo và trạng thái đọc đã dùng API như Worker. Cài đặt badge chỉ áp dụng trong app. Báo lỗi đã nối POST/GET error-reports, phân trang và hiển thị phản hồi Admin; ảnh chỉ nhận URL. |
| Chung | Tab, quay lại, form phụ, auth/account routes | Test dùng hook điều hướng SDK58 thật từ expo-router và kiểm tra mọi file màn hình Worker/Leader được khai báo trong layout. Không dùng href:null để ẩn route có thể điều hướng. |

## Các lỗi dữ liệu đã sửa

- Tải công việc không còn phụ thuộc JSON trạng thái bắt đầu lưu trên máy; dữ liệu local không thể ghi đè pending của API thành đã bắt đầu.
- Hoàn thành muộn so với timestamp due_at, kể cả muộn trong cùng ngày, thay vì chỉ so ngày.
- Ngày công việc từ timestamp dùng giờ Việt Nam, không lệch giữa hai máy có múi giờ khác nhau.
- Các task cũ không có assignmentId được giữ độc lập; không gộp chỉ vì cùng nội dung và cùng phút tạo.
- Nhật ký mới không tự đổi bộ lọc khu vực thành season ID rồi xóa cả danh sách.
- Lỗi tải danh sách kết thúc trạng thái loading và giữ thông báo lỗi; không treo sẵn sàng vô hạn.

## Còn thiếu hoặc cần xác minh riêng

1. **Thông báo:** đã nối API `/notifications`, lọc theo type, phân trang, `/notifications/unread-count`, PATCH đọc một và đọc tất cả. UI và chuông dùng cùng context, trạng thái đọc lưu backend. Không còn dựng thông báo từ task/log hoặc lưu đã đọc local. Tải lại theo focus/polling; chưa có push realtime. DTO chưa có task_id/log_id/report_id nên nút xem liên quan mở danh sách, không đoán bản ghi bằng nội dung. Backend hiện không tạo thông báo cho Leader khi Worker tạo nhật ký mới; app chỉ hiện các thông báo thực sự có trong API.
2. **Báo lỗi:** đã nối màn hình mobile với `/error-reports` để gửi và tải báo cáo của tài khoản, xem trạng thái và phản hồi Admin. API hiện nhận screenshot_url, không nhận trực tiếp file ảnh local; giao diện nhận URL http/https và không gửi file:// URI. Cần bổ sung luồng upload nếu muốn đính kèm ảnh từ điện thoại.
3. **Nhật ký ↔ task:** schema FarmingLogCreate/FarmingLogSummary không có task_id. App gửi log và cập nhật completed bằng hai request độc lập. Không thể bảo đảm liên kết chính xác một đánh giá Không đạt với task sau khi tải lại chỉ bằng API hiện tại. Không ghép bằng tiêu đề vì có thể trùng. Nhật ký vẫn xem được đánh giá và lịch sử, nhưng “Công việc cần làm lại” theo task chưa thể xem là đầy đủ.
4. **Ngày tham gia của chính Worker/Leader:** auth/me không trả created_at; quyền Worker không cho đọc users/{id}. Không lấy ngày đăng nhập thay thế ngày tham gia.
5. **Giao nhiều người:** API tạo từng task, không có giao dịch chung hoặc khóa idempotency. App đã xử lý thành công một phần rõ ràng; mất kết nối sau khi server đã lưu nhưng trước khi trả response vẫn cần kiểm tra danh sách trước khi giao lại. Không có frontend-only bảo đảm exactly-once cho trường hợp đó.
6. **Kiểm tra thực tế:** chưa có thiết bị ADB hoặc Metro đang chạy trong môi trường ở thời điểm rà. Chưa khẳng định đã bấm từng nút trên máy thật, chưa kiểm tra ảnh/GPS/quyền hệ điều hành, chưa chạy POST/PATCH/DELETE thật vì giới hạn không ghi DB khi kiểm tra.

## Kiểm thử

- `node --test test/mobile_workflow.test.cjs test/mobile_tab_routes.test.cjs`: kiểm tra routes, việc tương lai, trạng thái server, deadline, múi giờ, giao nhiều người lỗi một phần và giữ/tải lại nhật ký.
- `npm run mobile:typecheck`: đạt.
- `npm run mobile:lint`: đạt, không có lỗi/cảnh báo.
- Không dùng Vite/Owner build để kết luận mobile đã hoạt động trên thiết bị.

Kết quả cuối: 12 test mobile đạt; chạy toàn bộ `node --test test/*.test.cjs` có 23/23 test đạt. Kiểm thử giả lập không tạo công việc, nhật ký hay báo lỗi thật.

Cập nhật nối thông báo Worker/Leader: bổ sung test phân trang/type, read/count, lỗi PATCH, chuyển tài khoản, phản hồi cũ và chặn bấm lặp trong `test/mobile_notifications.test.cjs`.
