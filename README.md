# AgriTrace - Phan he San Xuat So & Farmer QuickLog

Repo dang theo mo hinh **monorepo**: backend (Python/FastAPI) va frontend (React Native/Expo)
nam chung 1 repo de de dong bo khi ghep API, nhung van la 2 ung dung doc lap, chay bang 2 lenh khac nhau.

## Chay Backend + Database (Docker)
```bash
docker-compose up -d
```
- API: http://localhost:8000
- Swagger UI (test API thay Postman): http://localhost:8000/docs
- Kiem tra nhanh: http://localhost:8000/health

Neu sau nay sua schema trong `database/init_db.sql`, script SQL nay se KHONG tu chay lai
(vi Postgres chi doc no khi volume con rong). Trong giai doan dev, xoa volume roi tao lai:
```bash
docker-compose down -v
docker-compose up -d
```
(Luu y: lenh tren xoa het du lieu trong DB - chi dung khi con dang code, khong dung khi da co du lieu that.)

## Chay Frontend (Expo) - chay tren may that, KHONG chay trong Docker
```bash
cd frontend
npm install
npx expo start
```
Quet QR bang app Expo Go tren dien thoai (cung mang wifi voi may tinh) de xem app.

## Cau truc thu muc
Xem chi tiet trong tung thu muc con: `backend/`, `frontend/`, `database/`, `docs/`.
