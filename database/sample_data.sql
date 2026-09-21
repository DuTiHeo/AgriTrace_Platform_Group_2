-- data test all tables
-- mật khẩu chung để test login là Test@1234
BEGIN;

-- 1. USERS (org_id, team_id để NULL trước vì organizations/teams chưa có)
-- user 1-4: nông trại 1 (Đà Lạt) | user 5-7: nông trại 2 (Mộc Châu) | user 8: admin hệ thống

INSERT INTO users (user_id, full_name, phone, national_id, date_of_birth, address, password_hash, role, status, org_id, team_id) VALUES
('10000000-0000-0000-0000-000000000001', 'Nguyễn Văn An',  '0901000001', '079090000001', '1980-03-12', 'Đà Lạt, Lâm Đồng', '$2b$12$fV5zOvn5kXwAxe.rCA7hSus8N5sjhZKKlqjgVlPYVUPzwxpsDrxua', 'owner',  'active', NULL, NULL),
('10000000-0000-0000-0000-000000000002', 'Lê Văn Cường',   '0901000002', '079090000002', '1992-01-05', 'Đà Lạt, Lâm Đồng', '$2b$12$fV5zOvn5kXwAxe.rCA7hSus8N5sjhZKKlqjgVlPYVUPzwxpsDrxua', 'leader', 'active', NULL, NULL),
('10000000-0000-0000-0000-000000000003', 'Phạm Thị Dung',  '0901000003', '079090000003', '1995-11-30', 'Đà Lạt, Lâm Đồng', '$2b$12$fV5zOvn5kXwAxe.rCA7hSus8N5sjhZKKlqjgVlPYVUPzwxpsDrxua', 'worker', 'active', NULL, NULL),
('10000000-0000-0000-0000-000000000004', 'Hoàng Văn Em',   '0901000004', '079090000004', '1998-02-14', 'Đà Lạt, Lâm Đồng', '$2b$12$fV5zOvn5kXwAxe.rCA7hSus8N5sjhZKKlqjgVlPYVUPzwxpsDrxua', 'worker', 'active', NULL, NULL),
('10000000-0000-0000-0000-000000000005', 'Vũ Thị Phương',  '0902000001', '079090000005', '1985-09-09', 'Mộc Châu, Sơn La', '$2b$12$fV5zOvn5kXwAxe.rCA7hSus8N5sjhZKKlqjgVlPYVUPzwxpsDrxua', 'owner',  'active', NULL, NULL),
('10000000-0000-0000-0000-000000000006', 'Đỗ Văn Giang',   '0902000002', '079090000006', '1993-06-18', 'Mộc Châu, Sơn La', '$2b$12$fV5zOvn5kXwAxe.rCA7hSus8N5sjhZKKlqjgVlPYVUPzwxpsDrxua', 'leader', 'active', NULL, NULL),
('10000000-0000-0000-0000-000000000007', 'Bùi Thị Hoa',    '0902000003', '079090000007', '1999-12-01', 'Mộc Châu, Sơn La', '$2b$12$fV5zOvn5kXwAxe.rCA7hSus8N5sjhZKKlqjgVlPYVUPzwxpsDrxua', 'worker', 'active', NULL, NULL),
('10000000-0000-0000-0000-000000000008', 'Trần Thị Bình',  '0900000008', '079090000008', '1990-07-20', 'Hà Nội',           '$2b$12$fV5zOvn5kXwAxe.rCA7hSus8N5sjhZKKlqjgVlPYVUPzwxpsDrxua', 'admin',  'active', NULL, NULL);

-- 2. ORGANIZATIONS (owner_id NOT NULL nên phải có user trước)

INSERT INTO organizations (org_id, name, address, owner_id, status, boundary_geojson) VALUES
('20000000-0000-0000-0000-000000000001', 'Nông trại Xanh Đà Lạt', '123 Đường Hồ Xuân Hương, Đà Lạt, Lâm Đồng',
'10000000-0000-0000-0000-000000000001', 'active',
ST_SetSRID(ST_GeomFromText('POLYGON((108.42 11.94, 108.43 11.94, 108.43 11.95, 108.42 11.95, 108.42 11.94))'), 4326)),
('20000000-0000-0000-0000-000000000002', 'Hợp tác xã Rau sạch Mộc Châu', 'Bản Áng, Mộc Châu, Sơn La',
'10000000-0000-0000-0000-000000000005', 'active',
ST_SetSRID(ST_GeomFromText('POLYGON((104.60 20.83, 104.61 20.83, 104.61 20.84, 104.60 20.84, 104.60 20.83))'), 4326));

