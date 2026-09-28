# HƯỚNG DẪN KHỞI CHẠY DỰ ÁN AGRITRACE
*(Tích hợp Docker Backend + Cấu hình IP LAN + Frontend Expo Go)*

---

## 1. YÊU CẦU TRƯỚC KHI CHẠY

- **Docker Desktop** đã được cài đặt và đang chạy (biểu tượng cá voi màu xanh).
- **Node.js** (khuyến nghị bản LTS v18 trở lên).
- **Điện thoại di động** đã cài ứng dụng **Expo Go** (tải trên App Store hoặc Google Play).
- **Điều kiện mạng:** Máy tính và điện thoại **BẮT BUỘC** phải kết nối chung một mạng Wi-Fi (không bật 4G trên điện thoại).

---

## 2. BƯỚC 1: KHỞI TẠO FILE CẤU HÌNH BACKEND (.ENV)

Trong thư mục `backend/`, cần có file `.env` để backend đọc các thông số kết nối Database và mã hóa JWT.

1. Tạo file `backend/.env` (nếu chưa có).
2. Dán nội dung sau vào file `backend/.env`:

```env
DATABASE_URL=postgresql://agritrace:agritrace_pass@db:5432/agritrace_farm
PASSWORD_RESET_DEMO_ENABLED=true
SECRET_KEY=agritrace_secret_key_demo_jwt_2026_super_secure_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=240
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCKOUT_MINUTES=15
```

---

## 3. BƯỚC 2: KHỞI ĐỘNG DOCKER (DATABASE + BACKEND)

Mở terminal (PowerShell hoặc CMD) tại thư mục gốc của dự án (`AgriTrace_Platform_Group_2`):

```powershell
docker-compose up -d --build
```

### Các lệnh kiểm tra:

Kiểm tra trạng thái container:

```powershell
docker-compose ps
```

(Cần thấy cả 2 dịch vụ `agritrace_db` và `agritrace_backend` ở trạng thái `Up`)

Xem log Backend nếu cần gỡ lỗi:

```powershell
docker-compose logs -f backend
```

Kiểm tra trên trình duyệt máy tính:

- Swagger UI: http://localhost:8000/docs
- Endpoint kiểm tra sức khỏe: http://localhost:8000/health

(Tùy chọn) Nạp dữ liệu mẫu ban đầu vào Database:

```powershell
docker exec -i agritrace_db psql -U agritrace -d agritrace_farm < database/sample_data.sql
```

---

## 4. BƯỚC 3: LẤY ĐỊA CHỈ IP LAN CỦA MÁY TÍNH

Do Expo Go trên điện thoại chạy độc lập, điện thoại không thể gọi API qua `localhost` mà phải gọi qua địa chỉ IP LAN của máy tính trong mạng Wi-Fi nội bộ.

Mở PowerShell hoặc CMD và gõ:

```powershell
ipconfig
```

Cuộn tìm card mạng đang dùng:

- Nếu dùng Wi-Fi: Tìm mục `Wireless LAN adapter Wi-Fi`
- Nếu cắm dây: Tìm mục `Ethernet adapter Ethernet`

Tìm dòng `IPv4 Address`, ví dụ:

```text
IPv4 Address. . . . . . . . . . . : 192.168.1.53
```

(Ghi nhớ dãy số IP này của bạn, ví dụ: `192.168.1.53`)

---

## 5. BƯỚC 4: ĐỔI ĐỊA CHỈ IP LAN TRONG FRONTEND

Tự tạo file `frontend/.env` và dán dòng EXPO_PUBLIC_API_BASE_URL=http://<IP_LAN_CỦA_BẠN>:8000

Sau đó:

Mở file `frontend/.env` và cập nhật lại biến `EXPO_PUBLIC_API_BASE_URL` với IP vừa tìm được:

```env
EXPO_PUBLIC_API_BASE_URL=http://<IP_LAN_CỦA_BẠN>:8000
```

Ví dụ thực tế:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.53:8000
```

(Lưu ý: Không thêm dấu gạch chéo `/` ở cuối)

---

## 6. BƯỚC 5: KHỞI ĐỘNG FRONTEND (REACT NATIVE / EXPO)

Mở một cửa sổ Terminal mới:

1. Di chuyển vào thư mục frontend:

```powershell
cd frontend
```

2. Cài đặt các gói phụ thuộc (nếu chưa cài):

```powershell
npm install
```

3. Khởi động Expo Server với cờ xóa cache `-c` (bắt buộc để hệ thống nhận IP LAN mới):

```powershell
npx expo start -c
```

### Kết nối ứng dụng:

- **Trên điện thoại Android:** Mở ứng dụng Expo Go -> Chọn `Scan QR code` -> Quét mã QR trên terminal.
- **Trên điện thoại iOS (iPhone):** Mở ứng dụng Camera mặc định -> Quét mã QR -> Bấm thông báo vàng mở bằng Expo Go.
- **Trên Trình duyệt Web** (nếu muốn xem nhanh trên máy): Nhấn phím `w` trong terminal.

---

## 7. XỬ LÝ LỖI THƯỜNG GẶP (TROUBLESHOOTING)

### Lỗi 1: Điện thoại báo `Network request failed` hoặc không đăng nhập được

- **Mở cổng Firewall của Windows:** Tường lửa Windows thường chặn kết nối từ thiết bị ngoài vào cổng 8000. Mở PowerShell với quyền Administrator và chạy lệnh:

```powershell
New-NetFirewallRule -DisplayName "AgriTrace Backend Port 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

- **Kiểm tra Wi-Fi:** Đảm bảo điện thoại không bật 4G/5G và không kết nối vào mạng Wi-Fi khách (Guest Wi-Fi chặn giao tiếp nội bộ).
- **Kiểm tra lại IP:** Khởi động lại router có thể làm thay đổi IP LAN, hãy chạy lại `ipconfig` để kiểm tra.

### Lỗi 2: Docker báo lỗi xung đột cổng 5432

Nếu máy đã cài PostgreSQL trước đó, cổng 5432 bị chiếm dụng.

**Xử lý:** Nhấn `Windows + R`, gõ `services.msc`, tìm dịch vụ `postgresql-x64-...`, chuột phải chọn `Stop`, sau đó chạy lại lệnh Docker.

### Lỗi 3: Muốn reset sạch toàn bộ Database và nạp lại từ đầu

```powershell
docker-compose down -v
docker-compose up -d --build
docker exec -i agritrace_db psql -U agritrace -d agritrace_farm < database/sample_data.sql
```