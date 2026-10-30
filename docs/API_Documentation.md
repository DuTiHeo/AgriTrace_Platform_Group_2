# API Documentation - Phan he San Xuat So & Farmer QuickLog

> Khi backend dang chay, xem chi tiet request/response mau tai Swagger UI: http://localhost:8000/docs
> File nay chi de tom tat + ghi chu trang thai cho ca nhom / mentor de theo doi.

## Base URL
- Local (docker-compose): http://localhost:8000

## Danh sach endpoint (cap nhat dan theo tien do)
Đợt 0: Module Auth
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|Default| GET | /health | Kiem tra Backend + Database da ket noi | Da xong |
|UC-SH01| POST | /auth/login | Đăng nhập và phân quyền | Đã xong |
|UC-SH01| POST | /auth/logout | Đăng xuất và thêm token vào token_blacklist | Đã xong |
|UC-SH01| POST | limiter thiết lập 5/minutes | Bất kể ai nhập đăng nhập quá 5 lần/1p -> Tạm khóa | Đã xong |
|UC-SH02| POST | /auth/change-password |Đổi mật khẩu khi đăng nhập thành công | Đã xong |
|UC-SH02| POST | /auth/forgot-password + OTP |Đổi mật khẩu khi quên mật khẩu| Chưa làm (để đợt 3) |
|Null| GET | /auth/me | Lấy thông tin của người dùng hiện tại | Đã xong |

Đợt 1: Module User
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /users | Danh sách + tìm kiếm, scope theo role (Admin: all, Owner: theo org_id, Leader: theo team_id) | Đã xong|
|UC-SH04.1| GET | /users/{user_id} | Owner, Leader, Admin Xem chi tiết 1 user (phải cùng org/team, hoặc chính mình) | Đã xong |
|UC-A01.1| POST | /users/owners | Admin	Tạo tài khoản Owner, org_id = NULL, role cố định owner | Đã xong |
|UC-O05.1| POST | /users | Owner Tạo nhân sự mới, role mặc định worker, org_id tự lấy từ token | Đã xong |
|UC-O05.2| PATCH | /users/{user_id} | Owner, Admin	Sửa thông tin cốt lõi (không đụng role/status/team) | Đã xong |
|UC-O05.3 + UC-A01.3 + UC-O06.3| PATCH | /users/{user_id}/role | Owner, Admin Đổi vai trò — kèm transaction gán/gỡ team_leader_id bên teams nếu liên quan đến leader | Đã xong |
|UC-O05.4 + UC-A01.2| PATCH | /users/{user_id}/status | Owner, Admin Khóa/mở khóa |Đã xong |

Đợt 1: Module CropCatalog (gộp CropCareMilestones — theo bảng kế hoạch các đợt, milestones là bảng con nên gộp chung file thay vì tách riêng)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /crops | Danh sách + tìm kiếm giống cây. KHÔNG scope theo org_id — dữ liệu danh mục dùng chung toàn hệ thống, cả 4 role (owner/leader/worker/admin) đều xem được | Đã xong |
|UC-SH04.1| GET | /crops/{crop_id} | Xem chi tiết 1 giống, kèm danh sách mốc chăm sóc (milestones) | Đã xong |
|UC-A02.1| POST | /crops | Admin thêm giống cây mới vào danh mục | Đã xong |
|UC-A02.1| PATCH | /crops/{crop_id} | Admin sửa thông tin giống | Đã xong |
|UC-A02.1| DELETE | /crops/{crop_id} | Admin xóa giống — bảng chưa có cột status nên xóa cứng; nếu giống đang được season nào dùng, FK chặn lại và trả 400 thân thiện | Đã xong |
|UC-A02.1| POST | /crops/{crop_id}/milestones | Admin thêm mốc chăm sóc cho giống — UC-O03.3 (module Season) sẽ đọc dữ liệu này để tự sinh reminder_schedules | Đã xong |
|UC-A02.1| PATCH | /crops/{crop_id}/milestones/{milestone_id} | Admin sửa mốc chăm sóc | Đã xong |
|UC-A02.1| DELETE | /crops/{crop_id}/milestones/{milestone_id} | Admin xóa mốc chăm sóc | Đã xong |

Đợt 1: Module Organization
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-O01.1| GET | /organizations/mine | Owner xem danh sách nông trại mình sở hữu (dùng để chọn org trước khi gọi các API khác) | Đã xong |
|UC-SH04.1| GET | /organizations | Danh sách + tìm kiếm, scope theo role (Admin: all/lọc theo owner_id, Owner: chỉ farm mình sở hữu, Leader/Worker: farm trực thuộc) | Đã xong |
|UC-SH04.1| GET | /organizations/{org_id} | Xem chi tiết 1 nông trại, kèm ranh giới GeoJSON và thống kê nhanh (số plot, số team, số mùa vụ đang hoạt động) | Đã xong |
|UC-O01.1| POST | /organizations | Owner tự tạo nông trại (owner_id lấy từ token); hoặc Admin tạo hộ, tự chỉ định owner_id. Status tự động incomplete nếu chưa có ranh giới | Đã xong |
|UC-O01.2 + UC-O01.3 + UC-O01.4/.5| PATCH | /organizations/{org_id} | Sửa tên/địa chỉ, đổi trạng thái (active/suspended/incomplete), hoặc cập nhật ranh giới Polygon. Nếu bổ sung ranh giới khi đang incomplete, tự chuyển sang active | Đã xong |
|UC-O01.3| DELETE | /organizations/{org_id}?soft=true\|false | Xóa nông trại. Mặc định xóa mềm (chuyển status=suspended); soft=false xóa cứng — trả 400 nếu đã phát sinh dữ liệu liên quan (harvest_batches, error_reports) thay vì lỗi 500 | Đã xong |

Đợt 1: Module Plot (Vùng trồng / Lô đất)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /plots | Danh sách + tìm kiếm, scope theo role (tương tự Organization), lọc thêm theo org_id/status/keyword | Đã xong |
|UC-W03.4 + BR-14| GET | /plots/locate | Tự động suy luận Lô đất và Mùa vụ từ tọa độ GPS (PostGIS ST_Contains). Khóa chọn thủ công (BR-14, UC-W03.4, EX-15). Bắt buộc đứng trước GET /{plot_id} để tránh xung đột UUID | Đã xong |
|UC-SH04.1| GET | /plots/{plot_id} | Xem chi tiết lô đất kèm ranh giới GeoJSON và mùa vụ đang canh tác hiện tại (nếu có) | Đã xong |
|UC-O02.1| POST | /plots | Tạo lô đất mới thuộc 1 nông trại. Tự tính diện tích từ ranh giới nếu không nhập tay; chặn nếu ranh giới lô vượt ra ngoài ranh giới nông trại cha (ST_Contains) | Đã xong |
|UC-O02.2| PATCH | /plots/{plot_id} | Sửa mã lô, diện tích, trạng thái hoặc ranh giới. Chặn sửa ranh giới nếu lô đang có mùa vụ hoạt động (growing/ready_to_harvest); ranh giới mới vẫn phải nằm trong nông trại cha | Đã xong |
|UC-O02.3| DELETE | /plots/{plot_id}?soft=true\|false | Xóa lô đất. Mặc định xóa mềm (status=inactive); luôn chặn nếu đang có mùa vụ hoạt động; soft=false trả 400 nếu lô đã có lịch sử mùa vụ/nhiệm vụ | Đã xong |

Ghi chú nghiệp vụ và Request/Response chính cho Plot (Định vị tự động GPS - BR-14, UC-W03.4, EX-15):

1. **Nguyên tắc định vị không gian & Khóa chọn thủ công (`BR-14`, `UC-W03.4`)**:
   - Sử dụng hàm không gian PostGIS `ST_Contains(boundary_geojson, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326))` để xác định Lô đất chứa tọa độ GPS. Lưu ý thứ tự trục PostGIS: kinh độ `longitude` (trục X), vĩ độ `latitude` (trục Y).
   - Truy vấn đồng thời mùa vụ đang hoạt động (`status IN ('growing', 'ready_to_harvest')`) và tên giống cây trồng tương ứng.
   - **Phân quyền & Cô lập dữ liệu**:
     - `worker`, `leader`: Tự động trích xuất `org_id` từ token người dùng (`current_user["org_id"]`), tuyệt đối không được truy vấn lô đất của nông trại khác.
     - `owner`: Lấy `org_id` từ query parameter (thẩm định quyền sở hữu qua `ensure_owns_org`) hoặc mặc định lấy nông trại active đầu tiên của mình.
     - `admin`: Bắt buộc truyền query parameter `org_id`.
   - **Bất biến định tuyến FastAPI**: Route `GET /plots/locate` **BẮT BUỘC ĐỨNG TRƯỚC** `GET /plots/{plot_id}` để tránh xung đột định tuyến UUID (FastAPI parse nhầm `"locate"` thành UUID parameter gây lỗi `422 Unprocessable Entity`).

