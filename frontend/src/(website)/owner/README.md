# AgriFarm Owner Web

Giao diện React/Vite của Chủ nông trại. Chạy mọi lệnh từ thư mục frontend.

## Vị trí code

- HTML gốc nằm tại src/(website)/index.html, cùng cấp thư mục owner và admin.
- Màn hình Owner, App_wb.tsx, main_wb.tsx và AppLayout_wb.tsx nằm trực tiếp tại src/(website)/owner.
- Đăng nhập/quên mật khẩu: src/features/auth/website.
- Hồ sơ và tài khoản: src/features/account/website.
- Component riêng: src/components/owner.
- Trạng thái nông trại: src/contexts/FarmContext_wb.tsx.
- Dịch vụ API: src/sevices/*_wb.ts.
- Kiểu dữ liệu Owner và xử lý ghép quan hệ: src/features/owner.
- CSS: src/styles/*_wb.css. Màu gốc của app vẫn là src/styles/theme.ts.
- Hàm hình học: src/utils/geometry_wb.ts.
- Logo/ảnh nền: assets/images/icon.png và base.png, dùng chung với app.

Xem [danh sách chuyển và đổi tên đầy đủ](../../../OWNER_FILE_MOVES.md).

## Chạy và kiểm tra

Từ frontend:

```powershell
npm.cmd run owner:dev
npm.cmd run owner:build
npm.cmd run owner:lint
```

Web chạy tại http://127.0.0.1:5173. Có thể nhấp đúp frontend/START_OWNER.cmd.
Biến VITE_API_BASE_URL và VITE_API_PROXY_TARGET vẫn nằm trong frontend/.env hoặc .env.local.
Proxy /api và /uploads được giữ nguyên. Khi triển khai cần SPA fallback và proxy API ở máy chủ.

Lần sắp xếp này chỉ thay đổi vị trí, tên file và đường dẫn. Các chức năng chưa
kết nối API vẫn giữ nguyên trạng thái trước đó. Không bổ sung API, dữ liệu mẫu
hoặc thay đổi giao diện/logic nghiệp vụ.


Các bài test sau này đặt chung trong frontend/test; chưa tạo thư mục test ở lần này.
