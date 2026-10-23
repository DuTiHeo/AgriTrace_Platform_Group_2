# Tài liệu cơ sở dữ liệu AgriTrace

Tài liệu này mô tả schema được khai báo trong [`init_db.sql`](./init_db.sql). Sơ đồ quan hệ: [`erd_farmer_quicklog_full.html`](./erd_farmer_quicklog_full.html).

> **Công nghệ:** PostgreSQL, PostGIS và `uuid-ossp`.

## 1. Tổng quan

Schema gồm 19 bảng, quản lý tài khoản, nông trại, lô đất, tổ công nhân, mùa vụ, nhật ký canh tác, nhiệm vụ, báo cáo lỗi, thông báo và audit log.

| Vai trò | Giá trị `users.role` | Mô tả |
|---|---|---|
| Chủ sở hữu | `owner` | Có thể sở hữu nhiều nông trại |
| Tổ trưởng | `leader` | Điều phối tổ, giao việc và ghi nhận xét |
| Công nhân | `worker` | Ghi nhật ký canh tác và nhận nhiệm vụ |
| Quản trị viên | `admin` | Quản trị hệ thống và danh mục |

Các nguyên tắc chính:

- Khóa chính dùng UUID; các cột có `DEFAULT uuid_generate_v4()` được sinh tự động.
- `users.org_id` và `users.team_id` có thể `NULL`; thành viên tổ và tổ trưởng được lưu riêng bằng `team_id` và `teams.team_leader_id`.
- Dữ liệu không gian dùng PostGIS với SRID 4326 cho ranh giới Polygon và tọa độ Point.
- Một số bảng có trạng thái để lưu trạng thái nghiệp vụ hoặc hủy mềm; schema không áp dụng xóa mềm cho mọi bảng.
- Các bảng có `updated_at` được cập nhật tự động bằng trigger khi chạy `UPDATE`.

## 2. Extensions và hàm trigger

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

`uuid-ossp` cung cấp `uuid_generate_v4()`. `postgis` cung cấp kiểu `GEOMETRY`.

Hàm `trg_set_updated_at()` đặt `NEW.updated_at = CURRENT_TIMESTAMP` trước khi cập nhật bản ghi. Các trigger dùng hàm này được gắn vào:

`users`, `organizations`, `plots`, `teams`, `crop_catalog`, `seasons`, `harvest_batches`, `tasks`, `error_reports`.

## 3. Bảng và cột

Ký hiệu `PK`, `FK`, `UNIQUE` lần lượt là khóa chính, khóa ngoại và tính duy nhất. Cột không ghi `NOT NULL` trong SQL có thể nhận `NULL`, kể cả khi có `DEFAULT`.

### 3.1. `users` – Người dùng

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `user_id` | UUID | PK, mặc định sinh UUID |
| `full_name` | VARCHAR(150) | NOT NULL |
| `phone` | VARCHAR(20) | NOT NULL, UNIQUE; dùng đăng nhập |
| `national_id` | VARCHAR(20) | Có thể NULL; unique khi khác NULL |
| `date_of_birth` | DATE | Có thể NULL |
| `address` | TEXT | Có thể NULL |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `role` | VARCHAR(20) | NOT NULL; `owner`, `leader`, `worker`, `admin` |
| `status` | VARCHAR(20) | NOT NULL, mặc định `active`; `active`, `locked` |
| `org_id` | UUID | FK đến `organizations.org_id`; xóa nông trại thì đặt NULL |
| `team_id` | UUID | FK đến `teams.team_id`; xóa tổ thì đặt NULL |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

`chk_owner_no_single_org` yêu cầu `org_id` của user có role `owner` phải là NULL; quyền sở hữu được lưu ở `organizations.owner_id`. `national_id` có unique index có điều kiện, chỉ áp dụng cho giá trị khác NULL.

### 3.2. `organizations` – Nông trại

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `org_id` | UUID | PK, mặc định sinh UUID |
| `name` | VARCHAR(200) | NOT NULL |
| `address` | TEXT | Có thể NULL |
| `owner_id` | UUID | FK đến `users.user_id`, NOT NULL |
| `status` | VARCHAR(20) | NOT NULL, mặc định `incomplete`; `active`, `suspended`, `incomplete` |
| `boundary_geojson` | GEOMETRY(Polygon, 4326) | Ranh giới nông trại, có thể NULL |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