2. **Query Parameters**:
   - `latitude`: float (bắt buộc, `-90.0` đến `90.0`) - Vĩ độ GPS của thiết bị.
   - `longitude`: float (bắt buộc, `-180.0` đến `180.0`) - Kinh độ GPS của thiết bị.
   - `org_id`: UUID (tùy chọn với Owner, bắt buộc với Admin, tự động lấy từ token với Worker/Leader).

3. **Ví dụ Request / Response**:

```http
GET /plots/locate?latitude=21.000217&longitude=105.843090
Authorization: Bearer <token_worker_hoac_leader>
```

- **Response thành công (200 OK - `PlotLocateResponse`)**:
```json
{
  "plot_id": "40000000-0000-0000-0000-000000000001",
  "org_id": "20000000-0000-0000-0000-000000000001",
  "code": "DL-01",
  "area": 5000.0,
  "status": "active",
  "current_season_id": "70000000-0000-0000-0000-000000000001",
  "current_crop_name": "Xà lách Lollo Rossa"
}
```

- **Response lỗi ngoại lệ GPS ngoài lô đất (404 Not Found - `EX-15`)**:
```json
{
  "detail": "Không thể xác định vị trí làm việc. Vị trí GPS của bạn không nằm trong bất kỳ lô đất nào thuộc nông trại"
}
```

- **Các mã lỗi khác**:
  - `400 Bad Request`: Người dùng chưa thuộc nông trại nào / Admin thiếu tham số `org_id`.
  - `401 Unauthorized`: Chưa đăng nhập hoặc Access Token không hợp lệ / hết hạn (`EX-05`).
  - `403 Forbidden`: Người dùng không có quyền truy cập nông trại chỉ định (`EX-06`).
  - `422 Unprocessable Entity`: Thiếu hoặc sai định dạng tham số tọa độ (ví dụ vĩ độ ngoài khoảng `[-90, 90]`).

Đợt 1: Module Team (Tổ công nhân)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /teams | Danh sách + tìm kiếm tổ, scope theo role (Admin/Owner theo org, Leader/Worker theo farm trực thuộc) | Đã xong |
|UC-SH04.1| GET | /teams/{team_id} | Xem chi tiết tổ kèm danh sách thành viên | Đã xong |
|UC-O06.1| POST | /teams | Tạo tổ mới; có thể gán luôn Tổ trưởng (kiểm tra người này chưa làm Tổ trưởng của tổ khác) | Đã xong |
|UC-O06.2 + UC-O06.3| PATCH | /teams/{team_id} | Đổi tên tổ hoặc đổi Tổ trưởng. Tổ trưởng cũ (nếu bị thay) tự động hạ role về worker | Đã xong |
|-| DELETE | /teams/{team_id} | Xóa tổ (hard delete, bảng teams không có cột status). Chặn nếu đang có nhiệm vụ in_progress hoặc incomplete; trả 400 nếu tổ đã có lịch sử task/mùa vụ hỗ trợ | Đã xong |
|UC-O06.2| POST | /teams/{team_id}/members | Thêm danh sách công nhân vào tổ | Đã xong |
|UC-O06.2| DELETE | /teams/{team_id}/members/{user_id} | Gỡ 1 công nhân khỏi tổ. Nếu người đó đang là Tổ trưởng của tổ này, tự động gỡ team_leader_id và hạ role về worker | Đã xong |

Đợt 1: Module Season (Mùa vụ canh tác)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /seasons | Danh sách + tìm kiếm mùa vụ, lọc theo org/plot/crop/status/team, scope theo role | Đã xong |
|UC-SH04.1 + UC-O03.5| GET | /seasons/{season_id} | Xem chi tiết mùa vụ kèm lịch nhắc nhở tự sinh (reminder_schedules) và danh sách tổ đang hỗ trợ | Đã xong |
|UC-O03.1 + UC-O03.2 + UC-O03.3| POST | /seasons | Khởi tạo mùa vụ. Tự tính ngày thu hoạch dự kiến nếu không nhập; tự sinh reminder_schedules theo mốc chăm sóc chuẩn của giống cây (crop_care_milestones); chặn nếu lô đã có mùa vụ khác đang hoạt động | Đã xong |
|UC-O03.4| PATCH | /seasons/{season_id} | Cập nhật ngày thu hoạch thực tế / trạng thái mùa vụ | Đã xong |
|-| DELETE | /seasons/{season_id} | Xóa mùa vụ. Chặn nếu đã có nhật ký canh tác hoặc đã được gom vào lô thu hoạch | Đã xong |
|-| POST | /seasons/{season_id}/teams | Gán thêm tổ hỗ trợ mùa vụ | Đã xong |
|-| DELETE | /seasons/{season_id}/teams/{team_id} | Hủy gán tổ khỏi mùa vụ | Đã xong |

Đợt 2: Module FarmingLog + LogPhoto
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-W03.1 -> UC-W03.6 + UC-W02.1| GET | /farming-logs | Danh sách nhật ký canh tác, scope theo role. Worker/Leader xem log cả tổ mình; Owner xem theo org mình sở hữu; Admin xem toàn bộ hoặc lọc org_id. Hỗ trợ lọc season_id, chưa phân trang | Đã xong |
|UC-W03.1 -> UC-W03.6 + UC-T01.1 + UC-O03.5| GET | /farming-logs/{log_id} | Xem chi tiết 1 nhật ký, trả kèm sẵn photos[] và notes[] để FE không cần gọi API ảnh/ghi chú riêng | Đã xong |
|UC-W03.1 -> UC-W03.6 + BR-14 + EX-15| POST | /farming-logs | Worker/Leader tạo nhật ký canh tác bằng JSON thuần. Bắt buộc activity_type và gps; content optional; activity_type là free text, không enum. Chỉ cho tạo khi season cùng org và status là growing/ready_to_harvest; Tái thẩm định 2 lớp (Double Validation) bằng PostGIS ST_Contains kiểm tra GPS nằm trọn trong ranh giới lô đất của mùa vụ (BR-14, EX-15) | Đã xong |
|UC-W03.1 -> UC-W03.6| POST | /farming-logs/{log_id}/photos | Tác giả log upload ảnh theo flow bước 2, multipart/form-data key files. Tối đa 5 ảnh/log, 5MB/ảnh, chỉ .jpg/.jpeg, không convert HEIC ở backend | Đã xong |

Ghi chú nghiệp vụ và Request/Response chính cho FarmingLog:

1. **Cơ chế Thẩm định Không gian 2 lớp (Double Validation - `BR-14`, `EX-15`)**:
   - Khi client gửi yêu cầu tạo nhật ký, Backend không chỉ tin tưởng client mà bắt buộc thực hiện kiểm tra an toàn tại máy chủ:
     `crud_farming_log.is_gps_in_season_plot(db, season_id, latitude, longitude)`.
   - Backend sử dụng hàm PostGIS `ST_Contains(p.boundary_geojson, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326))` để đối soát tọa độ GPS với lô đất liên kết trực tiếp với mùa vụ (`season_id`).
   - Nếu tọa độ GPS nằm ngoài lô đất (hoặc nếu client cố tình can thiệp sửa đổi tọa độ GPS), Backend lập tức chặn và trả về `400 Bad Request` chuẩn kịch bản `EX-15`.
   - Lưu ý thứ tự trục PostGIS: `X = longitude` (kinh độ ~ 105.x), `Y = latitude` (vĩ độ ~ 20.x/21.x), SRID 4326.

2. **Ví dụ Request / Response**:

```http
POST /farming-logs
Authorization: Bearer <token_worker_hoac_leader>
Content-Type: application/json
```

```json
{
  "season_id": "70000000-0000-0000-0000-000000000001",
  "activity_type": "Chăm sóc định kỳ",
  "content": "Kiểm tra sâu bệnh và tỉa lá gốc tại luống A",
  "gps": {
    "latitude": 21.000217,
    "longitude": 105.843090
  }
}
```

- **Response thành công (201 Created - `FarmingLogDetail`)**:
```json
{
  "log_id": "a0000000-0000-0000-0000-000000000099",
  "season_id": "70000000-0000-0000-0000-000000000001",
  "user_id": "10000000-0000-0000-0000-000000000003",
  "team_id": "50000000-0000-0000-0000-000000000001",
  "activity_type": "Chăm sóc định kỳ",
  "content": "Kiểm tra sâu bệnh và tỉa lá gốc tại luống A",
  "gps": {
    "latitude": 21.000217,
    "longitude": 105.843090
  },
  "created_at": "2026-10-21T12:00:00+07:00",
  "photos": [],
  "notes": []
}
```

