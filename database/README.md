# Farmer QuickLog – Database Schema Documentation

Tài liệu này mô tả cấu trúc cơ sở dữ liệu của hệ thống **Farmer QuickLog** (Quản lý nông trại).  
File SQL gốc: [`init_db.sql`](./init_db.sql)

> **Công nghệ**: PostgreSQL + PostGIS + `uuid-ossp`

---

## 1. Tổng quan

Hệ thống hỗ trợ các vai trò:

| Vai trò | Role trong DB | Mô tả ngắn |
|---------|---------------|------------|
| Chủ sở hữu | `owner` | Quản lý nông trại, mùa vụ, nhân sự, lô thu hoạch |
| Tổ trưởng | `leader` | Điều phối công việc, kiểm tra nhật ký, giao việc |
| Công nhân | `worker` | Ghi nhật ký canh tác, nhận nhiệm vụ |
| Admin | `admin` | Quản trị hệ thống, danh mục, xử lý báo cáo lỗi |

**Nguyên tắc thiết kế chính**:

- Mọi người dùng nằm chung bảng `users`, phân biệt bằng cột `role`.
- Sử dụng **UUID** làm khóa chính.
- Hỗ trợ **multi-tenant** qua `org_id` (cách ly dữ liệu giữa các nông trại).
- Ưu tiên **xóa mềm** (soft delete) qua cột `status`.
- Tự động cập nhật `updated_at` bằng trigger.
- Dữ liệu không gian (ranh giới nông trại, lô đất, GPS) dùng kiểu `GEOMETRY` của PostGIS.

---

## 2. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

| Extension | Mục đích |
|-----------|----------|
| `uuid-ossp` | Sinh UUID tự động (`uuid_generate_v4()`) |
| `postgis` | Hỗ trợ kiểu dữ liệu hình học (`GEOMETRY`) cho ranh giới và tọa độ GPS |

---

## 3. Trigger Function dùng chung

```sql
CREATE OR REPLACE FUNCTION trg_set_updated_at()
```

**Chức năng**: Tự động gán `NEW.updated_at = CURRENT_TIMESTAMP` mỗi khi có câu lệnh `UPDATE`.

**Được gắn vào các bảng**:
- `users`
- `organizations`
- `plots`
- `teams`
- `crop_catalog`
- `seasons`
- `harvest_batches`
- `tasks`
- `error_reports`

> Lưu ý: Các bảng không có cột `updated_at` (như `farming_logs`, `notifications`, `log_notes`…) sẽ không dùng trigger này.

---

## 4. Danh sách bảng

### 4.1. `users` – Người dùng

Bảng trung tâm chứa toàn bộ tài khoản.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| `user_id` | UUID PK | Khóa chính |
| `full_name` | VARCHAR | Họ tên |
| `phone` | VARCHAR UNIQUE | Số điện thoại (dùng đăng nhập) |
| `national_id` | VARCHAR | CCCD (unique nếu có giá trị) |
| `role` | VARCHAR | `owner` \| `leader` \| `worker` \| `admin` |
| `status` | VARCHAR | `active` \| `locked` |
| `org_id` | UUID FK | Thuộc nông trại nào |
| `team_id` | UUID FK | Thuộc tổ nào (có thể null) |

**Ràng buộc quan trọng**:
- `phone` là duy nhất.
- `national_id` duy nhất (partial unique index – chỉ khi khác null).
- Index theo `org_id` và `team_id` để hỗ trợ data isolation.

---

### 4.2. `organizations` – Nông trại

| Cột | Mô tả |
|-----|-------|
| `org_id` | Khóa chính |
| `owner_id` | Chủ sở hữu (`users.user_id`) |
| `status` | `active` \| `suspended` \| `incomplete` |
| `boundary_geojson` | Ranh giới Polygon (PostGIS) |

Trạng thái `incomplete` dùng khi nông trại chưa được vẽ ranh giới.

---

### 4.3. `plots` – Vùng trồng / Lô đất

Một nông trại được chia thành nhiều lô để quản lý mùa vụ riêng biệt.