`incomplete` biểu thị nông trại chưa hoàn thiện thông tin ranh giới. `owner_id` có index.

### 3.3. `plots` – Vùng trồng / lô đất

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `plot_id` | UUID | PK, mặc định sinh UUID |
| `org_id` | UUID | FK đến `organizations.org_id`, NOT NULL; xóa nông trại thì xóa lô |
| `code` | VARCHAR(50) | NOT NULL; duy nhất trong cùng nông trại |
| `boundary_geojson` | GEOMETRY(Polygon, 4326) | Ranh giới lô, có thể NULL |
| `area` | DOUBLE PRECISION | Diện tích, có thể NULL |
| `status` | VARCHAR(20) | NOT NULL, mặc định `active`; `active`, `inactive` |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

### 3.4. `teams` – Tổ công nhân

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `team_id` | UUID | PK, mặc định sinh UUID |
| `org_id` | UUID | FK đến `organizations.org_id`, NOT NULL; xóa nông trại thì xóa tổ |
| `name` | VARCHAR(100) | NOT NULL; duy nhất trong cùng nông trại |
| `team_leader_id` | UUID | FK đến `users.user_id`, có thể NULL |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

Unique index có điều kiện trên `team_leader_id` bảo đảm một user không đồng thời làm tổ trưởng của nhiều tổ.

### 3.5. `crop_catalog` – Danh mục giống cây trồng

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `crop_id` | UUID | PK, mặc định sinh UUID |
| `name` | VARCHAR(150) | NOT NULL |
| `growth_days` | INTEGER | NOT NULL, lớn hơn 0 |
| `planting_guide` | TEXT | Hướng dẫn gieo trồng, có thể NULL |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

### 3.6. `crop_care_milestones` – Mốc chăm sóc

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `milestone_id` | UUID | PK, mặc định sinh UUID |
| `crop_id` | UUID | FK đến `crop_catalog.crop_id`, NOT NULL; xóa giống cây thì xóa mốc |
| `days_after_planting` | INTEGER | NOT NULL, lớn hơn hoặc bằng 0 |
| `task_type` | VARCHAR(50) | NOT NULL |
| `description` | TEXT | Có thể NULL |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |

`crop_id` có index để tra cứu mốc theo giống cây.

### 3.7. `seasons` – Mùa vụ

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `season_id` | UUID | PK, mặc định sinh UUID |
| `plot_id` | UUID | FK đến `plots.plot_id`, NOT NULL |
| `crop_id` | UUID | FK đến `crop_catalog.crop_id`, NOT NULL |
| `planting_date` | DATE | NOT NULL |
| `expected_harvest_date` | DATE | Có thể NULL |
| `actual_harvest_date` | DATE | Có thể NULL |
| `status` | VARCHAR(30) | NOT NULL, mặc định `growing`; `growing`, `ready_to_harvest`, `completed` |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

Index trên `(plot_id, status)` hỗ trợ truy vấn mùa vụ theo lô và trạng thái; `crop_id` cũng có index.

### 3.8. `reminder_schedules` – Lịch nhắc nhở

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `reminder_id` | UUID | PK, mặc định sinh UUID |
| `season_id` | UUID | FK đến `seasons.season_id`, NOT NULL; xóa mùa vụ thì xóa lịch nhắc |
| `milestone_type` | VARCHAR(50) | NOT NULL |
| `remind_date` | DATE | NOT NULL |
| `channel` | VARCHAR(20) | Có thể NULL; mặc định `push` |
| `status` | VARCHAR(20) | NOT NULL, mặc định `scheduled`; `scheduled`, `sent`, `seen` |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |

Index trên `(remind_date, status)` hỗ trợ lọc lịch nhắc theo ngày và trạng thái.

### 3.9. `harvest_batches` – Lô thu hoạch

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `batch_id` | UUID | PK, mặc định sinh UUID |
| `batch_code` | VARCHAR(100) | Có thể NULL, UNIQUE |
| `org_id` | UUID | FK đến `organizations.org_id`, NOT NULL |
| `quantity` | DOUBLE PRECISION | Có thể NULL |
| `harvest_date` | DATE | Có thể NULL |
| `status` | VARCHAR(30) | NOT NULL, mặc định `pending`; `pending`, `ready`, `cancelled` |
| `qr_url` | VARCHAR(500) | URL mã QR, có thể NULL |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