- **Response lỗi tọa độ GPS ngoài lô đất canh tác (400 Bad Request - `EX-15`)**:
```json
{
  "detail": "Không thể xác định vị trí làm việc. Vị trí GPS của bạn không nằm trong bất kỳ lô đất nào thuộc nông trại"
}
```

- **Các mã phản hồi lỗi khác**:
  - `400 Bad Request`: "Mua vu da hoan tat, khong the ghi them nhat ky" (khi trạng thái mùa vụ không phải `growing` hoặc `ready_to_harvest` theo `BR-16`).
  - `401 Unauthorized`: Chưa đăng nhập hoặc Access Token không hợp lệ / hết hạn (`EX-05`).
  - `403 Forbidden`: Người dùng không thuộc nông trại chứa mùa vụ này hoặc vai trò không phải worker/leader (`EX-06`).
  - `404 Not Found`: "Khong tim thay mua vu".
  - `422 Unprocessable Entity`: Sai định dạng dữ liệu (thiếu `season_id`, thiếu `activity_type`, thiếu object `gps` hoặc tọa độ ngoài dải giá trị).

Upload ảnh bằng Postman:

```text
POST /farming-logs/{log_id}/photos
Authorization: Bearer <token>
Body: form-data
KEY: files
TYPE: File
VALUE: anh.jpg
```

Nếu upload nhiều ảnh trong cùng request, thêm nhiều row cùng key `files`.
Response trả về `url` dạng `/uploads/farming-logs/{log_id}/{file}.jpg`.
Xem ảnh bằng URL đầy đủ: `http://localhost:8000` + `url`.

Ví dụ:

```text
http://localhost:8000/uploads/farming-logs/{log_id}/{file}.jpg
```

Đợt 2: Module LogNote
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-T01.2| POST | /log-notes | Leader/Owner viết ghi chú nhắc nhở dưới farming log. Leader chỉ note log của worker/leader trong team mình; Owner chỉ note log thuộc org mình sở hữu. Worker/Admin không viết note | Đã xong |
|UC-T01.2 + UC-T02.2| PATCH | /log-notes/{note_id} | Leader/Owner đúng phạm vi toggle field resolved true/false. Chỉ đổi resolved, không sửa content. Không yêu cầu phải có log mới sau note | Đã xong |

Ghi chú request/response chính cho LogNote:

```json
POST /log-notes
{
  "log_id": "a0000000-0000-0000-0000-000000000001",
  "content": "Can chup can canh mat duoi la trong lan kiem tra tiep theo."
}
```

```json
PATCH /log-notes/{note_id}
{
  "resolved": true
}
```

Schema DB bổ sung ở đợt 2:

```sql
ALTER TABLE log_notes
    ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT FALSE;
```

Cơ chế thông báo tự động (Event Trigger - Đợt 3): Khi Leader/Owner tạo ghi chú mới (`POST /log-notes`), hệ thống tự động sinh thông báo `type = 'log_note'` gửi đến tác giả nhật ký canh tác (nếu khác người viết ghi chú).
Đợt 2: Module Tasks (Nhiệm vụ công việc)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /tasks | Danh sách + tìm kiếm nhiệm vụ, lọc theo org_id/team_id/worker_id/plot_id/status (pending, in_progress, completed, cancelled, incomplete)/keyword/include_cancelled. Tự động tính toán trạng thái theo thời gian thực: task có status IN ('pending', 'in_progress') mà due_at < CURRENT_TIMESTAMP sẽ được trả về với status='incomplete'. Khi lọc status=incomplete sẽ lấy cả task incomplete và task pending/in_progress quá hạn; khi lọc status=pending chỉ lấy task pending chưa quá hạn (due_at >= CURRENT_TIMESTAMP); khi lọc status=in_progress chỉ lấy task in_progress chưa quá hạn (due_at >= CURRENT_TIMESTAMP). Scope theo role (Admin: all, Owner: theo org, Leader: chỉ xem tổ mình, Worker: chỉ xem việc của mình) | Đã xong |
|UC-SH04.1| GET | /tasks/{task_id} | Xem chi tiết nhiệm vụ kèm thông tin mở rộng của team, công nhân phụ trách, mã lô và nông trại. Trạng thái status được tự động tính toán động (tự chuyển thành 'incomplete' nếu status IN ('pending', 'in_progress') và due_at < CURRENT_TIMESTAMP) | Đã xong |
|UC-T01.3 + UC-O06.1| POST | /tasks | Admin/Owner/Leader tạo nhiệm vụ mới. Leader chỉ được giao việc cho tổ của mình. Ràng buộc: worker và plot phải thuộc cùng nông trại của team, worker phải active và thuộc đúng tổ phụ trách, due_at > start_at. Mặc định khởi tạo status='pending' ("Đã nhận") | Đã xong |
|UC-T01.3| PUT / PATCH | /tasks/{task_id} | Admin/Owner/Leader cập nhật thông tin nhiệm vụ (hỗ trợ cập nhật status sang pending, in_progress, completed, incomplete, cancelled). Leader không được chuyển nhiệm vụ sang tổ khác. Tự động kiểm tra ràng buộc due_at > start_at. Logic tự động chuyển trạng thái: nếu cập nhật status='pending' hoặc 'in_progress' mà due_at < now thì tự động chuyển thành 'incomplete' | Đã xong |
|UC-W01.1 + UC-T01.3| PATCH | /tasks/{task_id}/status | Cập nhật nhanh trạng thái nhiệm vụ (hỗ trợ 5 giá trị enum TaskStatus: pending, in_progress, completed, incomplete, cancelled). Worker chỉ được cập nhật việc của mình (bấm Bắt đầu sang in_progress, hoàn thành sang completed, hoặc incomplete) và KHÔNG có quyền hủy (cancelled); Leader/Owner/Admin có quyền cập nhật trong phạm vi quản lý. Logic tự động: nếu cập nhật status='pending' hoặc 'in_progress' mà task đã quá hạn (due_at < now) thì hệ thống tự động ghi nhận là 'incomplete' | Đã xong |
|UC-T01.3 + UC-O06.1| DELETE | /tasks/{task_id} | Hủy/Xóa mềm nhiệm vụ (chuyển status='cancelled' ("Đã hủy")). Phân quyền: Chỉ Admin, Owner (thuộc nông trại sở hữu) và Leader (phụ trách tổ được giao việc) mới có quyền thực hiện. Worker tuyệt đối không có quyền hủy nhiệm vụ (bị chặn 403 Forbidden: "Công nhân không có quyền hủy nhiệm vụ"). Trả về thông tin nhiệm vụ với status='cancelled'. Nhiệm vụ sẽ ẩn khỏi danh sách mặc định của GET /tasks (trừ khi truyền include_cancelled=true) | Đã xong |

Ghi chú nghiệp vụ, Enum và Request/Response chính cho Tasks:

1. **Enum `TaskStatus` và Vòng đời 5 trạng thái**:
   - `pending`: "Đã nhận" / Chờ làm (trạng thái khởi tạo mặc định khi mới giao việc, chưa bấm bắt đầu, `due_at >= now`).
   - `in_progress`: "Đang làm" / Đang thực hiện (công nhân đã bấm "Bắt đầu", `due_at >= now`).
   - `completed`: "Đã hoàn thành" (công việc đã được hoàn tất).
   - `incomplete`: "Chưa hoàn thành" / Quá hạn chưa xong (hệ thống tự động gán khi `due_at < now` dù đang ở `pending` hay `in_progress`, hoặc được cập nhật trực tiếp).
   - `cancelled`: "Đã hủy" (nhiệm vụ bị hủy / xóa mềm bởi Leader, Owner hoặc Admin).

