# Quy tắc giao diện lặp lại của AgriFarm

## Bảng màu

Nguồn trực tiếp là `frontend/src/styles/theme.ts`; không lấy bảng này làm bản thay thế cố định cho source.

| Vai trò | Token mobile | Giá trị khi rà soát | Owner |
|---|---|---|---|
| Nền trang | background | #F4F8F5 | --agri-background |
| Nền card | surface | #FFFFFF | --agri-surface |
| Header | header | #FAFCFA | --agri-header |
| Nút/chọn chính | primary | #2E833D | --agri-primary |
| Link | primaryText | #2B823F | --agri-primary-text |
| Nền chọn nhẹ | primarySoft | #EFF6EF | --agri-primary-soft |
| Tiêu đề | title | #213D29 | --agri-title |
| Chữ nội dung | text | #27412F | --agri-text |
| Chữ phụ mobile | muted | #829487 | --agri-muted |
| Viền | border | #E4ECE5 | --agri-border |
| Input/viền input | input / inputBorder | #F9FBF9 / #E0E8E1 | --agri-input / --agri-input-border |
| Thành công | success / successSoft | #278046 / #EAF6EB | --agri-success / --agri-success-soft |
| Cảnh báo | warning / warningSoft | #A66B16 / #FFF2DC | --agri-warning / --agri-warning-soft |
| Lỗi/xóa | danger / dangerSoft | #D93535 / #FFF1F1 | --agri-danger / --agri-danger-soft |

Owner bổ sung màu chữ đậm `muted-strong`, `success-text`, `warning-text`, `danger-text` để đọc trên nền sáng. Các alias `--green-*`, `--gray-*` phục vụ component cũ; code mới ưu tiên tên ngữ nghĩa `--agri-*`. Không viết lại màu ở CSS/JSX từng trang. Màu có alpha dùng RGB token, không chép lại các kênh RGB.

## Lớp phủ phía sau hộp thoại và menu

- Giữ màu tự nhiên của trang phía sau, chỉ làm tối nhẹ và làm mờ để nổi bật hộp thoại. Không dùng màu xanh thương hiệu, màu tiêu đề hoặc token shadow có sắc xanh để phủ toàn trang.
- Owner dùng chung `--agri-backdrop` và `--agri-backdrop-blur` trong `src/styles/theme.css`: đen trung tính 24% và blur 2px. Màu RGB của overlay có ba kênh bằng nhau; chỉnh độ tối/blur tại token chung thay vì đặt riêng ở mỗi trang.
- Áp dụng cho xác nhận xóa/tạm ngưng, form trong modal, hộp thoại nhân sự/tổ và lớp phủ sidebar khi mở ở màn hình nhỏ. Hộp thoại và chữ bên trong vẫn rõ, không đặt opacity/filter lên toàn bộ phần tử cha chứa hộp thoại.
- Ảnh nền đăng nhập có lớp phủ thương hiệu riêng. Quy tắc lớp phủ modal không đổi màu nền trang, nút hoặc badge.
- Khi sửa theo yêu cầu chỉ dành cho web, giữ nguyên app Worker/Leader; quy tắc chung không mở rộng phạm vi chỉnh sửa.

## Ảnh và thao tác xóa

- Bản nháp chụp/đính kèm ảnh: nút **×** nhỏ trong vòng tròn ở góc trên bên phải thumbnail, không có ô chữ “Xóa ảnh 1” bên dưới.
- Mobile đã có `frontend/src/components/common/remove-photo-button.tsx`: đường kính 26, top/right 5, nền tối 65%, chữ/viền trắng, vùng chạm mở rộng. Nếu Owner có chức năng tương ứng, tạo nút DOM theo cùng nguyên tắc, có `type="button"`, tên truy cập `Xóa ảnh n` và vùng chạm dễ bấm.
- Giữ thao tác bấm ảnh để phóng to riêng với thao tác xóa. Không lồng button trong button. Khóa xóa khi đang gửi/xử lý.
- Chỉ ảnh đang được chỉnh sửa mới có quyền xóa. Không thêm nút xóa vào ảnh nhật ký đã gửi hoặc màn hình chỉ đọc.
- Hai role mobile dùng form chung `FarmingLogFormScreen`; một thay đổi chung phải kiểm tra cả Worker và Leader.

## Ô nội dung báo cáo

- Ô “Nội dung báo cáo” là multiline, chữ bắt đầu từ trên, chiều cao tối thiểu 150 theo form mobile hiện tại.
- Ngay bên dưới có dòng: **Có thể dùng micro trên bàn phím để nói**.
- Dòng nhắc chỉ hướng dẫn dùng chức năng bàn phím, không đồng nghĩa phải thêm thu âm, speech API hoặc xin quyền microphone.
- Với form báo cáo tương ứng trên Owner, áp dụng khi form có nội dung và tính năng tương ứng; không thêm vào ghi chú, tìm kiếm hoặc form không liên quan.
- Giữ validation, dữ liệu draft, việc xin GPS, giới hạn ảnh, cơ chế gửi và quyền theo role; thay style không được đổi các logic này.

## Đánh giá nhật ký

- Mỗi lần đổi kết quả lưu thêm lịch sử qua API hiện có; giữ các đánh giá trước và hiển thị bên dưới khu vực đánh giá.
- Kết quả đang **Đạt** thì khóa nút **Đạt**, chỉ chọn được **Không đạt**; ngược lại cũng vậy. Khóa cả hai khi request đang gửi.
- Không bỏ lịch sử đánh giá khi lọc nhận xét. Dùng note ID cho key; hiển thị người đánh giá và thời gian theo dữ liệu có thật.
- Worker chỉ xem theo quyền hiện có. Không thêm quyền đánh giá/xóa hoặc suy diễn “được đánh giá Đạt” đồng nghĩa task backend đã completed.

## Phạm vi và bảo toàn

- Thay đổi trong Owner không được tự sửa mobile, backend/database hoặc gỡ dependency native.
- Chuẩn nhận diện áp dụng chung hệ thống; chuẩn không cấp quyền sửa ngoài phạm vi yêu cầu từng lần.
- Không coi tên tổ trưởng hiện tại là bằng chứng người tạo task. Không ẩn dữ liệu test bằng heuristic tiêu đề/ID để làm giao diện có vẻ đúng.
- Không tắt rule hoặc xóa nghiệp vụ để kiểm tra đạt. Lỗi runtime phải được tái hiện/đối chiếu riêng; build web không thay kiểm tra camera/GPS Android.