`batch_code` có thể để trống khi tạo lô và được sinh sau đó. `cancelled` là trạng thái hủy được lưu trong bản ghi. `org_id` có index.

### 3.10. `batch_seasons` – Liên kết lô thu hoạch và mùa vụ

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `batch_id` | UUID | PK ghép, FK đến `harvest_batches.batch_id`, NOT NULL; xóa lô thì xóa liên kết |
| `season_id` | UUID | PK ghép, FK đến `seasons.season_id`, NOT NULL |
| `contributed_quantity` | DOUBLE PRECISION | Sản lượng đóng góp, có thể NULL |
| `status` | VARCHAR(20) | NOT NULL, mặc định `active`; `active`, `cancelled` |

Khóa chính ghép `(batch_id, season_id)` cho phép một lô thu hoạch liên kết nhiều mùa vụ. Index riêng trên `season_id` hỗ trợ truy vấn ngược từ mùa vụ.

### 3.11. `season_team_assignments` – Tổ hỗ trợ mùa vụ

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `season_id` | UUID | PK ghép, FK đến `seasons.season_id`, NOT NULL; xóa mùa vụ thì xóa liên kết |
| `team_id` | UUID | PK ghép, FK đến `teams.team_id`, NOT NULL |
| `start_date` | DATE | Ngày bắt đầu hỗ trợ, có thể NULL |
| `end_date` | DATE | Ngày kết thúc hỗ trợ, có thể NULL |

Khóa chính ghép `(season_id, team_id)` biểu diễn quan hệ nhiều-nhiều. `team_id` có index để tra cứu các mùa vụ một tổ đang hỗ trợ.

### 3.12. `farming_logs` – Nhật ký canh tác

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `log_id` | UUID | PK, mặc định sinh UUID |
| `season_id` | UUID | FK đến `seasons.season_id`, NOT NULL |
| `user_id` | UUID | FK đến `users.user_id`, NOT NULL |
| `team_id` | UUID | FK đến `teams.team_id`, có thể NULL; lưu snapshot tổ lúc tạo nhật ký |
| `activity_type` | VARCHAR(50) | Loại hoạt động, có thể NULL |
| `content` | TEXT | Nội dung, có thể NULL |
| `gps` | GEOMETRY(Point, 4326) | Vị trí GPS, có thể NULL |
| `logged_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |

Các index hỗ trợ tra cứu theo mùa vụ, người ghi, tổ và thời gian ghi.

### 3.13. `log_photos` – Ảnh nhật ký

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `photo_id` | UUID | PK, mặc định sinh UUID |
| `log_id` | UUID | FK đến `farming_logs.log_id`, NOT NULL; xóa nhật ký thì xóa ảnh |
| `url` | VARCHAR(500) | NOT NULL |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |

### 3.14. `log_notes` – Ghi chú nhật ký

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `note_id` | UUID | PK, mặc định sinh UUID |
| `log_id` | UUID | FK đến `farming_logs.log_id`, NOT NULL; xóa nhật ký thì xóa ghi chú |
| `leader_id` | UUID | FK đến `users.user_id`, NOT NULL |
| `content` | TEXT | NOT NULL |
| `resolved` | BOOLEAN | NOT NULL, mặc định `FALSE` |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |

### 3.15. `tasks` – Nhiệm vụ

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `task_id` | UUID | PK, mặc định sinh UUID |
| `team_id` | UUID | FK đến `teams.team_id`, NOT NULL |
| `worker_id` | UUID | FK đến `users.user_id`, NOT NULL |
| `plot_id` | UUID | FK đến `plots.plot_id`, NOT NULL |
| `content` | TEXT | NOT NULL |
| `start_at` | TIMESTAMPTZ | NOT NULL |
| `due_at` | TIMESTAMPTZ | NOT NULL; phải sau `start_at` |
| `status` | VARCHAR(20) | NOT NULL, mặc định `in_progress`; `in_progress`, `completed`, `cancelled` |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

`chk_tasks_time_range` yêu cầu `due_at > start_at`. Có index trên `worker_id`, `team_id` và `plot_id`.

### 3.16. `error_reports` – Báo cáo lỗi

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `report_id` | UUID | PK, mặc định sinh UUID |
| `user_id` | UUID | FK đến `users.user_id`, NOT NULL |
| `org_id` | UUID | FK đến `organizations.org_id`, NOT NULL |
| `error_type` | VARCHAR(50) | Có thể NULL |
| `description` | TEXT | NOT NULL |
| `screenshot_url` | VARCHAR(500) | Có thể NULL |
| `status` | VARCHAR(20) | NOT NULL, mặc định `new`; `new`, `processing`, `resolved`, `rejected` |
| `admin_response` | TEXT | Có thể NULL |
| `submitted_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại; tự cập nhật bằng trigger |