2. **Quy tắc chuyển đổi trạng thái (State Machine) & Logic tự động khi `due_at < now`**:
   - **Phân quyền chuyển trạng thái (`BR-09`)**:
     - `worker`: Chỉ được cập nhật nhiệm vụ của chính mình (`tasks.worker_id == current_user["user_id"]`), được phép chuyển sang `in_progress` (khi bấm Bắt đầu), `completed` (khi hoàn thành), `incomplete`. Tuyệt đối **CẤM** chuyển sang `cancelled` (`403 Forbidden: "Công nhân không có quyền hủy nhiệm vụ"`).
     - `leader`: Chỉ cập nhật hoặc hủy nhiệm vụ trong tổ của mình (`tasks.team_id == current_user["team_id"]`).
     - `owner`: Chỉ cập nhật hoặc hủy nhiệm vụ thuộc nông trại mình sở hữu (`ensure_owns_org`).
     - `admin`: Có quyền cập nhật hoặc hủy toàn hệ thống.
   - **Phân quyền xóa mềm (`DELETE /tasks/{task_id}`)**:
     - `leader`: Chỉ có quyền hủy nhiệm vụ của tổ mình phụ trách (`tasks.team_id == current_user["team_id"]`). Nếu hủy task thuộc tổ khác $\rightarrow$ `403 Forbidden: "Bạn chỉ có thể hủy nhiệm vụ thuộc tổ của mình"`.
     - `owner`: Chỉ có quyền hủy nhiệm vụ thuộc nông trại mình sở hữu (`ensure_owns_org`).
     - `admin`: Có quyền hủy nhiệm vụ trên toàn hệ thống.
     - `worker`: Tuyệt đối **KHÔNG** có quyền hủy nhiệm vụ $\rightarrow$ `403 Forbidden: "Công nhân không có quyền hủy nhiệm vụ"`.
   - **Hàm tính toán trạng thái (`_compute_target_status`)**:
     - Nếu payload `status == "completed"` $\rightarrow$ Lưu `completed`.
     - Nếu payload `status == "cancelled"` $\rightarrow$ Lưu `cancelled`.
     - Nếu payload `status == "incomplete"` $\rightarrow$ Lưu `incomplete`.
     - Nếu payload `status IN ("pending", "in_progress")`: Kiểm tra `due_at < now` (UTC). Nếu đã quá hạn $\rightarrow$ Tự động chuyển thành `incomplete`; nếu chưa quá hạn $\rightarrow$ Ghi nhận `pending` hoặc `in_progress`.
   - **Truy vấn & Lọc dữ liệu thời gian thực (`crud_tasks`)**:
     - Cột `status` trong `GET /tasks` và `GET /tasks/{task_id}` luôn được chuẩn hóa qua biểu thức SQL:
       `CASE WHEN t.status IN ('pending', 'in_progress') AND t.due_at < CURRENT_TIMESTAMP THEN 'incomplete' ELSE t.status END AS status`.
     - Khi lọc `status=incomplete`: SQL kết hợp `(t.status = 'incomplete' OR (t.status IN ('pending', 'in_progress') AND t.due_at < CURRENT_TIMESTAMP))` để bảo đảm mọi task quá hạn đều được trả về chính xác ngay cả khi chưa cập nhật DB.
     - Khi lọc `status=pending`: SQL lọc `(t.status = 'pending' AND t.due_at >= CURRENT_TIMESTAMP)`.
     - Khi lọc `status=in_progress`: SQL lọc `(t.status = 'in_progress' AND t.due_at >= CURRENT_TIMESTAMP)`.

3. **Ví dụ Request / Response**:

```json
// POST /tasks - Giao nhiệm vụ mới (Status mặc định là pending)
// Request Body:
{
  "team_id": "50000000-0000-0000-0000-000000000001",
  "worker_id": "10000000-0000-0000-0000-000000000003",
  "plot_id": "40000000-0000-0000-0000-000000000001",
  "content": "Kiem tra sau benh va phun thuoc luong 1-3",
  "start_at": "2026-10-05T08:00:00+07:00",
  "due_at": "2026-10-05T17:00:00+07:00"
}

// Response (201 Created):
{
  "task_id": "d0000000-0000-0000-0000-000000000001",
  "team_id": "50000000-0000-0000-0000-000000000001",
  "team_name": "Tổ Trồng trọt 1",
  "team_leader_name": "Lê Văn Cường",
  "worker_id": "10000000-0000-0000-0000-000000000003",
  "worker_name": "Phạm Thị Dung",
  "worker_phone": "0901000003",
  "plot_id": "40000000-0000-0000-0000-000000000001",
  "plot_code": "PLOT-DL-01",
  "org_id": "20000000-0000-0000-0000-000000000001",
  "org_name": "Nông trại Xanh Đà Lạt",
  "content": "Kiem tra sau benh va phun thuoc luong 1-3",
  "start_at": "2026-10-05T08:00:00+07:00",
  "due_at": "2026-10-05T17:00:00+07:00",
  "status": "pending",
  "created_at": "2026-10-05T07:30:00+07:00",
  "updated_at": "2026-10-05T07:30:00+07:00"
}
```

```json
// PATCH /tasks/{task_id}/status - Cập nhật trạng thái nhiệm vụ
// Trường hợp 0: Công nhân bấm "Bắt đầu" (chuyển pending sang in_progress)
// Request Body:
{
  "status": "in_progress"
}
// Response (200 OK):
{
  "task_id": "d0000000-0000-0000-0000-000000000001",
  "status": "in_progress",
  "updated_at": "2026-10-05T08:05:00+07:00"
}

// Trường hợp 1: Hoàn thành nhiệm vụ
// Request Body:
{
  "status": "completed"
}
// Response (200 OK):
{
  "task_id": "d0000000-0000-0000-0000-000000000001",
  "status": "completed",
  "updated_at": "2026-10-05T16:45:00+07:00"
}

// Trường hợp 2: Gửi status "in_progress" hoặc "pending" nhưng due_at < now (đã quá hạn) -> Hệ thống tự động chuyển thành "incomplete"
// Request Body:
{
  "status": "in_progress"
}
// Response (200 OK):
{
  "task_id": "d0000000-0000-0000-0000-000000000001",
  "status": "incomplete",
  "updated_at": "2026-10-06T09:00:00+07:00"
}

// Trường hợp 3: Đánh dấu trực tiếp "incomplete"
// Request Body:
{
  "status": "incomplete"
}
// Response (200 OK):
{
  "task_id": "d0000000-0000-0000-0000-000000000001",
  "status": "incomplete",
  "updated_at": "2026-10-06T09:00:00+07:00"
}
```

```json
// PUT /tasks/{task_id} hoặc PATCH /tasks/{task_id} - Chỉnh sửa thông tin nhiệm vụ
// Request Body:
{
  "content": "Kiem tra sau benh, bo sung bon phan huu co",
  "due_at": "2026-10-06T18:00:00+07:00",
  "status": "in_progress"
}
// Response (200 OK):
{
  "task_id": "d0000000-0000-0000-0000-000000000001",
  "content": "Kiem tra sau benh, bo sung bon phan huu co",
  "due_at": "2026-10-06T18:00:00+07:00",
  "status": "in_progress",
  "updated_at": "2026-10-05T10:00:00+07:00"
}
```

```json
// GET /tasks?status=incomplete - Lấy danh sách nhiệm vụ chưa hoàn thành / quá hạn
// Response (200 OK):
[
  {
    "task_id": "d0000000-0000-0000-0000-000000000004",
    "team_id": "50000000-0000-0000-0000-000000000001",
    "team_name": "Tổ Trồng trọt 1",
    "team_leader_name": "Lê Văn Cường",
    "worker_id": "10000000-0000-0000-0000-000000000003",
    "worker_name": "Phạm Thị Dung",
    "worker_phone": "0901000003",
    "plot_id": "40000000-0000-0000-0000-000000000001",
    "plot_code": "PLOT-DL-01",
    "org_id": "20000000-0000-0000-0000-000000000001",
    "org_name": "Nông trại Xanh Đà Lạt",
    "content": "Phun thuoc phong tru ray nau dot 2",
    "start_at": "2026-09-10T08:00:00+07:00",
    "due_at": "2026-09-11T17:00:00+07:00",
    "status": "incomplete",
    "created_at": "2026-09-10T07:00:00+07:00",
    "updated_at": "2026-09-10T07:00:00+07:00"
  }
]
```

```json
// DELETE /tasks/{task_id} - Hủy / Xóa mềm nhiệm vụ (Leader trong tổ, Owner nông trại, Admin)
// Response (200 OK - Trả về chi tiết nhiệm vụ với status chuyển sang "cancelled"):
{
  "task_id": "d0000000-0000-0000-0000-000000000001",
  "team_id": "50000000-0000-0000-0000-000000000001",
  "team_name": "Tổ Trồng trọt 1",
  "team_leader_name": "Lê Văn Cường",
  "worker_id": "10000000-0000-0000-0000-000000000003",
  "worker_name": "Phạm Thị Dung",
  "worker_phone": "0901000003",
  "plot_id": "40000000-0000-0000-0000-000000000001",
  "plot_code": "PLOT-DL-01",
  "org_id": "20000000-0000-0000-0000-000000000001",
  "org_name": "Nông trại Xanh Đà Lạt",
  "content": "Kiem tra sau benh va phun thuoc luong 1-3",
  "start_at": "2026-10-05T08:00:00+07:00",
  "due_at": "2026-10-05T17:00:00+07:00",
  "status": "cancelled",
  "created_at": "2026-10-05T07:30:00+07:00",
  "updated_at": "2026-10-05T08:15:00+07:00"
}
```

Schema DB cập nhật cho Tasks (Migration 001):
```sql
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'incomplete'));
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'pending';
```

