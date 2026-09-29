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
|UC-SH04.1| GET | /plots/{plot_id} | Xem chi tiết lô đất kèm ranh giới GeoJSON và mùa vụ đang canh tác hiện tại (nếu có) | Đã xong |
|UC-O02.1| POST | /plots | Tạo lô đất mới thuộc 1 nông trại. Tự tính diện tích từ ranh giới nếu không nhập tay; chặn nếu ranh giới lô vượt ra ngoài ranh giới nông trại cha (ST_Contains) | Đã xong |
|UC-O02.2| PATCH | /plots/{plot_id} | Sửa mã lô, diện tích, trạng thái hoặc ranh giới. Chặn sửa ranh giới nếu lô đang có mùa vụ hoạt động (growing/ready_to_harvest); ranh giới mới vẫn phải nằm trong nông trại cha | Đã xong |
|UC-O02.3| DELETE | /plots/{plot_id}?soft=true\|false | Xóa lô đất. Mặc định xóa mềm (status=inactive); luôn chặn nếu đang có mùa vụ hoạt động; soft=false trả 400 nếu lô đã có lịch sử mùa vụ/nhiệm vụ | Đã xong |

Đợt 1: Module Team (Tổ công nhân)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /teams | Danh sách + tìm kiếm tổ, scope theo role (Admin/Owner theo org, Leader/Worker theo farm trực thuộc) | Đã xong |
|UC-SH04.1| GET | /teams/{team_id} | Xem chi tiết tổ kèm danh sách thành viên | Đã xong |
|UC-O06.1| POST | /teams | Tạo tổ mới; có thể gán luôn Tổ trưởng (kiểm tra người này chưa làm Tổ trưởng của tổ khác) | Đã xong |
|UC-O06.2 + UC-O06.3| PATCH | /teams/{team_id} | Đổi tên tổ hoặc đổi Tổ trưởng. Tổ trưởng cũ (nếu bị thay) tự động hạ role về worker | Đã xong |
|-| DELETE | /teams/{team_id} | Xóa tổ (hard delete, bảng teams không có cột status). Chặn nếu đang có nhiệm vụ in_progress; trả 400 nếu tổ đã có lịch sử task/mùa vụ hỗ trợ | Đã xong |
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
|UC-W03.1 -> UC-W03.6| POST | /farming-logs | Worker/Leader tạo nhật ký canh tác bằng JSON thuần. Bắt buộc activity_type và gps; content optional; activity_type là free text, không enum. Chỉ cho tạo khi season cùng org và status là growing/ready_to_harvest | Đã xong |
|UC-W03.1 -> UC-W03.6| POST | /farming-logs/{log_id}/photos | Tác giả log upload ảnh theo flow bước 2, multipart/form-data key files. Tối đa 5 ảnh/log, 5MB/ảnh, chỉ .jpg/.jpeg, không convert HEIC ở backend | Đã xong |

Ghi chú request/response chính cho FarmingLog:

```json
POST /farming-logs
{
  "season_id": "70000000-0000-0000-0000-000000000001",
  "activity_type": "bao_cao_su_co",
  "content": "Phat hien la co dau hieu sau benh o luong A",
  "gps": {
    "latitude": 11.9415,
    "longitude": 108.4215
  }
}
```

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

Notification khi có note mới tạm bỏ qua ở đợt 2: không insert vào bảng `notifications`.
Đợt 2: Module Tasks (Nhiệm vụ công việc)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /tasks | Danh sách + tìm kiếm nhiệm vụ, lọc theo org/team/worker/plot/status/keyword/include_cancelled. Scope theo role (Admin: all, Owner: theo org, Leader: chỉ xem tổ mình, Worker: chỉ xem việc của mình) | Đã xong |
|UC-SH04.1| GET | /tasks/{task_id} | Xem chi tiết nhiệm vụ kèm thông tin mở rộng của team, công nhân phụ trách, mã lô và nông trại | Đã xong |
|UC-T01.3 + UC-O06.1| POST | /tasks | Admin/Owner/Leader tạo nhiệm vụ mới. Leader chỉ được giao việc cho tổ của mình. Ràng buộc: worker và plot phải thuộc cùng nông trại của team, worker phải active và thuộc đúng tổ phụ trách | Đã xong |
|UC-T01.3| PUT / PATCH | /tasks/{task_id} | Admin/Owner/Leader cập nhật thông tin nhiệm vụ. Leader không được chuyển nhiệm vụ sang tổ khác. Tự động kiểm tra lại tính hợp lệ nếu thay đổi team, worker hoặc plot | Đã xong |
|UC-W01.1 + UC-T01.3| PATCH | /tasks/{task_id}/status | Cập nhật nhanh trạng thái nhiệm vụ (in_progress, completed, cancelled). Worker chỉ được cập nhật việc của mình và KHÔNG có quyền hủy (cancelled); Leader/Owner/Admin có quyền cập nhật trong phạm vi quản lý | Đã xong |
|-| DELETE | /tasks/{task_id} | Hủy/Xóa mềm nhiệm vụ (chuyển status=cancelled). Chỉ Admin, Owner và Leader phụ trách tổ mới có quyền thực hiện | Đã xong |

Ghi chú request/response chính cho Tasks:
```json
POST /tasks
{
  "team_id": "50000000-0000-0000-0000-000000000001",
  "worker_id": "10000000-0000-0000-0000-000000000003",
  "plot_id": "40000000-0000-0000-0000-000000000001",
  "content": "Kiem tra sau benh va phun thuoc luong 1-3",
  "due_date": "2026-10-05"
}
```

```json
PATCH /tasks/{task_id}/status
{
  "status": "completed"
}
```
Schema DB bổ sung cho Tasks (Migration 001):

```sql
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('in_progress', 'completed', 'cancelled'));
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