-- Cập nhật org_id cho các user thuộc từng nông trại
-- LƯU Ý: KHÔNG gán org_id cho user role 'owner' (user 1, user 5) vì constraint
-- chk_owner_no_single_org bắt buộc owner phải có org_id = NULL (owner sở hữu
-- nông trại qua organizations.owner_id, có thể sở hữu nhiều nông trại cùng lúc).
-- user 8 là admin hệ thống, cũng không thuộc org nào.
UPDATE users SET org_id = '20000000-0000-0000-0000-000000000001' WHERE user_id IN (
'10000000-0000-0000-0000-000000000002',
'10000000-0000-0000-0000-000000000003',
'10000000-0000-0000-0000-000000000004'
);
UPDATE users SET org_id = '20000000-0000-0000-0000-000000000002' WHERE user_id IN (
'10000000-0000-0000-0000-000000000006',
'10000000-0000-0000-0000-000000000007'
);

-- 3. PLOTS

INSERT INTO plots (plot_id, org_id, code, boundary_geojson, area, status) VALUES
('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'DL-01',
ST_SetSRID(ST_GeomFromText('POLYGON((108.421 11.941, 108.422 11.941, 108.422 11.942, 108.421 11.942, 108.421 11.941))'), 4326), 2.5, 'active'),
('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'DL-02',
ST_SetSRID(ST_GeomFromText('POLYGON((108.423 11.943, 108.424 11.943, 108.424 11.944, 108.423 11.944, 108.423 11.943))'), 4326), 1.8, 'active'),
('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'MC-01',
ST_SetSRID(ST_GeomFromText('POLYGON((104.601 20.831, 104.602 20.831, 104.602 20.832, 104.601 20.832, 104.601 20.831))'), 4326), 3.0, 'active');

-- 4. TEAMS (đã có user nên gán team_leader_id luôn)

INSERT INTO teams (team_id, org_id, name, team_leader_id) VALUES
('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Tổ 1 - Rau ăn lá',    '10000000-0000-0000-0000-000000000002'),
('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Tổ Chăm sóc cà chua', '10000000-0000-0000-0000-000000000006');

-- Cập nhật team_id cho tổ trưởng + thành viên
UPDATE users SET team_id = '40000000-0000-0000-0000-000000000001' WHERE user_id IN (
'10000000-0000-0000-0000-000000000002', -- tổ trưởng
'10000000-0000-0000-0000-000000000003',
'10000000-0000-0000-0000-000000000004'
);
UPDATE users SET team_id = '40000000-0000-0000-0000-000000000002' WHERE user_id IN (
'10000000-0000-0000-0000-000000000006', -- tổ trưởng
'10000000-0000-0000-0000-000000000007'
);

-- 5. CROP_CATALOG & CROP_CARE_MILESTONES

INSERT INTO crop_catalog (crop_id, name, growth_days, planting_guide) VALUES
('50000000-0000-0000-0000-000000000001', 'Xà lách',    35, 'Gieo hạt trên luống đất tơi xốp, giữ ẩm đều, tránh úng nước.'),
('50000000-0000-0000-0000-000000000002', 'Cà chua bi', 90, 'Ươm cây con 3 tuần trước khi trồng ra ruộng, làm giàn khi cây cao 20cm.'),
('50000000-0000-0000-0000-000000000003', 'Cải ngọt',   30, 'Gieo trực tiếp, tưới nước 2 lần/ngày, thu hoạch khi lá to bản.');