Đợt 2: Module HarvestBatches (Lô thu hoạch & Tem nhãn QR)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /harvest-batches | Danh sách + tìm kiếm lô thu hoạch, lọc theo org_id/status/keyword/date_from/date_to. Admin xem all/lọc org; Owner xem các farm mình sở hữu; Leader/Worker xem farm trực thuộc | Đã xong |
|UC-SH04.1| GET | /harvest-batches/{batch_id} | Xem chi tiết lô thu hoạch kèm tổng số và danh sách chi tiết các mùa vụ đóng góp (seasons[]) | Đã xong |
|UC-O04.1| POST | /harvest-batches | Admin/Owner khởi tạo lô thu hoạch. Bắt buộc có initial_seasons (ít nhất 1 mùa vụ). Tự tính tổng sản lượng (quantity) ban đầu từ các mùa vụ đóng góp. Tự sinh batch_code chuẩn AGT-xxxx-YYYYMMDD-xxxx nếu để trống | Đã xong |
|UC-O04.2| PUT / PATCH | /harvest-batches/{batch_id} | Cập nhật ngày thu hoạch, mã lô, trạng thái. Chặn sửa trực tiếp quantity nếu lô đã có mùa vụ đóng góp (phải sửa qua /batch-seasons để đồng bộ) | Đã xong |
|UC-O04.3| POST | /harvest-batches/{batch_id}/generate-qr | Chủ nông trại kích hoạt lệnh tạo mã QR / Tem nhãn tra cứu truy xuất nguồn gốc. Tự động chuyển status sang ready | Đã xong |
|-| DELETE | /harvest-batches/{batch_id} | Xóa mềm lô thu hoạch (chuyển status=cancelled). Chặn xóa cứng vì mã QR có thể đã được in ấn hoặc quét bên ngoài | Đã xong |
Ghi chú request/response chính cho HarvestBatches:

```json
POST /harvest-batches
{
  "org_id": "20000000-0000-0000-0000-000000000001",
  "harvest_date": "2026-10-01",
  "status": "pending",
  "initial_seasons": [
    {
      "season_id": "70000000-0000-0000-0000-000000000001",
      "contributed_quantity": 250.5
    }
  ]
}
```

```json
POST /harvest-batches/{batch_id}/generate-qr
// Response tra ve thong tin lo kem qr_url va status da chuyen sang ready:
{
  "batch_id": "80000000-0000-0000-0000-000000000001",
  "batch_code": "AGT-2000-20261001-A1B2",
  "status": "ready",
  "qr_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=AGT-2000-20261001-A1B2"
}
```
Đợt 2: Module BatchSeasons (Liên kết Mùa vụ ↔ Lô thu hoạch)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-O04.1| POST | /batch-seasons | Gán thêm mùa vụ vào lô thu hoạch (hoặc kích hoạt lại liên kết nếu đã xóa mềm). Ràng buộc: mùa vụ phải cùng nông trại, status là ready_to_harvest hoặc completed, và bắt buộc phải cùng giống cây (crop_id) với các mùa vụ đã có trong lô. Tự động tính lại tổng quantity của lô | Đã xong |
|UC-SH04.1| GET | /batch-seasons/by-batch/{batch_id} | Danh sách các mùa vụ đã đóng góp sản lượng vào 1 lô thu hoạch (hỗ trợ query include_cancelled) | Đã xong |
|UC-SH04.1| GET | /batch-seasons/by-season/{season_id} | Tra cứu ngược: Mùa vụ này đã đóng góp sản lượng vào những lô thu hoạch nào | Đã xong |
|UC-SH04.1| GET | /batch-seasons/{batch_id}/{season_id} | Xem chi tiết 1 liên kết giữa lô thu hoạch và mùa vụ | Đã xong |
|UC-O04.2| PUT / PATCH | /batch-seasons/{batch_id}/{season_id} | Cập nhật sản lượng đóng góp (contributed_quantity > 0). Tự động đồng bộ lại tổng quantity của lô thu hoạch | Đã xong |
|UC-O04.2| DELETE | /batch-seasons/{batch_id}/{season_id} | Xóa mềm liên kết (chuyển status=cancelled), tự động trừ sản lượng và cập nhật lại quantity của lô thu hoạch | Đã xong |
Ghi chú request/response chính cho BatchSeasons:

```json
POST /batch-seasons
{
  "batch_id": "80000000-0000-0000-0000-000000000001",
  "season_id": "70000000-0000-0000-0000-000000000002",
  "contributed_quantity": 180.0
}
```

```json
PATCH /batch-seasons/{batch_id}/{season_id}
{
  "contributed_quantity": 200.0
}
```

Schema DB bổ sung cho BatchSeasons (Migration 001):

```sql
ALTER TABLE batch_seasons 
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled'));
```

Đợt 3: Module Notification (Hộp thư thông báo cá nhân)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04| GET | /notifications | Danh sách thông báo cá nhân của người dùng hiện tại (lọc theo is_read, type; phân trang limit 1..200, offset >= 0; sắp xếp created_at DESC) | Đã xong |
|UC-SH04| GET | /notifications/unread-count | Đếm số lượng thông báo chưa đọc của người dùng hiện tại (bắt buộc đặt trước /{notification_id} để tránh xung đột định tuyến UUID) | Đã xong |
|UC-SH04| PATCH | /notifications/read-all | Đánh dấu tất cả thông báo chưa đọc của người dùng hiện tại thành đã đọc (bắt buộc đặt trước /{notification_id}) | Đã xong |
|UC-SH04| GET | /notifications/{notification_id} | Xem chi tiết 1 thông báo của chính mình (kiểm tra quyền sở hữu: 403 Forbidden nếu không thuộc về mình; 404 Not Found nếu không tồn tại) | Đã xong |
|UC-SH04| PATCH | /notifications/{notification_id}/read | Đánh dấu 1 thông báo của chính mình thành đã đọc (kiểm tra quyền sở hữu) | Đã xong |
|UC-SH04| DELETE | /notifications/{notification_id} | Xóa 1 thông báo của chính mình (204 No Content; kiểm tra quyền sở hữu) | Đã xong |

Ghi chú nghiệp vụ, Enum, Event Triggers và Request/Response chính cho Notification:

1. **Quy tắc cô lập hộp thư cá nhân & Phân quyền bảo mật (Personal Inbox Data Isolation)**:
   - Mọi endpoint `/notifications` đều yêu cầu xác thực qua JWT Access Token (`Authorization: Bearer <token>`). Áp dụng đồng đều cho cả 4 vai trò: `worker`, `leader`, `owner`, `admin`.
   - Bảng `notifications` lưu `user_id` là người nhận thông báo. Hệ thống chỉ cho phép mỗi người dùng truy vấn, đếm, cập nhật trạng thái đã đọc và xóa các thông báo gửi đích danh cho tài khoản của chính mình (`notifications.user_id == current_user["user_id"]`).
   - Nghiêm cấm mọi hành vi truy cập chéo thông báo của người dùng khác (kể cả Owner hay Admin trên thông báo của người khác) $\rightarrow$ trả về `403 Forbidden` (`detail: "Bạn không có quyền truy cập thông báo của người dùng khác"`).
   - Truy vấn thông báo không tồn tại theo `notification_id` $\rightarrow$ trả về `404 Not Found` (`detail: "Không tìm thấy thông báo"`).

2. **Quy tắc chống tự gửi thông báo (No Self-Notification)**:
   - Khi người dùng tự thao tác trên đối tượng của chính mình (ví dụ: Tổ trưởng tự giao việc cho chính mình hoặc tự viết ghi chú trên nhật ký của mình), hệ thống không tạo thông báo dư thừa gửi lại cho chính họ.

3. **Bất biến định tuyến FastAPI (Route Shadowing Invariant)**:
   - Route tĩnh `GET /notifications/unread-count` và `PATCH /notifications/read-all` **BẮT BUỘC ĐỨNG TRƯỚC** route động `GET /notifications/{notification_id}`. Nếu đặt sau, FastAPI sẽ nhầm `"unread-count"` hoặc `"read-all"` là tham số kiểu `UUID` và trả về lỗi `422 Unprocessable Entity`.

4. **Cơ chế Event Triggers tự động tại Backend**:
   - **Trigger Phân công nhiệm vụ (`POST /tasks` & `PUT / PATCH /tasks/{task_id}`)**:
     - Khi nhiệm vụ mới được tạo hoặc nhiệm vụ được chuyển giao cho công nhân khác (`new_worker_id != task["worker_id"]`), nếu người được giao khác với người thực hiện thao tác (`payload.worker_id != current_user["user_id"]`), Backend tự động tạo bản ghi `notifications`:
       - `user_id`: `payload.worker_id` / `new_worker_id`
       - `type`: `"task_assigned"`
       - `content`: `"Bạn có nhiệm vụ mới: {content}"`
   - **Trigger Ghi chú phản hồi nhật ký (`POST /log-notes`)**:
     - Khi Tổ trưởng hoặc Chủ nông trại thêm ghi chú dưới nhật ký canh tác (`POST /log-notes`), nếu người ghi chú khác với tác giả nhật ký (`log["user_id"] != current_user["user_id"]`), Backend tự động tạo bản ghi `notifications`:
       - `user_id`: `log["user_id"]`
       - `type`: `"log_note"`
       - `content`: `"Tổ trưởng vừa để lại ghi chú dưới nhật ký của bạn"` (nếu role là `leader`) hoặc `"Chủ nông trại vừa để lại ghi chú dưới nhật ký của bạn"` (nếu role là `owner`).

