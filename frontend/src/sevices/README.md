# API services cho app Worker / Leader

Các module dưới đây chỉ khai báo kiểu dữ liệu và hàm gọi API. Import module không
tự gửi request. Các API mới chưa tích hợp vào màn hình hoặc context.
Các hàm tổng hợp sự kiện sẵn có trong `notification-events.ts` tiếp tục phục vụ
luồng thông báo hiện tại; các hàm API được bổ sung ngay trong file này.
Giữ tên thư mục `sevices` theo cấu trúc hiện có của app.

| File | API | Phạm vi app |
| --- | --- | --- |
| `farming-log.service.ts` | Các API nhật ký, ảnh, công việc, lô đất, mùa vụ, cây trồng và nhân sự sẵn có | Giữ đường dẫn import và các hàm public hiện có |
| `auth.sevice.ts` | Các API xác thực sẵn có | Giữ riêng luồng đăng nhập, đổi mật khẩu và khôi phục mật khẩu |
| `api-client.ts` | Dùng `API_BASE_URL`, Bearer token, timeout 15 giây, query và JSON | Xử lý lỗi HTTP/mạng; hỗ trợ phản hồi rỗng 204 |
| `error-report.service.ts` | Danh sách, chi tiết, tạo, xóa `/error-reports` | Worker/Leader xem báo cáo của mình; chỉ xóa khi trạng thái `new` |
| `reminder.service.ts` | Danh sách, chi tiết `/reminders`, tạo, cập nhật, cập nhật trạng thái | Worker/Leader xem và cập nhật trạng thái; Leader được tạo/sửa nội dung |
| `notification-events.ts` | Danh sách, chi tiết, số chưa đọc, đánh dấu đọc một/tất cả, xóa `/notifications` | Thông báo của tài khoản đang đăng nhập |

Quyền truy cập do backend kiểm tra. Những hàm dành riêng Admin/Owner (phản hồi
báo cáo lỗi, phát hành/xóa nhắc nhở và `/system-logs`) không được bổ sung vào app.

`screenshot_url` của báo cáo lỗi là URL ảnh đã có trên máy chủ; không truyền URI
ảnh cục bộ của điện thoại. Backend hiện chưa cung cấp endpoint upload ảnh riêng
cho báo cáo sự cố. Không dùng endpoint ảnh nhật ký thay cho ảnh báo cáo lỗi.

Hàm danh sách thông báo/báo cáo trả về một trang theo `limit`/`offset` của backend,
không tự tải tất cả các trang. Bộ lọc giữ nguyên tên trường trong API. Ngày nhắc
nhở và bộ lọc ngày dùng `YYYY-MM-DD`; thời điểm trả về giữ nguyên chuỗi từ BE.

Khi tích hợp sau này, truyền access token từ auth context vào hàm service và xử
lý `ApiError.status` khi cần phân biệt 401/403 với lỗi kết nối. Không tự
suy diễn lỗi kết nối thành danh sách rỗng hoặc trạng thái thành công.

Kiểm tra bằng HTTP giả lập, không truy cập hoặc ghi DB thật:

```powershell
cd D:\AgriTrace_Platform_Group_2\frontend
node --test review/app-api-services.test.cjs
```
