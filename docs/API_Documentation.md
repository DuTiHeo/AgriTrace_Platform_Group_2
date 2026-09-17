# API Documentation - Phan he San Xuat So & Farmer QuickLog

> Khi backend dang chay, xem chi tiet request/response mau tai Swagger UI: http://localhost:8000/docs
> File nay chi de tom tat + ghi chu trang thai cho ca nhom / mentor de theo doi.

## Base URL
- Local (docker-compose): http://localhost:8000

## Danh sach endpoint (cap nhat dan theo tien do)

| Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|
| GET | /health | Kiem tra Backend + Database da ket noi | Da xong |
| POST | /auth/login | Đăng nhập và phân quyền | Đã xong |
| POST | /auth/logout | Đăng xuất và thêm token vào token_blacklist | Đã xong |
| POST | /auth/me | Lấy thông tin của người dùng hiện tại | Đã xong |