5. **Enum Loại thông báo (`NotificationType`)**:
   - `task_assigned`: Thông báo nhiệm vụ mới được phân công cho công nhân.
   - `log_note`: Thông báo ghi chú / phản hồi kỹ thuật mới dưới nhật ký canh tác.
   - `reminder`: Thông báo nhắc nhở lịch mùa vụ / chăm sóc cây trồng theo mốc sinh trưởng.
   - `error_report`: Thông báo có báo cáo sự cố kỹ thuật / đồng ruộng.
   - `error_report_response`: Thông báo phản hồi về báo cáo sự cố kỹ thuật.

6. **Ví dụ Request / Response**:

```http
# 1. GET /notifications - Danh sách thông báo cá nhân (kèm lọc và phân trang)
GET /notifications?is_read=false&type=task_assigned&limit=20&offset=0
Authorization: Bearer <token>
```

- **Response thành công (200 OK - Danh sách `NotificationOut`)**:
```json
[
  {
    "notification_id": "f0000000-0000-0000-0000-000000000001",
    "user_id": "10000000-0000-0000-0000-000000000003",
    "content": "Bạn có nhiệm vụ mới: Kiểm tra độ ẩm lô DL-01",
    "type": "task_assigned",
    "is_read": false,
    "created_at": "2026-10-24T08:00:00+07:00"
  },
  {
    "notification_id": "f0000000-0000-0000-0000-000000000005",
    "user_id": "10000000-0000-0000-0000-000000000003",
    "content": "Tổ trưởng vừa để lại ghi chú dưới nhật ký của bạn",
    "type": "log_note",
    "is_read": false,
    "created_at": "2026-10-24T07:30:00+07:00"
  }
]
```

```http
# 2. GET /notifications/unread-count - Đếm số lượng thông báo chưa đọc
GET /notifications/unread-count
Authorization: Bearer <token>
```

- **Response thành công (200 OK - `UnreadCountOut`)**:
```json
{
  "unread_count": 2
}
```

```http
# 3. PATCH /notifications/read-all - Đánh dấu tất cả thông báo chưa đọc thành đã đọc
PATCH /notifications/read-all
Authorization: Bearer <token>
```

- **Response thành công (200 OK - `MarkAllReadOut`)**:
```json
{
  "updated_count": 2,
  "message": "Đã đánh dấu tất cả thông báo là đã đọc"
}
```

```http
# 4. GET /notifications/{notification_id} - Xem chi tiết 1 thông báo
GET /notifications/f0000000-0000-0000-0000-000000000001
Authorization: Bearer <token>
```

- **Response thành công (200 OK - `NotificationOut`)**:
```json
{
  "notification_id": "f0000000-0000-0000-0000-000000000001",
  "user_id": "10000000-0000-0000-0000-000000000003",
  "content": "Bạn có nhiệm vụ mới: Kiểm tra độ ẩm lô DL-01",
  "type": "task_assigned",
  "is_read": false,
  "created_at": "2026-10-24T08:00:00+07:00"
}
```

```http
# 5. PATCH /notifications/{notification_id}/read - Đánh dấu 1 thông báo thành đã đọc
PATCH /notifications/f0000000-0000-0000-0000-000000000001/read
Authorization: Bearer <token>
```

- **Response thành công (200 OK - `NotificationOut`)**:
```json
{
  "notification_id": "f0000000-0000-0000-0000-000000000001",
  "user_id": "10000000-0000-0000-0000-000000000003",
  "content": "Bạn có nhiệm vụ mới: Kiểm tra độ ẩm lô DL-01",
  "type": "task_assigned",
  "is_read": true,
  "created_at": "2026-10-24T08:00:00+07:00"
}
```

```http
# 6. DELETE /notifications/{notification_id} - Xóa 1 thông báo
DELETE /notifications/f0000000-0000-0000-0000-000000000001
Authorization: Bearer <token>
```

- **Response thành công (204 No Content)**:
*(Không có response body)*

- **Các phản hồi lỗi ngoại lệ chuẩn hóa**:
  - `401 Unauthorized`: Thiếu header `Authorization`, token hết hạn hoặc nằm trong `token_blacklist` (`EX-05`).
  - `403 Forbidden`: Người dùng cố gắng xem, cập nhật hoặc xóa thông báo thuộc về tài khoản khác (`EX-06`):
    ```json
    {
      "detail": "Bạn không có quyền truy cập thông báo của người dùng khác"
    }
    ```
  - `404 Not Found`: Không tìm thấy bản ghi thông báo theo `notification_id`:
    ```json
    {
      "detail": "Không tìm thấy thông báo"
    }
    ```
  - `422 Unprocessable Entity`: Sai định dạng UUID hoặc tham số phân trang vượt giới hạn cho phép (`limit < 1`, `limit > 200`, `offset < 0`).

Đợt 3: Module ReminderSchedules (Lịch nhắc nhở mùa vụ)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1 + UC-O03.3| GET | /reminders | Danh sách + lọc lịch nhắc nhở (season_id, status, channel, from_date, to_date, org_id), scope theo role (Admin: toàn bộ/lọc org; Owner: farm sở hữu; Leader/Worker: farm trực thuộc) | Đã xong |
|UC-O03.3 + BR-12| POST | /reminders/dispatch | Quét và phát hành các lịch nhắc nhở đến hạn (remind_date <= CURRENT_DATE và status='scheduled') chuyển sang status='sent', kích hoạt Trigger DB gửi thông báo cho Owner và Team Leaders. Đặt trước /{reminder_id} | Đã xong |
|UC-SH04.1| GET | /reminders/{reminder_id} | Xem chi tiết 1 bản ghi lịch nhắc nhở (kiểm tra quyền truy cập Data Isolation) | Đã xong |
|UC-O03.3| POST | /reminders | Admin / Owner / Leader tạo lịch nhắc nhở thủ công cho mùa vụ (kiểm tra mùa vụ hợp lệ và thuộc phạm vi quản lý) | Đã xong |
|UC-O03.3| PATCH | /reminders/{reminder_id} | Admin / Owner / Leader sửa mốc nhắc việc, ngày nhắc, kênh gửi hoặc trạng thái | Đã xong |
|UC-O03.3| PATCH | /reminders/{reminder_id}/status | Cập nhật nhanh trạng thái lịch nhắc nhở (scheduled -> sent -> seen) | Đã xong |
|UC-O03.3| DELETE | /reminders/{reminder_id} | Xóa lịch nhắc nhở (204 No Content - Chỉ dành cho Admin hoặc Owner sở hữu nông trại) | Đã xong |

Ghi chú nghiệp vụ, Enum, Database Triggers và Request/Response chính cho ReminderSchedules:

1. **Nguyên tắc nghiệp vụ `BR-12` & Tự động sinh lịch nhắc nhở**:
   - Khi mùa vụ được tạo (`POST /seasons`), hệ thống tự động sinh các bản ghi trong `reminder_schedules` dựa trên mốc sinh trưởng giống cây (`crop_care_milestones`) với `remind_date = start_date + offset_days` và `status = 'scheduled'`.
   - Admin/Owner có thể gọi endpoint `POST /reminders/dispatch` để quét và kích hoạt các lịch nhắc nhở đến hạn (`remind_date <= CURRENT_DATE`), tự động chuyển sang `status = 'sent'`.

2. **Cơ chế Trigger tự động sinh thông báo (`trg_notify_on_reminder_sent`)**:
   - Khi lịch nhắc nhở chuyển sang trạng thái `status = 'sent'` (thông qua API `dispatch` hoặc cập nhật thủ công), Trigger PL/pgSQL tự động tìm:
     - Chủ sở hữu nông trại (`organizations.owner_id`).
     - Tổ trưởng các tổ được phân công phụ trách mùa vụ (`teams.team_leader_id` từ `season_team_assignments`).
   - Trigger tự động tạo bản ghi vào `notifications` với `type = 'reminder'`, nội dung: `'Nhắc việc mùa vụ ' || plot_code || ': đến hạn ' || NEW.milestone_type`.
   - Sử dụng `SELECT DISTINCT recipient_id` để đảm bảo mỗi người dùng chỉ nhận đúng 1 thông báo, tránh trùng lặp.

