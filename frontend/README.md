# AgriFarm frontend

Mobile và website dùng chung `package.json`, `package-lock.json`, `node_modules`
và file môi trường ở thư mục `frontend`. Chạy tất cả lệnh bên dưới từ thư mục này.

```text
frontend/
├── src/
│   ├── (mobile)/           # Giao diện role và điều hướng Expo
│   ├── (website)/
│   │   ├── index.html      # HTML gốc của web, gọi owner/main_wb.tsx
│   │   ├── owner/          # Màn hình Owner, App, main và AppLayout của web
│   │   └── admin/          # Hiện chỉ có admin.html trống
│   ├── features/           # Chức năng theo role và auth/account
│   │   ├── auth/           # mobile/ và website/: màn hình xác thực
│   │   ├── account/        # mobile/ và website/: màn hình tài khoản
│   │   ├── leader/         # Chức năng riêng, để sẵn
│   │   ├── worker/         # Chức năng riêng, để sẵn
│   │   ├── admin/          # Chức năng riêng, để sẵn
│   │   └── owner/          # Kiểu dữ liệu và xử lý quan hệ nghiệp vụ Owner
│   ├── components/         # common/ và component riêng cho từng role
│   ├── contexts/
│   └── ...
├── assets/
├── app.json               # Expo Router trỏ tới src/(mobile)
├── metro.config.js        # Bundler mobile
├── vite.config.mts        # Bundler website
├── eslint.config.js       # Quy tắc lint riêng cho mobile và website
├── tsconfig.json          # TypeScript mobile
├── tsconfig.web.json      # TypeScript website
├── package.json
└── package-lock.json
```

Code web Owner đã được phân bổ vào các thư mục chung theo trách nhiệm. File web
dùng hậu tố `_wb` trước đuôi file; tên file code trong `src` dùng `_` thay cho `-`.
Không tạo thêm thư mục source trong lần sắp xếp này. Danh sách đầy đủ các file đã
chuyển/đổi tên nằm ở [OWNER_FILE_MOVES.md](OWNER_FILE_MOVES.md).

## Cài đặt và chạy

```powershell
cd D:\AgriTrace_Platform_Group_2\frontend
npm.cmd ci
```

| Lệnh | Chức năng |
| --- | --- |
| `npm run dev` | Khởi động cả web Owner và Admin trước, sau đó chạy mobile với QR trong cùng terminal |
| `npm.cmd run mobile` | Expo Go, cổng 8083 |
| `npm.cmd run android` | Chạy Android native bằng Expo |
| `npm.cmd run ios` | Chạy iOS native trên macOS |
| `npm.cmd run mobile:web` | Xem giao diện Expo trong trình duyệt |
| `npm run web` | Chạy cả web Owner (5173) và Admin (5174/admin.html), kể cả khi Admin còn trống |

`npm start` vẫn chạy Expo. Các lệnh `owner:dev`, `owner:build`, `owner:lint`
được giữ để tương thích. Có thể nhấp đúp `frontend/START_OWNER.cmd` để chạy Owner.
`npm run dev` dùng `start_dev.cjs`; giữ terminal mở để quét QR hoặc nhấn `a` mở
máy ảo Android. Nhấn Ctrl+C để dừng cả hai. Dừng các phiên Expo/Vite cũ trước khi
chạy để tránh trùng cổng 8083/5173/5174.
Admin hiện chỉ là HTML trống; cấu hình này không thêm giao diện hay chức năng.

## Môi trường

Nếu chưa có `.env`, sao chép `.env.example` thành `.env` tại `frontend`.
Giữ cấu hình hiện có của bạn nếu file đã tồn tại.

- `EXPO_PUBLIC_API_BASE_URL`: URL backend mà thiết bị mobile truy cập được.
- `VITE_API_BASE_URL`: mặc định `/api` cho Owner.
- `VITE_API_PROXY_TARGET`: backend mà Vite chuyển tiếp `/api` và `/uploads`,
  mặc định `http://localhost:8000`.

Vite và Expo cùng đọc môi trường ở `frontend`; mỗi bên dùng tiền tố tương ứng.
Không đặt secret/token vào biến `EXPO_PUBLIC_*` hoặc `VITE_*` vì chúng được gửi
tới client. Khởi động lại dev server sau khi thay đổi môi trường.

## Kiểm tra và build

```powershell
npm.cmd run web:lint
npm.cmd run web:build
npm.cmd run mobile:typecheck
npm.cmd run mobile:lint
npm.cmd run mobile:build
```

Output build được tách tại `dist/owner`, `dist/admin`, `dist/mobile`.
Build mobile ở trên xuất bundle Android để kiểm tra; không tạo APK.
Các bài test sau này sẽ đặt chung tại frontend/test khi được bổ sung; hiện chưa tạo thư mục này.

Giữ cấu hình ở `frontend`, không tạo lại package/lock/node_modules riêng trong
source website. [Expo Router hỗ trợ cấu hình root](https://docs.expo.dev/router/reference/src-directory/#custom-directory)
qua plugin; [Vite root](https://vite.dev/config/shared-options.html#root) trỏ tới
thư mục chứa HTML của từng website.