| Cột | Mô tả |
|-----|-------|
| `code` | Mã lô (VD: `Lô A1`) – duy nhất trong nông trại |
| `boundary_geojson` | Ranh giới của lô |
| `area` | Diện tích |
| `status` | `active` \| `inactive` |

---

### 4.4. `teams` – Tổ công nhân

| Cột | Mô tả |
|-----|-------|
| `team_leader_id` | Tổ trưởng (có thể null khi mới tạo) |
| `name` | Tên tổ – duy nhất trong nông trại |

**Ràng buộc đặc biệt**:
```sql
CREATE UNIQUE INDEX uq_teams_leader ON teams(team_leader_id) 
WHERE team_leader_id IS NOT NULL;
```
→ Một người chỉ được làm Tổ trưởng của **đúng 1 tổ** tại một thời điểm.

---

### 4.5. `crop_catalog` – Danh mục giống cây trồng

Do Admin quản lý. Chứa thông tin chuẩn của giống (tên, số ngày sinh trưởng, hướng dẫn gieo trồng).

---

### 4.6. `crop_care_milestones` – Mốc chăm sóc của giống

Định nghĩa các mốc chăm sóc chuẩn (ví dụ: sau 7 ngày bón phân, sau 30 ngày phun thuốc…).  
Được dùng để tự động sinh lịch nhắc nhở (`reminder_schedules`).

---

### 4.7. `seasons` – Mùa vụ

| Cột | Mô tả |
|-----|-------|
| `plot_id` | Canh tác trên lô nào |
| `crop_id` | Trồng giống nào |
| `planting_date` | Ngày gieo |
| `expected_harvest_date` | Ngày thu hoạch dự kiến |
| `actual_harvest_date` | Ngày thu hoạch thực tế |
| `status` | `growing` \| `ready_to_harvest` \| `completed` |

Index `(plot_id, status)` hỗ trợ kiểm tra nhanh “lô này đang có mùa vụ active không”.

---

### 4.8. `reminder_schedules` – Lịch nhắc nhở

Hệ thống tự tạo dựa trên mốc chăm sóc + ngày thu hoạch dự kiến.  
Job ngầm sẽ đọc bảng này và tạo bản ghi vào `notifications`.

| Trạng thái | Ý nghĩa |
|------------|---------|
| `scheduled` | Đã lên lịch |
| `sent` | Đã gửi thông báo |
| `seen` | Người dùng đã xem |

---

### 4.9. `harvest_batches` – Lô thu hoạch

| Cột | Mô tả |
|-----|-------|
| `batch_code` | Mã định danh duy nhất (sinh sau khi tạo) |
| `qr_url` | Đường dẫn ảnh mã QR |
| `status` | `pending` \| `ready` \| `cancelled` |

`cancelled` = xóa mềm (không xóa cứng vì mã QR có thể đã được bên thứ ba quét).

---

### 4.10. `batch_seasons` – Trung gian Lô thu hoạch ↔ Mùa vụ

Cho phép **1 lô thu hoạch gom sản lượng từ nhiều mùa vụ**.

```text
PRIMARY KEY (batch_id, season_id)
```

Có thêm index theo `season_id` để truy vấn ngược (“mùa vụ này đóng góp vào những lô nào”).

---

### 4.11. `season_team_assignments` – Gán tổ hỗ trợ mùa vụ

Bảng trung gian nhiều-nhiều giữa `seasons` và `teams`.

---

### 4.12. `farming_logs` – Nhật ký canh tác

Bảng quan trọng nhất của tính năng **Farmer QuickLog**.

| Cột | Mô tả |
|-----|-------|
| `user_id` | Người ghi nhật ký |
| `season_id` | Thuộc mùa vụ nào |
| `activity_type` | Loại hoạt động (bón phân, tưới nước…) |
| `content` | Nội dung (có thể từ voice-to-text) |
| `gps` | Tọa độ thực địa (`GEOMETRY(Point)`) |
| `logged_at` | Thời điểm ghi |

---

### 4.13. `log_photos` – Ảnh đính kèm nhật ký

Một nhật ký có thể có nhiều ảnh.

---