3. **Phân quyền & Cô lập dữ liệu (Data Isolation)**:
   - `admin`: Xem toàn bộ hoặc lọc theo `org_id` / `season_id`, có quyền phát hành toàn hệ thống.
   - `owner`: Chỉ xem, tạo, sửa, xóa và phát hành lịch nhắc nhở thuộc các nông trại mình sở hữu (`ensure_owns_org`).
   - `leader`: Xem lịch nhắc nhở của nông trại trực thuộc, có quyền tạo/sửa lịch nhắc nhở cho mùa vụ của nông trại.
   - `worker`: Chỉ xem danh sách lịch nhắc nhở của nông trại trực thuộc, không có quyền tạo/sửa/xóa/phát hành.

4. **Bất biến định tuyến FastAPI (Route Shadowing Invariant)**:
   - Endpoint `POST /reminders/dispatch` **BẮT BUỘC ĐỨNG TRƯỚC** route động `GET /reminders/{reminder_id}` để tránh xung đột định tuyến (FastAPI hiểu nhầm chuỗi `"dispatch"` là `UUID` và trả về lỗi `422 Unprocessable Entity`).

5. **Enum hỗ trợ**:
   - `ReminderStatus`: `scheduled` (Đã lên lịch), `sent` (Đã phát hành / gửi), `seen` (Đã xem).
   - `ReminderChannel`: `push` (Thông báo ứng dụng), `sms` (Tin nhắn SMS), `email` (Thư điện tử).

6. **Ví dụ Request / Response**:

```http
# 1. POST /reminders/dispatch - Phát hành các lịch nhắc nhở đến hạn
POST /reminders/dispatch?org_id=20000000-0000-0000-0000-000000000001
Authorization: Bearer <token_owner_hoac_admin>
```

- **Response thành công (200 OK - `ReminderDispatchOut`)**:
```json
{
  "dispatched_count": 7,
  "reminder_ids": [
    "e0000000-0000-0000-0000-000000000001",
    "e0000000-0000-0000-0000-000000000002"
  ],
  "message": "Đã phát hành thành công 7 lịch nhắc nhở đến hạn"
}
```

```http
# 2. PATCH /reminders/{reminder_id}/status - Cập nhật nhanh trạng thái lịch nhắc nhở
PATCH /reminders/e0000000-0000-0000-0000-000000000001/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "seen"
}
```

- **Response thành công (200 OK - `ReminderScheduleOut`)**:
```json
{
  "reminder_id": "e0000000-0000-0000-0000-000000000001",
  "season_id": "70000000-0000-0000-0000-000000000001",
  "plot_code": "DL-01",
  "crop_name": "Xà lách Lollo Rossa",
  "milestone_type": "fertilize",
  "remind_date": "2026-10-29",
  "channel": "push",
  "status": "seen",
  "created_at": "2026-10-20T08:00:00+07:00"
}
```

- **Các phản hồi lỗi ngoại lệ chuẩn hóa**:
  - `401 Unauthorized`: Chưa xác thực hoặc Access Token không hợp lệ / nằm trong blacklist (`EX-05`).
  - `403 Forbidden`: Người dùng không có quyền truy cập lịch nhắc nhở thuộc nông trại khác (`EX-06`, `EX-07`) hoặc vai trò không hợp lệ (ví dụ: Worker cố gọi dispatch).
  - `404 Not Found`: Không tìm thấy bản ghi lịch nhắc nhở hoặc mùa vụ liên kết (`EX-04`).
  - `422 Unprocessable Entity`: Sai định dạng tham số UUID, Enum trạng thái hoặc chuỗi ngày tháng.

---

Đợt 3: Module ErrorReports (Báo cáo sự cố phần mềm)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH03 + UC-A03.1| GET | /error-reports | Danh sách + lọc báo cáo sự cố (status, error_type, org_id, user_id, phân trang limit 1..100, offset >= 0). Admin xem all; Owner xem farm mình; Worker/Leader xem báo cáo do mình gửi | Đã xong |
|UC-SH03| POST | /error-reports | Người dùng gửi báo cáo sự cố kỹ thuật/phần mềm (tự động gán user_id và org_id từ token). Tự động kích hoạt Trigger gửi thông báo cho tất cả Admin đang hoạt động | Đã xong |
|UC-SH03 + UC-A03.1| GET | /error-reports/{report_id} | Xem chi tiết 1 báo cáo sự cố kèm phản hồi từ Quản trị viên (kiểm tra quyền truy cập Data Isolation) | Đã xong |
|UC-A03.2| PATCH | /error-reports/{report_id} | Admin cập nhật tiến độ (processing, resolved, rejected) và phản hồi hướng dẫn xử lý (admin_response). Tự động kích hoạt Trigger gửi thông báo phản hồi cho người gửi | Đã xong |
|UC-SH03 + UC-A03.1| DELETE | /error-reports/{report_id} | Xóa báo cáo sự cố (204 No Content). Admin xóa bất kỳ báo cáo nào; Người dùng chỉ được xóa báo cáo của chính mình khi status='new' (chặn xóa khi đã tiếp nhận xử lý) | Đã xong |

Ghi chú nghiệp vụ, Enum, Database Triggers và Request/Response chính cho ErrorReports:

1. **Phân quyền nghiệp vụ (`UC-SH03`, `UC-A03.1`, `UC-A03.2`)**:
   - `admin`: Xem tất cả báo cáo hệ thống hoặc lọc theo `org_id` / `user_id`, cập nhật trạng thái/phản hồi xử lý (`admin_response`), xóa báo cáo bất kỳ lúc nào.
   - `owner`: Xem các báo cáo phát sinh tại các nông trại mình sở hữu (`report.owner_id == user_id` hoặc cùng `org_id`), gửi báo cáo sự cố mới.
   - `leader`, `worker`: Chỉ xem và quản lý các báo cáo do chính tài khoản của mình gửi (`report.user_id == current_user["user_id"]`).

2. **Quy tắc xóa an toàn (Safe Deletion Rule)**:
   - Người dùng thông thường (`worker`, `leader`, `owner`) chỉ được phép xóa báo cáo của chính mình khi `status == 'new'`.
   - Nếu báo cáo đã được Admin tiếp nhận hoặc chuyển sang `processing`, `resolved`, `rejected`, yêu cầu xóa sẽ bị chặn với mã lỗi `400 Bad Request`: `"Không thể xóa báo cáo đã được tiếp nhận xử lý"`.

3. **Cơ chế Database Triggers tự động**:
   - **Trigger 2 (`trg_notify_on_error_report_created`)**: Khi có báo cáo mới được tạo (`INSERT ON error_reports`), trigger tự động tìm tất cả Admin đang hoạt động (`users.role = 'admin' AND users.status = 'active'`) và chèn thông báo vào `notifications` với `type = 'error_report'`, nội dung: `'Có báo cáo lỗi mới cần xử lý'`.
   - **Trigger 3 (`trg_notify_on_error_report_resolved`)**: Khi Admin cập nhật phản hồi hoặc trạng thái (`UPDATE ON error_reports` có `admin_response IS NOT NULL` hoặc chuyển sang `processing`, `resolved`, `rejected`), trigger tự động gửi thông báo đến người gửi báo cáo (`NEW.user_id`) với `type = 'error_report_response'`, nội dung: `'Báo cáo lỗi của bạn đã được Admin phản hồi: ' || COALESCE(NEW.admin_response, 'Trạng thái: ' || NEW.status)`.

4. **Enum hỗ trợ**:
   - `ErrorReportStatus`: `new` (Mới tiếp nhận), `processing` (Đang xử lý), `resolved` (Đã giải quyết), `rejected` (Từ chối).
   - `ErrorReportCategory`: `interface` (Giao diện), `data` (Dữ liệu), `performance` (Hiệu năng), `bug` (Lỗi logic), `other` (Khác).

5. **Ví dụ Request / Response**:

```http
# 1. POST /error-reports - Gửi báo cáo sự cố kỹ thuật mới
POST /error-reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "error_type": "bug",
  "description": "Nút bấm Ghi nhật ký nhanh bị đơ không phản hồi khi chụp 3 ảnh liên tiếp trên Android",
  "screenshot_url": "https://cdn.agritrace.vn/reports/screenshot-android-01.png"
}
```

- **Response thành công (201 Created - `ErrorReportOut`)**:
```json
{
  "report_id": "b0000000-0000-0000-0000-000000000001",
  "user_id": "10000000-0000-0000-0000-000000000003",
  "user_full_name": "Phạm Thị Dung",
  "user_phone": "0901000003",
  "org_id": "20000000-0000-0000-0000-000000000001",
  "org_name": "Nông trại Xanh Đà Lạt",
  "error_type": "bug",
  "description": "Nút bấm Ghi nhật ký nhanh bị đơ không phản hồi khi chụp 3 ảnh liên tiếp trên Android",
  "screenshot_url": "https://cdn.agritrace.vn/reports/screenshot-android-01.png",
  "status": "new",
  "admin_response": null,
  "submitted_at": "2026-10-29T10:15:00+07:00",
  "updated_at": "2026-10-29T10:15:00+07:00"
}
```

