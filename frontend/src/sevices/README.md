# API services cho web và app

## Web Owner / Admin

`webApi_wb.ts` khai báo đầy đủ **97 thao tác thuộc 17 nhóm** trong OpenAPI backend
hiện tại. Đây là lớp gọi HTTP có kiểu dữ liệu, không phải dữ liệu giả. Import
không tự gửi request; chỉ gọi hàm khi màn hình cần dữ liệu hoặc người dùng thao tác.

- `webApi_wb.ts`: hàm gọi API theo nhóm, dùng chung `httpClient_wb.ts` cho base URL,
  Bearer token, cache, hủy request và lỗi HTTP.
- `backend_api_types_wb.ts`: kiểu request/response của backend. Giữ nguyên tên trường
  API, ngày `YYYY-MM-DD`, timestamp và UUID ở dạng chuỗi.
- [WEB_API_CATALOG.md](WEB_API_CATALOG.md): danh mục đầy đủ tên hàm, HTTP method,
  endpoint và yêu cầu đăng nhập.
- Các service nghiệp vụ hiện có như `farmService_wb.ts`, `seasonService_wb.ts`,
  `taskService_wb.ts` vẫn giữ nguyên giao diện public và phần chuyển đổi dữ liệu cho
  các trang hiện có. `notificationService_wb.ts` đã nối danh sách, số chưa đọc,
  đánh dấu đọc và xóa thông báo thật; `supportService_wb.ts` nối báo lỗi hệ thống,
  `reminderService_wb.ts` nối lịch nhắc mùa vụ. Chi tiết màn hình, giới hạn backend
  và kết quả kiểm tra nằm trong [OWNER_API_INTEGRATION.md](../../OWNER_API_INTEGRATION.md).

Ví dụ dùng trong một service hoặc màn hình web:

```ts
import { webApi } from "./webApi_wb";

const reports = await webApi.errorReports.listErrorReports({
  query: { org_id: farmId, status: "new", limit: 50, offset: 0 },
});
const unread = await webApi.notifications.getUnreadNotificationCount();
const tasks = await webApi.tasks.listTasks({
  query: { org_id: farmId, include_cancelled: true },
});
```

Các tham số được tách thành `path`, `query`, `body`. Các hàm còn nhận `signal` và
`cacheTtl`; giá trị query `false` và `0` được giữ nguyên, `null`/`undefined` được bỏ
qua, ID trên đường dẫn được URL-encode. Upload ảnh nhật ký nhận `body.files: Blob[]`
và tự tạo `FormData`. Lỗi được truyền lên màn hình để xử lý, không đổi thành dữ liệu
rỗng. API trả 204 có kiểu `void`.

Quyền luôn do backend kiểm tra. `/system-logs`, tạo Owner, sửa vai trò và các thao
tác quản trị không tự trở thành quyền của Owner chỉ vì đã có hàm web. Đăng nhập qua
`webApi.auth.login` trả token; luồng đăng nhập hiện có trong `accountService_wb.ts`
vẫn chịu trách nhiệm lưu/xóa token. Danh sách phân trang chỉ trả trang được yêu cầu.

Khi backend thêm hoặc sửa API, chạy từ `frontend/`:

```powershell
python scripts/generate_web_api.py --schema http://127.0.0.1:8000/openapi.json
node --test test/web_api_services.test.cjs
npm run owner:lint
npm run owner:build
```

Generator cũng nhận đường dẫn đến file OpenAPI JSON đã xuất, chỉ đọc schema và ghi
ba file sinh tự động. Không chỉnh tay các file sinh tự động; không gọi API ghi dữ
liệu hoặc import backend để sinh mã. Các kiểm tra HTTP giả lập không truy cập DB.

## App Worker / Leader

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
