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