### 4.14. `log_notes` – Ghi chú của Tổ trưởng

Khi Tổ trưởng nhận xét / nhắc nhở dưới nhật ký của công nhân.

| Cột | Mô tả |
|-----|-------|
| `leader_id` | `user_id` của Tổ trưởng viết ghi chú |

---

### 4.15. `tasks` – Nhiệm vụ

Tổ trưởng giao việc cho công nhân.

| Cột | Mô tả |
|-----|-------|
| `worker_id` | Công nhân được giao |
| `team_id` | Thuộc tổ nào |
| `plot_id` | Thực hiện tại lô nào |
| `status` | `in_progress` \| `completed` |

---

### 4.16. `error_reports` – Báo cáo lỗi hệ thống

Người dùng gửi lỗi kỹ thuật lên Admin.

| Trạng thái | Ý nghĩa |
|------------|---------|
| `new` | Mới gửi |
| `processing` | Đang xử lý |
| `resolved` | Đã xử lý |
| `rejected` | Từ chối |

---

### 4.17. `notifications` – Thông báo

Bảng **hệ thống tự sinh**. Không có cột `sender_id`.

Ví dụ các loại thông báo:
- `task_assigned` – được giao việc
- `log_note` – có ghi chú mới từ Tổ trưởng
- `reminder` – đến lịch chăm sóc / thu hoạch
- phản hồi báo cáo lỗi…

Index partial:
```sql
CREATE INDEX idx_notifications_user_unread 
ON notifications(user_id, is_read) 
WHERE is_read = FALSE;
```
→ Tối ưu truy vấn “thông báo chưa đọc của tôi”.

---

### 4.18. `system_logs` – Nhật ký hệ thống (Audit trail)

Ghi lại các hành động quan trọng (ai làm gì, lúc nào, kết quả ra sao).  
Phục vụ giám sát và bảo mật.

---

## 5. Xử lý Circular Dependency

Có quan hệ vòng giữa 3 bảng:

```
users.org_id        → organizations
organizations.owner_id → users
users.team_id       → teams
teams.team_leader_id → users
```

**Cách giải quyết trong script**:
1. Tạo bảng `users` trước (cột `org_id`, `team_id` chưa có FK).
2. Tạo `organizations` và `teams`.
3. Dùng `ALTER TABLE` để thêm 2 ràng buộc khóa ngoại sau.

---

## 6. Các Index quan trọng

| Index | Mục đích |
|-------|----------|
| `idx_users_org` / `idx_users_team` | Data isolation theo nông trại / tổ |
| `uq_teams_leader` | Một người chỉ làm Tổ trưởng 1 tổ |
| `idx_seasons_plot_status` | Kiểm tra lô đang có mùa vụ active |
| `idx_reminder_date_status` | Job nhắc nhở chạy theo ngày |
| `idx_notifications_user_unread` | Lấy thông báo chưa đọc nhanh |
| `idx_farming_logs_time` | Sắp xếp nhật ký mới nhất lên đầu |
| `idx_batch_seasons_season` | Truy vấn ngược từ mùa vụ → lô thu hoạch |
| `idx_error_reports_status` | Admin lọc báo cáo theo trạng thái |

---

## 7. Quy ước đặt tên

| Loại | Quy ước |
|------|---------|
| Bảng | `snake_case`, số nhiều (`users`, `tasks`) |
| Khóa chính | `<table>_id` (trừ bảng trung gian dùng composite key) |
| Khóa ngoại | Tên thể hiện vai trò: `worker_id`, `leader_id`, `team_leader_id`, `owner_id` |
| Trạng thái | Dùng tiếng Anh ngắn (`active`, `growing`, `completed`…) |
| Thời gian | `created_at`, `updated_at`, `logged_at`, `submitted_at`… |

> Tất cả `*_id` dạng `worker_id`, `leader_id`, `team_leader_id`… **đều trỏ về `users.user_id`**. Không tồn tại bảng riêng cho Leader hay Worker.

---

**Phiên bản tài liệu**: 1.0  
**Tương thích với**: `init_db.sql` (bản có trigger `updated_at` + các index bổ sung)
