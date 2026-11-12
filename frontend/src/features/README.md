# Features

- Giao diện role của app nằm trong src/(mobile)/leader và src/(mobile)/worker.
- Component giao diện riêng nằm trong src/components/leader và src/components/worker;
  thành phần chung nằm trong src/components/common.
- features/admin, owner, leader, worker dành cho chức năng riêng của từng role.
  Owner hiện có các kiểu dữ liệu nghiệp vụ và relationshipService_wb.ts để ghép
  dữ liệu quan hệ từ API sẵn có; các role còn lại vẫn là thư mục dự phòng.
- features/auth/mobile chứa các màn hình đăng nhập và khôi phục mật khẩu của app.
- features/account/mobile chứa các màn hình tài khoản và cài đặt của app.
- auth/website chứa LoginPage_wb.tsx và ForgotPasswordPage_wb.tsx của web.
- account/website chứa AccountPage_wb.tsx của web.
- src/(mobile)/[...connect_feature].tsx nối đường dẫn auth/account tới source trong
  features; không cần thư mục auth/account bản sao trong cây route.
- Các thư mục components, constants, contexts, hooks, sevices, styles, utils giữ
  cách tổ chức theo chức năng; bổ sung file web vào đúng trách nhiệm khi triển khai.
- src/(website)/owner giữ màn hình và điểm khởi chạy website. Component Owner,
  context, dịch vụ API, CSS và hàm tiện ích đã chuyển vào các thư mục chung đúng
  trách nhiệm. Không có các nhánh screens/components bên trong features.
