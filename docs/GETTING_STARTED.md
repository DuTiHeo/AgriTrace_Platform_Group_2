# Hướng dẫn chạy frontend AgriFarm bằng Expo Go

Hướng dẫn dành cho frontend trong thư mục `frontend/`, với phần riêng cho Windows và macOS. Backend/API cần chạy và có thể truy cập trước khi đăng nhập. Các bước dưới đây không yêu cầu sửa mã backend hay cấu trúc database.

## 1. Cấu hình hiện tại của dự án

| Thành phần | Cấu hình |
| --- | --- |
| Expo | SDK 57 (`expo ~57.0.22`) |
| Chế độ chạy mặc định | Expo Go |
| Lệnh khởi động | `npm start` |
| Script thực tế | `expo start --go --port 8083` |
| Cổng Metro/Expo | `8083` |
| Cổng API trong cấu hình Docker của dự án | `8000` |
| File cấu hình API của frontend | `frontend/.env` |

Dự án đã gỡ chức năng voice to text và các package `expo-speech-recognition`, `expo-dev-client`. Để chạy theo hướng dẫn này, dùng Expo Go và lệnh `npm start`.

## 2. Chuẩn bị

- Cài Node.js bản LTS đáp ứng dependencies hiện tại: Node **22.13.0 trở lên trong nhánh 22**, hoặc **24.3.0 trở lên trong nhánh 24**. Node 18 không đáp ứng yêu cầu của React Native/Metro đang cài trong dự án.
- Cài Expo Go tương thích với **SDK 57** trên điện thoại. Nếu Expo Go báo SDK không tương thích, kiểm tra phiên bản ứng dụng tại [trang tải Expo Go](https://expo.dev/go).
- Có backend đang chạy: có thể trên cùng máy hoặc một máy khác trong mạng.
- Khi dùng kết nối LAN, điện thoại cần truy cập được cả máy chạy Metro và máy chạy backend. Cách thông thường là dùng cùng mạng Wi-Fi; máy tính có thể nối Ethernet vào cùng mạng đó. Tránh mạng Guest có chức năng chặn giao tiếp giữa thiết bị.

Kiểm tra Node/npm:

```sh
node --version
npm --version
```

Nếu backend Docker của dự án đã được cấu hình, chạy từ thư mục gốc:

```sh
docker compose up -d --build
docker compose ps
```

Nếu chưa có `backend/.env`, tham khảo `backend/.env.example` và cấu hình hiện có của nhóm trước khi khởi động backend. Không cần nạp lại dữ liệu mẫu hoặc reset database để chạy frontend.

API trên máy chạy backend:

- Kiểm tra kết nối database: [http://localhost:8000/health](http://localhost:8000/health).
- Tài liệu API: [http://localhost:8000/docs](http://localhost:8000/docs).

Nếu backend chạy trên máy khác, thay `localhost` bằng IP LAN của máy đó.

## 3. Chạy trên Windows với điện thoại thật

### 3.1. Xác định IP LAN của máy chạy backend

Mở PowerShell trên máy chạy backend:

```powershell
ipconfig
```

Tìm `IPv4 Address` của adapter Wi-Fi hoặc Ethernet đang sử dụng. Ví dụ: `192.168.1.53`. Không lấy IP của adapter VPN hoặc mạng ảo Docker nếu điện thoại không truy cập được mạng đó.

### 3.2. Cấu hình frontend/.env

Mở terminal tại thư mục gốc của dự án. Ví dụ với vị trí dự án hiện tại:

```powershell
cd D:\AgriTrace_Platform_Group_2
```

Tạo hoặc mở `frontend/.env` và đặt:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.53:8000
```

Thay `192.168.1.53` bằng **IP của máy chạy backend**, không dùng nguyên IP ví dụ. Nếu backend và frontend chạy trên hai máy khác nhau, IP API vẫn là IP máy backend.

Điện thoại thật không gọi API bằng `localhost`: địa chỉ đó trỏ về chính điện thoại.

### 3.3. Cài dependencies và khởi động

```powershell
cd frontend
npm ci
npm start -- --clear
```

`npm ci` cài theo `package-lock.json`; chạy khi cài dự án lần đầu hoặc sau khi dependencies/lockfile thay đổi. Những lần chạy sau chỉ cần:

```powershell
npm start
```

Lệnh mặc định mở Expo Go trên cổng **8083**. Giữ terminal này chạy trong lúc dùng app.

### 3.4. Mở app

- **Android:** mở Expo Go, chọn quét QR và quét mã trong terminal.
- **iPhone:** dùng Camera quét QR rồi mở liên kết bằng Expo Go. Cho phép truy cập mạng cục bộ nếu iOS hỏi.
- Trên điện thoại, thử mở `http://192.168.1.53:8000/health` trong trình duyệt. Nếu không mở được, xử lý kết nối API trước khi thử đăng nhập.

## 4. Chạy trên macOS

### 4.1. Chuẩn bị môi trường

Cài Node.js/npm theo yêu cầu ở mục 2. Nếu backend chạy bằng Docker trên Mac, cài và mở Docker Desktop phiên bản phù hợp với chip của máy: Apple silicon hoặc Intel.

**Chạy trên điện thoại thật bằng Expo Go không cần Xcode.** Nếu muốn dùng iOS Simulator thì cần Xcode và iOS Simulator, theo mục 4.5.

Mở Terminal và chuyển đến nơi bạn đã lưu repository. Ví dụ:

```sh
cd ~/Projects/AgriTrace_Platform_Group_2
```

Thay đường dẫn trên bằng vị trí repository thực tế trên Mac.

### 4.2. Khởi động hoặc kiểm tra backend

Nếu backend đã cấu hình và chạy trên chính Mac này:

```sh
docker compose up -d --build
docker compose ps
curl http://localhost:8000/health
```

Nếu backend chạy trên máy khác, không cần khởi động backend trên Mac; kiểm tra API qua IP LAN của máy backend:

```sh
curl http://192.168.1.53:8000/health
```

### 4.3. Lấy IP LAN trên Mac và cấu hình API

Nếu backend chạy trên Mac, lấy IP của giao diện mạng đang dùng:

```sh
networksetup -listallhardwareports
```

Tìm giao diện tương ứng với Wi-Fi/Ethernet đang kết nối, ví dụ `en0`, rồi chạy:

```sh
ipconfig getifaddr en0
```

Nếu giao diện thực tế là `en1` hoặc tên khác, thay `en0` bằng tên đó. Cũng có thể xem IP trong **System Settings → Network → kết nối đang dùng → Details → TCP/IP**.

Tạo hoặc sửa `frontend/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.53:8000
```

Thay bằng IP LAN thực tế của **máy backend**. Đây là cấu hình dùng cho Android/iPhone thật, kể cả khi Metro chạy trên Mac và backend chạy trên Windows.

### 4.4. Chạy Expo Go trên điện thoại thật

Từ thư mục gốc repository:

```sh
cd frontend
npm ci
npm start -- --clear
```

Quét QR bằng Expo Go trên Android hoặc Camera trên iPhone. Những lần chạy sau dùng `npm start`. Trên Mac, script vẫn dùng Expo Go và cổng **8083** giống Windows.

### 4.5. Chạy bằng iOS Simulator trên Mac

1. Cài Xcode, mở Xcode để hoàn tất thiết lập ban đầu và cài iOS Simulator cần dùng.
2. Trong Xcode Settings, kiểm tra Command Line Tools đã chọn bản Xcode đang cài.
3. Nếu backend chạy trên cùng Mac, đặt `frontend/.env`:

   ```env
   EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
   ```

   Nếu backend chạy trên máy khác, tiếp tục dùng IP LAN của máy backend.

4. Từ thư mục `frontend`, chạy:

   ```sh
   npm start -- --clear
   ```

5. Nhấn **i** trong terminal Expo để mở app bằng Expo Go trên iOS Simulator. Phiên bản Expo Go trong Simulator cũng cần tương thích SDK 57.

`npm run ios` hiện chạy `expo run:ios`, là lệnh build native. Để chạy bằng Expo Go trong Simulator, dùng `npm start` rồi nhấn **i**. Tài liệu thiết lập: [Expo – iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/).

Nếu muốn kiểm tra chụp ảnh minh chứng, dùng điện thoại thật vì iOS Simulator không có camera vật lý.

## 5. Chọn địa chỉ API theo thiết bị

| Nơi chạy app | Backend ở đâu | Giá trị API ví dụ |
| --- | --- | --- |
| Android/iPhone thật | Máy tính trong cùng mạng | `http://<IP_LAN_MAY_BACKEND>:8000` |
| iOS Simulator | Cùng Mac | `http://127.0.0.1:8000` |
| iOS Simulator | Máy khác | `http://<IP_LAN_MAY_BACKEND>:8000` |
| Android Emulator mặc định của Android Studio | Cùng máy chạy emulator | `http://10.0.2.2:8000` |
| Android Emulator | Máy backend khác | `http://<IP_LAN_MAY_BACKEND>:8000` |

Khi chuyển từ Simulator sang điện thoại thật, nhớ đổi API từ `127.0.0.1` về IP LAN rồi khởi động lại Metro.

## 6. Các lệnh dùng thường xuyên

Chạy trong thư mục `frontend`:

```sh
npm start
```

Khởi động lại và xóa cache, đặc biệt sau khi thay đổi `.env`:

```sh
npm start -- --clear
```

Kiểm tra TypeScript:

```sh
npx tsc --noEmit
```

Kiểm tra lint:

```sh
npm run lint
```

Dừng Metro bằng **Ctrl+C** trước khi khởi động phiên mới.

Có thể nhấn **w** để mở bản web từ terminal Expo. Camera, GPS và hành vi bàn phím nên được kiểm tra trên thiết bị mobile; bản web còn phụ thuộc việc API cho phép origin của trình duyệt.

## 7. Xử lý lỗi thường gặp

### 7.1. Cổng 8083 đang được sử dụng

Dừng terminal Metro cũ bằng **Ctrl+C**, rồi chạy lại `npm start`. Để xác định tiến trình đang giữ cổng:

Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 8083 -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess
```

macOS:

```sh
lsof -nP -iTCP:8083 -sTCP:LISTEN
```

Nếu cần chạy đồng thời một phiên khác, dùng cổng riêng:

```sh
npx expo start --go --port 8084 --clear
```

Cổng `8083` là cổng Metro; API vẫn dùng `8000`. Không đổi URL API thành cổng Metro.

### 7.2. Không kết nối được API / không đăng nhập được

- Kiểm tra `frontend/.env` có đúng IP của máy backend và cổng `8000`.
- Thử mở `/health` từ trình duyệt điện thoại.
- Kiểm tra backend đang chạy. Nếu dùng Docker: `docker compose ps` và `docker compose logs -f backend`.
- Kiểm tra thiết bị có thể giao tiếp trong mạng LAN, không bị Guest Wi-Fi/VPN chặn.
- IP LAN có thể thay đổi khi đổi mạng hoặc router cấp lại địa chỉ. Lấy lại IP, cập nhật `.env`, rồi chạy `npm start -- --clear`.

### 7.3. Firewall chặn kết nối

**Windows:** cho phép Node.js trên mạng Private. Nếu cần thêm quy tắc cho mạng phát triển, chạy PowerShell với quyền Administrator:

```powershell
New-NetFirewallRule -DisplayName "AgriFarm Expo 8083" -Direction Inbound -LocalPort 8083 -Protocol TCP -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "AgriFarm API 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Private
```

Quy tắc API đặt trên máy chạy backend; quy tắc Expo đặt trên máy chạy Metro.

**macOS:** kiểm tra **System Settings → Network → Firewall → Options** và cho phép kết nối đến Node.js/Docker khi hệ thống hỏi. Trên iPhone, kiểm tra quyền **Local Network** của Expo Go trong Settings.

### 7.4. QR không mở được app qua LAN

Kiểm tra kết nối đến máy chạy Metro và firewall cổng `8083`. Có thể thử tunnel cho Metro:

```sh
npm start -- --tunnel
```

Expo CLI có thể yêu cầu cài công cụ tunnel. **Tunnel Metro không mở tunnel cho backend**: điện thoại vẫn cần truy cập được địa chỉ API trong `.env`. Xem [tài liệu Expo CLI](https://docs.expo.dev/more/expo-cli/).

### 7.5. Expo Go báo SDK không tương thích

Dự án dùng SDK 57. Kiểm tra phiên bản Expo Go phù hợp với thiết bị trên [trang tải Expo Go](https://expo.dev/go), rồi mở lại dự án. Xóa cache không giải quyết được việc lệch SDK.

### 7.6. npm ci báo package.json và lockfile không khớp

Kiểm tra đã lấy đủ `frontend/package.json` và `frontend/package-lock.json` từ cùng phiên bản code. Nếu đang chủ động thay đổi dependencies, dùng `npm install` để cập nhật lockfile và rà thay đổi trước khi commit; nếu chỉ chạy dự án, ưu tiên dùng lockfile của nhóm.

## 8. Tài liệu tham khảo

- [Expo – Tạo dự án và yêu cầu môi trường](https://docs.expo.dev/get-started/create-a-project/).
- [Expo – Bắt đầu chạy app, kết nối thiết bị và phím tắt](https://docs.expo.dev/get-started/start-developing/).
- [Expo – iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/).
- [Expo CLI – chế độ Expo Go, cổng và kết nối mạng](https://docs.expo.dev/more/expo-cli/).
