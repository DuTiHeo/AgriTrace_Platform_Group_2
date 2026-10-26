---
name: agrifarm-ui
description: Đồng bộ giao diện AgriFarm Owner, Worker và Leader theo màu sắc, nhận diện và quy tắc tương tác của frontend/src. Dùng khi sửa logo, theme, form, ảnh hoặc đánh giá trong dự án AgriTrace; không áp dụng cho dự án khác.
---

# AgriFarm UI

Lấy `frontend/src` làm nguồn tham chiếu cho nhận diện và màu sắc. Áp dụng các quy tắc sau vào đúng phạm vi người dùng yêu cầu; việc dùng skill không mở rộng quyền sửa code sang các ứng dụng khác, backend hay database.

Ràng buộc của công việc giao diện này: **không sửa `backend/`, `database/`, không chạy migration, seed, reset DB hoặc ghi dữ liệu qua API**. Không gộp những việc đó vào chỉnh UI.

Các đường dẫn trong skill tính từ gốc repository `AgriTrace_Platform_Group_2`.

## Nguồn chuẩn

- Màu chính: `frontend/src/styles/theme.ts` (`colors`).
- Vai trò màu, kích thước và kiểu chữ mobile: `frontend/src/styles/role-styles.ts`, `frontend/src/styles/navigation.ts`.
- Owner: `frontend/owner/src/styles/mobile-palette.css` là bản CSS sinh từ palette mobile. Không sửa tay; chạy `npm run theme:sync` trong `frontend/owner` khi palette nguồn được thay đổi theo yêu cầu.
- Màu ngữ nghĩa và trạng thái web: `frontend/owner/src/styles/theme.css`. Chọn token theo vai trò, không thêm mã màu riêng ở từng trang.
- Đọc [references/ui-rules.md](references/ui-rules.md) khi sửa thành phần lặp lại, ảnh, báo cáo hoặc đánh giá.

## Nhận diện

- Thương hiệu hiển thị: **AgriFarm**. Không đưa tên cũ Farmer QuickLog trở lại UI. Không đổi các storage key/API identifier cũ chỉ để đồng bộ tên.
- Logo nguồn: `frontend/assets/images/icon.png`; ảnh nền nguồn: `frontend/assets/images/base.png`.
- Owner dùng bản sao `frontend/owner/public/branding/agrifarm.png` và `login-background.png`. Giữ byte ảnh nguồn, tỉ lệ và `object-fit: contain` cho logo; không tạo logo thay thế khi chưa được yêu cầu.
- Dùng logo thống nhất ở đăng nhập, quên mật khẩu, sidebar dùng chung, trang truy xuất và favicon. Ảnh nền đăng nhập dùng `cover` và lớp phủ tối để đọc được chữ.
- Nếu người dùng giới hạn sửa trong Owner, chỉ đọc asset nguồn rồi cập nhật bản sao Owner.

## Màu và trải nghiệm

- Nền trang, nền card, tiêu đề, chữ, đường viền, input và nút dùng token tương ứng. Màu chủ đạo xanh lá, không gộp lỗi/cảnh báo/thông tin thành xanh lá.
- Trên nền sáng, dùng token `*-text` có tương phản phù hợp cho chữ nhỏ. `--agri-muted` của mobile dành cho phần phụ/disabled; Owner dùng `--agri-muted-strong` cho nội dung phụ cần đọc.
- Nút chính dùng `--agri-primary` với chữ trắng; active/filter nhẹ dùng `--agri-primary-soft` với chữ đậm. Hover và keyboard focus cần phân biệt được trạng thái; giữ disabled thật.
- Thông tin/xếp loại dữ liệu có thể dùng bộ info/purple riêng của web trong `theme.css`; giữ nhãn/icon để không phụ thuộc màu duy nhất. Giữ màu tương phản của QR và các vùng bản đồ.
- Tham khảo mobile nhưng giữ bố cục responsive, kích thước bảng/sidebar và kiểu điều hướng web. Đừng áp toàn bộ kích thước hoặc bo góc mobile lên Owner nếu chỉ được yêu cầu đồng bộ màu.
- Ưu tiên component/style chung cho hành vi thực sự giống nhau. Không gom những phần khác nhau về quyền hoặc nghiệp vụ chỉ vì hình thức tương tự.

## Kiểm tra trước khi hoàn tất

Trong `frontend/owner`: `npm run theme:check`, `npm run lint`, `npm run build`. Khi đổi token mobile, chạy `npm run theme:sync` rồi kiểm tra lại.

Trong `frontend` khi sửa Worker/Leader: chạy `npm run typecheck`, lint các file sửa và kiểm tra hai role dùng chung component. Với thay đổi form/camera/GPS, kiểm tra thiết bị Android phù hợp khi có sẵn; với thay đổi JSX/style chung, kiểm tra cả màn hình gọi qua route tạo nhật ký lẫn báo cáo công việc. Không dùng kết quả Vite build Owner để kết luận Expo hoạt động, hoặc ngược lại.

Nếu cập nhật nhận diện hoặc palette nguồn theo yêu cầu áp dụng toàn hệ thống, đồng bộ cả bản sao asset và token Owner rồi chạy kiểm tra cả hai ứng dụng. Nếu chỉ sửa một ứng dụng, giữ nguyên ứng dụng còn lại và nêu rõ phần cần đồng bộ trong lần thay đổi toàn hệ thống sau.

Xem trạng thái hover, focus, disabled, thành công, cảnh báo, lỗi; kiểm tra đăng nhập, sidebar, bảng, form, modal, badge và bản đồ ở desktop/mobile. Với thay đổi diện rộng, đối chiếu CSS ngoài màu để phát hiện lệch layout, dùng browser kiểm tra trang đại diện khi có thể. Báo rõ phần chưa được xem trực tiếp; build/lint không chứng minh giao diện hay nghiệp vụ đã đúng.

Không commit token/mật khẩu/.env, không gọi API ghi hoặc reset DB để kiểm tra giao diện. Không xóa component/nhánh nghiệp vụ chỉ để vượt kiểm tra màu.
