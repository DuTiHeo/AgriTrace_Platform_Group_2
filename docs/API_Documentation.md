# API Documentation - Phan he San Xuat So & Farmer QuickLog

> Khi backend dang chay, xem chi tiet request/response mau tai Swagger UI: http://localhost:8000/docs
> File nay chi de tom tat + ghi chu trang thai cho ca nhom / mentor de theo doi.

## Base URL
- Local (docker-compose): http://localhost:8000

## Danh sach endpoint (cap nhat dan theo tien do)
Đợt 0: Module Auth
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|Default| GET | /health | Kiem tra Backend + Database da ket noi | Da xong |
|UC-SH01| POST | /auth/login | Đăng nhập và phân quyền | Đã xong |
|UC-SH01| POST | /auth/logout | Đăng xuất và thêm token vào token_blacklist | Đã xong |
|UC-SH01| POST | limiter thiết lập 5/minutes | Bất kể ai nhập đăng nhập quá 5 lần/1p -> Tạm khóa | Đã xong |
|UC-SH02| POST | /auth/change-password |Đổi mật khẩu khi đăng nhập thành công | Đã xong |
|UC-SH02| POST | /auth/forgot-password + OTP |Đổi mật khẩu khi quên mật khẩu| Chưa làm (để đợt 3) |
|Null| GET | /auth/me | Lấy thông tin của người dùng hiện tại | Đã xong |

Đợt 1: Module User
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /users | Danh sách + tìm kiếm, scope theo role (Admin: all, Owner: theo org_id, Leader: theo team_id) | Đã xong|
|UC-SH04.1| GET | /users/{user_id} | Owner, Leader, Admin Xem chi tiết 1 user (phải cùng org/team, hoặc chính mình) | Đã xong |
|UC-A01.1| POST | /users/owners | Admin	Tạo tài khoản Owner, org_id = NULL, role cố định owner | Đã xong |
|UC-O05.1| POST | /users | Owner Tạo nhân sự mới, role mặc định worker, org_id tự lấy từ token | Đã xong |
|UC-O05.2| PATCH | /users/{user_id} | Owner, Admin	Sửa thông tin cốt lõi (không đụng role/status/team) | Đã xong |
|UC-O05.3 + UC-A01.3 + UC-O06.3| PATCH | /users/{user_id}/role | Owner, Admin Đổi vai trò — kèm transaction gán/gỡ team_leader_id bên teams nếu liên quan đến leader | Đã xong |
|UC-O05.4 + UC-A01.2| PATCH | /users/{user_id}/status | Owner, Admin Khóa/mở khóa |Đã xong |

Đợt 1: Module CropCatalog (gộp CropCareMilestones — theo bảng kế hoạch các đợt, milestones là bảng con nên gộp chung file thay vì tách riêng)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /crops | Danh sách + tìm kiếm giống cây. KHÔNG scope theo org_id — dữ liệu danh mục dùng chung toàn hệ thống, cả 4 role (owner/leader/worker/admin) đều xem được | Đã xong |
|UC-SH04.1| GET | /crops/{crop_id} | Xem chi tiết 1 giống, kèm danh sách mốc chăm sóc (milestones) | Đã xong |
|UC-A02.1| POST | /crops | Admin thêm giống cây mới vào danh mục | Đã xong |
|UC-A02.1| PATCH | /crops/{crop_id} | Admin sửa thông tin giống | Đã xong |
|UC-A02.1| DELETE | /crops/{crop_id} | Admin xóa giống — bảng chưa có cột status nên xóa cứng; nếu giống đang được season nào dùng, FK chặn lại và trả 400 thân thiện | Đã xong |
|UC-A02.1| POST | /crops/{crop_id}/milestones | Admin thêm mốc chăm sóc cho giống — UC-O03.3 (module Season) sẽ đọc dữ liệu này để tự sinh reminder_schedules | Đã xong |
|UC-A02.1| PATCH | /crops/{crop_id}/milestones/{milestone_id} | Admin sửa mốc chăm sóc | Đã xong |
|UC-A02.1| DELETE | /crops/{crop_id}/milestones/{milestone_id} | Admin xóa mốc chăm sóc | Đã xong |

Đợt 1: Module Organization
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-O01.1| GET | /organizations/mine | Owner xem danh sách nông trại mình sở hữu (dùng để chọn org trước khi gọi các API khác) | Đã xong |
|UC-SH04.1| GET | /organizations | Danh sách + tìm kiếm, scope theo role (Admin: all/lọc theo owner_id, Owner: chỉ farm mình sở hữu, Leader/Worker: farm trực thuộc) | Đã xong |
|UC-SH04.1| GET | /organizations/{org_id} | Xem chi tiết 1 nông trại, kèm ranh giới GeoJSON và thống kê nhanh (số plot, số team, số mùa vụ đang hoạt động) | Đã xong |
|UC-O01.1| POST | /organizations | Owner tự tạo nông trại (owner_id lấy từ token); hoặc Admin tạo hộ, tự chỉ định owner_id. Status tự động incomplete nếu chưa có ranh giới | Đã xong |
|UC-O01.2 + UC-O01.3 + UC-O01.4/.5| PATCH | /organizations/{org_id} | Sửa tên/địa chỉ, đổi trạng thái (active/suspended/incomplete), hoặc cập nhật ranh giới Polygon. Nếu bổ sung ranh giới khi đang incomplete, tự chuyển sang active | Đã xong |
|UC-O01.3| DELETE | /organizations/{org_id}?soft=true\|false | Xóa nông trại. Mặc định xóa mềm (chuyển status=suspended); soft=false xóa cứng — trả 400 nếu đã phát sinh dữ liệu liên quan (harvest_batches, error_reports) thay vì lỗi 500 | Đã xong |