```http
# 2. PATCH /error-reports/{report_id} - Admin cập nhật phản hồi và trạng thái
PATCH /error-reports/b0000000-0000-0000-0000-000000000001
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "status": "resolved",
  "admin_response": "Đã sửa lỗi tràn bộ nhớ nén ảnh trên phiên bản v1.0.4. Vui lòng cập nhật ứng dụng."
}
```

- **Response thành công (200 OK - `ErrorReportOut`)**:
```json
{
  "report_id": "b0000000-0000-0000-0000-000000000001",
  "user_id": "10000000-0000-0000-0000-000000000003",
  "user_full_name": "Phạm Thị Dung",
  "user_phone": "0901000003",
  "org_id": "20000000-0000-0000-0000-000000000001",
  "org_name": "Nông trại Xanh Đà Lạt",
  "error_type": "bug",
  "description": "Nút bấm Ghi nhật ký nhanh bị đơ không phản hồi khi chụp 3 ảnh liên tiếp trên Android",
  "screenshot_url": "https://cdn.agritrace.vn/reports/screenshot-android-01.png",
  "status": "resolved",
  "admin_response": "Đã sửa lỗi tràn bộ nhớ nén ảnh trên phiên bản v1.0.4. Vui lòng cập nhật ứng dụng.",
  "submitted_at": "2026-10-29T10:15:00+07:00",
  "updated_at": "2026-10-29T10:18:00+07:00"
}
```

- **Các phản hồi lỗi ngoại lệ chuẩn hóa**:
  - `400 Bad Request`: Thiếu thông tin nông trại liên kết hoặc xóa báo cáo khi trạng thái không phải `new`.
  - `401 Unauthorized`: Chưa đăng nhập hoặc token không hợp lệ (`EX-05`).
  - `403 Forbidden`: Người dùng không có quyền truy cập báo cáo của người khác hoặc không phải Admin khi phản hồi (`EX-06`).
  - `404 Not Found`: Không tìm thấy báo cáo sự cố (`EX-04`).
  - `422 Unprocessable Entity`: Sai định dạng UUID, độ dài mô tả < 5 ký tự hoặc enum trạng thái không hợp lệ.

---

Đợt 3: Module SystemLogs (Nhật ký giám sát kiểm toán hệ thống - Audit Trail)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-A02.2 + BR-19| GET | /system-logs | Giám sát danh sách nhật ký kiểm toán hệ thống (Audit Trail), hỗ trợ lọc actor_id, target_type, action, result, from_time, to_time, phân trang limit 1..200, offset >= 0. Chỉ dành riêng cho Admin | Đã xong |
|UC-A02.2| GET | /system-logs/{log_id} | Xem chi tiết 1 bản ghi nhật ký kiểm toán hệ thống kèm thông tin người thực hiện (Chỉ dành riêng cho Admin) | Đã xong |
|UC-A02.2| POST | /system-logs | Ghi thủ công sự kiện kiểm toán hệ thống (Admin). Tự động gán actor_id từ token nếu để trống | Đã xong |

Ghi chú nghiệp vụ, Enum, Database Triggers và Request/Response chính cho SystemLogs:

1. **Phân quyền tuyệt đối (Admin-Only Audit Trail - `UC-A02.2`)**:
   - Toàn bộ các endpoints `/system-logs` được bảo vệ bằng dependency `require_role("admin")`.
   - Bất kỳ vai trò nào khác (`owner`, `leader`, `worker`) hoặc người dùng vãng lai cố tình gọi API đều bị từ chối với mã lỗi `403 Forbidden` (`"Bạn không có quyền thực hiện thao tác này"`).

2. **Cơ chế Database Triggers tự động ghi vết kiểm toán (Audit Trail Triggers - `BR-19`)**:
   - **Trigger 4A (`trg_audit_system_logs_on_users`)**:
     - Khi tài khoản người dùng bị khóa (`NEW.status = 'locked'` và `OLD.status != 'locked'`), trigger tự động ghi nhận bản ghi vào `system_logs` với `target_type = 'users'`, `target_id = NEW.user_id`, `action = 'lock_user'`, `result = 'success'`.
     - Khi thay đổi vai trò người dùng (`NEW.role != OLD.role`), trigger tự động ghi nhận bản ghi với `target_type = 'users'`, `target_id = NEW.user_id`, `action = 'change_role'`, `result = 'success'`.
   - **Trigger 4B (`trg_audit_system_logs_on_seasons`)**:
     - Khi mùa vụ chuyển sang trạng thái hoàn thành (`NEW.status = 'completed'` và `OLD.status != 'completed'`), trigger tự động ghi nhận bản ghi với `target_type = 'seasons'`, `target_id = NEW.season_id`, `action = 'season_completed'`, `result = 'success'`.
     - Khi mùa vụ chuyển các trạng thái khác, trigger ghi nhận với `action = 'season_status_changed'`, `result = 'success'`.
   - **Trích xuất Actor ID an toàn**: Trigger trích xuất `actor_id` từ biến session PostgreSQL `current_setting('app.current_user_id', true)` trong khối ngoại lệ an toàn, đảm bảo nếu thao tác ngoài API (như chạy script DB hoặc migrate) thì `actor_id` được gán `NULL` mà không làm văng lỗi câu lệnh.

3. **Enum hỗ trợ**:
   - `SystemLogResult`: `success` (Thao tác thành công), `failed` (Thao tác thất bại).

4. **Ví dụ Request / Response**:

```http
# 1. GET /system-logs - Danh sách nhật ký kiểm toán hệ thống (kèm lọc và phân trang)
GET /system-logs?target_type=users&action=lock_user&limit=10&offset=0
Authorization: Bearer <token_admin>
```

- **Response thành công (200 OK - `SystemLogPagination`)**:
```json
{
  "total": 1,
  "items": [
    {
      "log_id": "c0000000-0000-0000-0000-000000000001",
      "target_type": "users",
      "target_id": "10000000-0000-0000-0000-000000000003",
      "action": "lock_user",
      "result": "success",
      "actor_id": "10000000-0000-0000-0000-000000000008",
      "actor_name": "Trần Thị Bình",
      "actor_phone": "0900000008",
      "actor_role": "admin",
      "performed_at": "2026-10-29T10:20:00+07:00"
    }
  ],
  "limit": 10,
  "offset": 0
}
```

```http
# 2. GET /system-logs/{log_id} - Xem chi tiết 1 bản ghi kiểm toán
GET /system-logs/c0000000-0000-0000-0000-000000000001
Authorization: Bearer <token_admin>
```

- **Response thành công (200 OK - `SystemLogOut`)**:
```json
{
  "log_id": "c0000000-0000-0000-0000-000000000001",
  "target_type": "users",
  "target_id": "10000000-0000-0000-0000-000000000003",
  "action": "lock_user",
  "result": "success",
  "actor_id": "10000000-0000-0000-0000-000000000008",
  "actor_name": "Trần Thị Bình",
  "actor_phone": "0900000008",
  "actor_role": "admin",
  "performed_at": "2026-10-29T10:20:00+07:00"
}
```

```http
# 3. POST /system-logs - Ghi sự kiện kiểm toán thủ công
POST /system-logs
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "target_type": "security",
  "target_id": null,
  "action": "manual_security_audit",
  "result": "success"
}
```

- **Response thành công (201 Created - `SystemLogOut`)**:
```json
{
  "log_id": "c0000000-0000-0000-0000-000000000099",
  "target_type": "security",
  "target_id": null,
  "action": "manual_security_audit",
  "result": "success",
  "actor_id": "10000000-0000-0000-0000-000000000008",
  "actor_name": "Trần Thị Bình",
  "actor_phone": "0900000008",
  "actor_role": "admin",
  "performed_at": "2026-10-29T10:22:00+07:00"
}
```

- **Các phản hồi lỗi ngoại lệ chuẩn hóa**:
  - `401 Unauthorized`: Chưa xác thực hoặc Access Token không hợp lệ / nằm trong blacklist (`EX-05`).
  - `403 Forbidden`: Người dùng không có vai trò `admin` (`"Bạn không có quyền thực hiện thao tác này"` - `EX-06`).
  - `404 Not Found`: Không tìm thấy bản ghi nhật ký kiểm toán theo `log_id` (`EX-04`).
  - `422 Unprocessable Entity`: Sai định dạng UUID, enum kết quả hoặc phân trang ngoài khoảng cho phép (`limit < 1`, `limit > 200`, `offset < 0`).