INSERT INTO crop_care_milestones (milestone_id, crop_id, days_after_planting, task_type, description) VALUES
('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 7,  'tuoi_nuoc', 'Tưới nước giữ ẩm sau khi gieo hạt'),
('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 21, 'bon_phan',  'Bón phân thúc lần 1'),
('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 14, 'lam_gian',  'Làm giàn cho cây leo'),
('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', 60, 'bon_phan',  'Bón phân nuôi trái');

-- 6. SEASONS

INSERT INTO seasons (season_id, plot_id, crop_id, planting_date, expected_harvest_date, actual_harvest_date, status) VALUES
('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', '2026-06-01', '2026-07-06', NULL,          'growing'),
('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', '2026-05-15', '2026-06-14', '2026-06-16', 'completed'),
('70000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', '2026-04-01', '2026-06-30', NULL,          'growing');

-- 7. REMINDER_SCHEDULES

INSERT INTO reminder_schedules (reminder_id, season_id, milestone_type, remind_date, channel, status) VALUES
('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'tuoi_nuoc', '2026-06-08', 'push', 'scheduled'),
('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'bon_phan',  '2026-06-22', 'sms',  'scheduled'),
('80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 'lam_gian',  '2026-04-15', 'push', 'sent');

-- 8. HARVEST_BATCHES & BATCH_SEASONS

INSERT INTO harvest_batches (batch_id, batch_code, org_id, quantity, harvest_date, status, qr_url) VALUES
('90000000-0000-0000-0000-000000000001', 'BATCH-DL-0001', '20000000-0000-0000-0000-000000000001', 120.5, '2026-06-16', 'ready', 'https://quicklog.example.com/qr/BATCH-DL-0001');

INSERT INTO batch_seasons (batch_id, season_id, contributed_quantity) VALUES
('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 120.5);

-- 9. SEASON_TEAM_ASSIGNMENTS

INSERT INTO season_team_assignments (season_id, team_id, start_date, end_date) VALUES
('70000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '2026-06-01', NULL),
('70000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', '2026-04-01', NULL);

-- 10. FARMING_LOGS, LOG_PHOTOS, LOG_NOTES

INSERT INTO farming_logs (log_id, season_id, user_id, activity_type, content, gps, logged_at) VALUES
('a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',
'tuoi_nuoc', 'Tưới nước buổi sáng cho luống xà lách khu A', ST_SetSRID(ST_MakePoint(108.4215, 11.9415), 4326), '2026-06-05 06:30:00+07'),
('a0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004',
'bon_phan', 'Bón phân NPK cho luống 1', ST_SetSRID(ST_MakePoint(108.4216, 11.9416), 4326), '2026-06-08 07:15:00+07'),
('a0000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000007',
'lam_co', 'Làm cỏ quanh gốc cà chua', ST_SetSRID(ST_MakePoint(104.6015, 20.8315), 4326), '2026-04-20 08:00:00+07');

INSERT INTO log_photos (photo_id, log_id, url) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'https://quicklog.example.com/photos/log1_1.jpg');

INSERT INTO log_notes (note_id, log_id, leader_id, content) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
'Tưới đều tay hơn ở góc luống phía Đông nhé.');

-- 11. TASKS

INSERT INTO tasks (task_id, team_id, worker_id, plot_id, content, due_date, status) VALUES
('d0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',
'30000000-0000-0000-0000-000000000001', 'Tưới nước luống xà lách khu A', '2026-06-10', 'in_progress'),
('d0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000007',
'30000000-0000-0000-0000-000000000003', 'Làm giàn cho cà chua', '2026-04-20', 'completed');

-- 12. ERROR_REPORTS

INSERT INTO error_reports (report_id, user_id, org_id, error_type, description, screenshot_url, status, admin_response) VALUES
('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
'loi_dang_nhap', 'Không đăng nhập được sau khi đổi mật khẩu', NULL, 'resolved', 'Đã hỗ trợ reset mật khẩu cho tài khoản.');

-- 13. NOTIFICATIONS

INSERT INTO notifications (notification_id, user_id, content, type, is_read) VALUES
('f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Bạn có nhiệm vụ mới: Tưới nước luống xà lách khu A', 'task_assigned', FALSE),
('f0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000008', 'Có báo cáo lỗi mới cần xử lý', 'error_report', TRUE);

-- 14. SYSTEM_LOGS

INSERT INTO system_logs (log_id, actor_id, target_type, target_id, action, result) VALUES
('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'users',        '10000000-0000-0000-0000-000000000003', 'create', 'success'),
('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'farming_logs', 'a0000000-0000-0000-0000-000000000001', 'create', 'success');

COMMIT;