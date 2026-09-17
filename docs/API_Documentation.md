# API Documentation - Phan he San Xuat So & Farmer QuickLog

> Khi backend dang chay, xem chi tiet request/response mau tai Swagger UI: http://localhost:8000/docs
> File nay chi de tom tat + ghi chu trang thai cho ca nhom / mentor de theo doi.

## Base URL
- Local (docker-compose): http://localhost:8000

## Danh sach endpoint (cap nhat dan theo tien do)

Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|Default| GET | /health | Kiem tra Backend + Database da ket noi | Da xong |
|UC-SH01| POST | /auth/login | Đăng nhập và phân quyền | Đã xong |
|UC-SH01| POST | /auth/logout | Đăng xuất và thêm token vào token_blacklist | Đã xong |
|UC-SH01| POST | failed_login_attempts/locked_until -> cần bổ sung 2 cột vào user | Nhập mật khẩu sai 5 lần -> Tạm khóa | Chưa làm |
|UC-SH02| POST | /auth/change-password |Đổi mật khẩu khi đăng nhập thành công | Đã xong |
|UC-SH02| POST | /auth/forgot-password + OTP |Đổi mật khẩu khi quên mật khẩu| Chưa làm (để đợt 3) |
|Null| GET | /auth/me | Lấy thông tin của người dùng hiện tại | Đã xong |