Đợt 1: Module Plot (Vùng trồng / Lô đất)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /plots | Danh sách + tìm kiếm, scope theo role (tương tự Organization), lọc thêm theo org_id/status/keyword | Đã xong |
|UC-SH04.1| GET | /plots/{plot_id} | Xem chi tiết lô đất kèm ranh giới GeoJSON và mùa vụ đang canh tác hiện tại (nếu có) | Đã xong |
|UC-O02.1| POST | /plots | Tạo lô đất mới thuộc 1 nông trại. Tự tính diện tích từ ranh giới nếu không nhập tay; chặn nếu ranh giới lô vượt ra ngoài ranh giới nông trại cha (ST_Contains) | Đã xong |
|UC-O02.2| PATCH | /plots/{plot_id} | Sửa mã lô, diện tích, trạng thái hoặc ranh giới. Chặn sửa ranh giới nếu lô đang có mùa vụ hoạt động (growing/ready_to_harvest); ranh giới mới vẫn phải nằm trong nông trại cha | Đã xong |
|UC-O02.3| DELETE | /plots/{plot_id}?soft=true\|false | Xóa lô đất. Mặc định xóa mềm (status=inactive); luôn chặn nếu đang có mùa vụ hoạt động; soft=false trả 400 nếu lô đã có lịch sử mùa vụ/nhiệm vụ | Đã xong |

Đợt 1: Module Team (Tổ công nhân)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /teams | Danh sách + tìm kiếm tổ, scope theo role (Admin/Owner theo org, Leader/Worker theo farm trực thuộc) | Đã xong |
|UC-SH04.1| GET | /teams/{team_id} | Xem chi tiết tổ kèm danh sách thành viên | Đã xong |
|UC-O06.1| POST | /teams | Tạo tổ mới; có thể gán luôn Tổ trưởng (kiểm tra người này chưa làm Tổ trưởng của tổ khác) | Đã xong |
|UC-O06.2 + UC-O06.3| PATCH | /teams/{team_id} | Đổi tên tổ hoặc đổi Tổ trưởng. Tổ trưởng cũ (nếu bị thay) tự động hạ role về worker | Đã xong |
|-| DELETE | /teams/{team_id} | Xóa tổ (hard delete, bảng teams không có cột status). Chặn nếu đang có nhiệm vụ in_progress; trả 400 nếu tổ đã có lịch sử task/mùa vụ hỗ trợ | Đã xong |
|UC-O06.2| POST | /teams/{team_id}/members | Thêm danh sách công nhân vào tổ | Đã xong |
|UC-O06.2| DELETE | /teams/{team_id}/members/{user_id} | Gỡ 1 công nhân khỏi tổ. Nếu người đó đang là Tổ trưởng của tổ này, tự động gỡ team_leader_id và hạ role về worker | Đã xong |

Đợt 1: Module Season (Mùa vụ canh tác)
Usecase | Method | Endpoint | Mo ta | Trang thai |
|---|---|---|---|---|
|UC-SH04.1| GET | /seasons | Danh sách + tìm kiếm mùa vụ, lọc theo org/plot/crop/status/team, scope theo role | Đã xong |
|UC-SH04.1 + UC-O03.5| GET | /seasons/{season_id} | Xem chi tiết mùa vụ kèm lịch nhắc nhở tự sinh (reminder_schedules) và danh sách tổ đang hỗ trợ | Đã xong |
|UC-O03.1 + UC-O03.2 + UC-O03.3| POST | /seasons | Khởi tạo mùa vụ. Tự tính ngày thu hoạch dự kiến nếu không nhập; tự sinh reminder_schedules theo mốc chăm sóc chuẩn của giống cây (crop_care_milestones); chặn nếu lô đã có mùa vụ khác đang hoạt động | Đã xong |
|UC-O03.4| PATCH | /seasons/{season_id} | Cập nhật ngày thu hoạch thực tế / trạng thái mùa vụ | Đã xong |
|-| DELETE | /seasons/{season_id} | Xóa mùa vụ. Chặn nếu đã có nhật ký canh tác hoặc đã được gom vào lô thu hoạch | Đã xong |
|-| POST | /seasons/{season_id}/teams | Gán thêm tổ hỗ trợ mùa vụ | Đã xong |
|-| DELETE | /seasons/{season_id}/teams/{team_id} | Hủy gán tổ khỏi mùa vụ | Đã xong |