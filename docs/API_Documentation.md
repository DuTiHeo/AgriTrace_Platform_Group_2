# API Documentation - Phan he San Xuat So & Farmer QuickLog

> Khi backend dang chay, xem chi tiet request/response mau tai Swagger UI: http://localhost:8000/docs
> File nay chi de tom tat + ghi chu trang thai cho ca nhom / mentor de theo doi.

## Base URL
- Local (docker-compose): http://localhost:8000

## Danh sach endpoint (cap nhat dan theo tien do)

| Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|
| GET | /health | Kiem tra Backend + Database da ket noi | Da xong |
| GET | /farms | Danh sach nong trai | Chua lam |
| POST | /farms | Tao nong trai moi | Chua lam |
| POST | /seasons | Tao mua vu | Chua lam |
| POST | /farming-logs | Ghi nhat ky canh tac (QuickLog) | Chua lam |
| POST | /batches | Khoi tao lo thu hoach + sinh batch_code | Chua lam |