Các index hỗ trợ lọc theo trạng thái, nông trại và người gửi.

### 3.17. `notifications` – Thông báo

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `notification_id` | UUID | PK, mặc định sinh UUID |
| `user_id` | UUID | FK đến `users.user_id`, NOT NULL; xóa user thì xóa thông báo |
| `content` | TEXT | NOT NULL |
| `type` | VARCHAR(50) | Có thể NULL |
| `is_read` | BOOLEAN | NOT NULL, mặc định `FALSE` |
| `created_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |

Không có cột `sender_id`. Partial index `idx_notifications_user_unread` áp dụng cho thông báo có `is_read = FALSE`.

### 3.18. `system_logs` – Nhật ký hệ thống

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `log_id` | UUID | PK, mặc định sinh UUID |
| `actor_id` | UUID | FK đến `users.user_id`, có thể NULL |
| `target_type` | VARCHAR(50) | Loại đối tượng bị tác động, có thể NULL |
| `target_id` | UUID | ID đối tượng bị tác động, không có FK |
| `action` | VARCHAR(50) | NOT NULL |
| `performed_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |
| `result` | VARCHAR(20) | Có thể NULL, mặc định `success` |

`actor_id` có index; `performed_at` có index giảm dần để tra cứu log mới nhất.

### 3.19. `token_blacklist` – Token đã thu hồi

| Cột | Kiểu | Ràng buộc / ý nghĩa |
|---|---|---|
| `jti` | UUID | PK |
| `user_id` | UUID | FK đến `users.user_id`, NOT NULL; xóa user thì xóa token |
| `expires_at` | TIMESTAMP WITH TIME ZONE | NOT NULL; thời điểm token hết hạn |
| `revoked_at` | TIMESTAMP WITH TIME ZONE | Mặc định thời điểm hiện tại |

Index `idx_token_blacklist_expires` hỗ trợ tìm các bản ghi token đã hết hạn.

## 4. Quan hệ và xóa dữ liệu

- `users` sở hữu `organizations` qua `organizations.owner_id`. Một owner có thể sở hữu nhiều nông trại.
- `users.org_id` là liên kết tổ chức tùy chọn; `users.team_id` là liên kết tổ tùy chọn.
- `teams.team_leader_id` tham chiếu user làm tổ trưởng; unique index có điều kiện giới hạn mỗi user làm tổ trưởng tối đa một tổ.
- `organizations` chứa `plots`, `teams`, `harvest_batches` và `error_reports`.
- `plots` và `crop_catalog` được tham chiếu bởi `seasons`.
- `seasons` và `harvest_batches` có quan hệ nhiều-nhiều qua `batch_seasons`.
- `seasons` và `teams` có quan hệ nhiều-nhiều qua `season_team_assignments`.
- `farming_logs` lưu `team_id` snapshot có thể NULL, bên cạnh user và mùa vụ liên quan.
- `system_logs.target_id` là ID tham chiếu dạng dữ liệu, không khai báo FK.

Các FK có `ON DELETE` trong script:

| Liên kết | Hành vi |
|---|---|
| `plots.org_id`, `teams.org_id` | Xóa nông trại thì xóa lô và tổ |
| `users.org_id`, `users.team_id` | Xóa nông trại hoặc tổ thì đặt cột liên kết thành NULL |
| `crop_care_milestones.crop_id` | Xóa giống thì xóa các mốc chăm sóc |
| `reminder_schedules.season_id`, `season_team_assignments.season_id` | Xóa mùa vụ thì xóa lịch nhắc và liên kết tổ hỗ trợ |
| `batch_seasons.batch_id` | Xóa lô thu hoạch thì xóa liên kết mùa vụ |
| `log_photos.log_id`, `log_notes.log_id` | Xóa nhật ký thì xóa ảnh và ghi chú |
| `notifications.user_id`, `token_blacklist.user_id` | Xóa user thì xóa thông báo và token đã thu hồi |

Các FK khác không khai báo hành vi cascade/set null trong SQL; PostgreSQL sẽ từ chối xóa bản ghi cha nếu còn bản ghi con tham chiếu.

## 5. Quan hệ vòng giữa các bảng

Schema có các liên kết vòng:

```text
organizations.owner_id       -> users.user_id
users.org_id                 -> organizations.org_id
teams.team_leader_id         -> users.user_id
users.team_id                -> teams.team_id
```

Để tạo schema theo thứ tự hợp lệ, script tạo `users` trước mà chưa khai báo FK cho `org_id` và `team_id`; sau khi tạo `organizations` và `teams`, script thêm hai FK này bằng `ALTER TABLE`.

## 6. Index và unique index

| Index | Bảng / cột | Mục đích |
|---|---|---|
| `uq_users_national_id` | `users(national_id)` khi khác NULL | CCCD không trùng |
| `idx_users_org`, `idx_users_team` | `users(org_id)`, `users(team_id)` | Lọc user theo nông trại hoặc tổ |
| `idx_organizations_owner` | `organizations(owner_id)` | Tra cứu nông trại theo chủ sở hữu |
| `uq_plots_org_code` | `plots(org_id, code)` | Mã lô duy nhất trong nông trại |
| `uq_teams_org_name` | `teams(org_id, name)` | Tên tổ duy nhất trong nông trại |
| `uq_teams_leader` | `teams(team_leader_id)` khi khác NULL | Một user tối đa là tổ trưởng một tổ |
| `idx_crop_care_milestones_crop` | `crop_care_milestones(crop_id)` | Tra cứu mốc theo giống |
| `idx_seasons_plot_status`, `idx_seasons_crop` | `seasons(plot_id, status)`, `seasons(crop_id)` | Truy vấn mùa vụ |
| `idx_reminder_date_status` | `reminder_schedules(remind_date, status)` | Lọc lịch nhắc |
| `idx_harvest_batches_org` | `harvest_batches(org_id)` | Tra cứu lô thu hoạch theo nông trại |
| `idx_batch_seasons_season` | `batch_seasons(season_id)` | Tra cứu ngược từ mùa vụ |
| `idx_season_team_assignments_team` | `season_team_assignments(team_id)` | Tra cứu mùa vụ theo tổ |
| `idx_farming_logs_season`, `idx_farming_logs_user`, `idx_farming_logs_team` | `farming_logs` | Tra cứu nhật ký theo mùa vụ, user hoặc tổ |
| `idx_farming_logs_time` | `farming_logs(logged_at DESC)` | Tra cứu nhật ký mới nhất |
| `idx_tasks_worker`, `idx_tasks_team`, `idx_tasks_plot` | `tasks` | Tra cứu nhiệm vụ theo công nhân, tổ hoặc lô |
| `idx_error_reports_status`, `idx_error_reports_org`, `idx_error_reports_user` | `error_reports` | Lọc báo cáo lỗi |
| `idx_notifications_user_unread` | `notifications(user_id, is_read)` khi `is_read = FALSE` | Tra cứu thông báo chưa đọc |
| `idx_system_logs_actor` | `system_logs(actor_id)` | Tra cứu theo người thực hiện |
| `idx_system_logs_time` | `system_logs(performed_at DESC)` | Tra cứu audit log mới nhất |
| `idx_token_blacklist_expires` | `token_blacklist(expires_at)` | Tìm token đã hết hạn |

Các khóa chính và `UNIQUE` constraints cũng tạo index tương ứng theo cơ chế của PostgreSQL.

## 7. Tài liệu liên quan

- Schema SQL: [`init_db.sql`](./init_db.sql)
- ERD: [`erd_farmer_quicklog_full.html`](./erd_farmer_quicklog_full.html)
