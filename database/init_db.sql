CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Trigger function dùng chung: tự động cập nhật cột updated_at
-- mỗi khi UPDATE (vi DEFAULT CURRENT_TIMESTAMP chỉ áp dụng lúc INSERT)

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. USERS (Người dùng)
-- 1. USERS (Người dùng)
CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20)  NOT NULL,
    national_id     VARCHAR(20),
    date_of_birth   DATE,
    address         TEXT,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('owner', 'leader', 'worker', 'admin')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
    org_id          UUID,                    -- FK added later (circular dependency)
    team_id         UUID,                    -- FK added later (circular dependency)
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_users_phone UNIQUE (phone),
    CONSTRAINT chk_owner_no_single_org CHECK (role <> 'owner' OR org_id IS NULL) -- Owner co the so huu NHIEU nong trai
);

-- Comment để tí vào mấy cái app quản trị csdl cho dễ nhìn
COMMENT ON TABLE users IS 'Người dùng hệ thống (Chủ sở hữu, Tổ trưởng, Công nhân, Admin)';
COMMENT ON COLUMN users.role IS 'Vai trò: owner | leader | worker | admin';
COMMENT ON COLUMN users.status IS 'Trạng thái tài khoản: active | locked';

-- CCCD khong duoc trung (neu co nhap) - theo UC-O05.1
CREATE UNIQUE INDEX uq_users_national_id ON users(national_id) WHERE national_id IS NOT NULL;

-- Index phục vụ data isolation: lọc nhanh người dùng theo nông trại / tổ
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_team ON users(team_id);

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 2. ORGANIZATIONS (Nông trại)
CREATE TABLE organizations (
    org_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(200) NOT NULL,
    address             TEXT,
    owner_id            UUID NOT NULL REFERENCES users(user_id),
    status              VARCHAR(20) NOT NULL DEFAULT 'incomplete' CHECK (status IN ('active', 'suspended', 'incomplete')),
    boundary_geojson    GEOMETRY(Polygon, 4326),   -- WGS84
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE organizations IS 'Nông trại / Vườn / Nhà kính';
COMMENT ON COLUMN organizations.status IS 'active | suspended | incomplete (chưa có ranh giới)';
COMMENT ON COLUMN organizations.boundary_geojson IS 'Ranh giới nông trại dạng Polygon GeoJSON';

CREATE INDEX idx_organizations_owner ON organizations(owner_id);

CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- 3. PLOTS (Vùng trồng / Lô đất)
CREATE TABLE plots (
    plot_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id              UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    code                VARCHAR(50) NOT NULL,          -- VD: Lô A1
    boundary_geojson    GEOMETRY(Polygon, 4326),
    area                DOUBLE PRECISION,              -- diện tích (m² hoặc ha)
    status              VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive')),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_plots_org_code UNIQUE (org_id, code)
);

COMMENT ON TABLE plots IS 'Vùng trồng / Lô đất thuộc nông trại';
COMMENT ON COLUMN plots.code IS 'Tên hoặc mã lô (duy nhất trong nông trại)';

CREATE TRIGGER set_updated_at_plots
    BEFORE UPDATE ON plots
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- 4. TEAMS (Tổ công nhân)
CREATE TABLE teams (
    team_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id              UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name                VARCHAR(100) NOT NULL,
    team_leader_id      UUID REFERENCES users(user_id),  -- có thể null khi mới tạo
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_teams_org_name UNIQUE (org_id, name)
);

COMMENT ON TABLE teams IS 'Tổ công nhân thuộc nông trại';
COMMENT ON COLUMN teams.team_leader_id IS 'user_id của Tổ trưởng (có thể null)';

-- Theo UC-O05.3/UC-O06.3: tai 1 thoi diem, 1 nguoi chi lam To truong cua DUNG 1 to
CREATE UNIQUE INDEX uq_teams_leader ON teams(team_leader_id) WHERE team_leader_id IS NOT NULL;

CREATE TRIGGER set_updated_at_teams
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- Add deferred foreign keys for users (circular dependency resolved)
ALTER TABLE users
    ADD CONSTRAINT fk_users_org
        FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE SET NULL;

ALTER TABLE users
    ADD CONSTRAINT fk_users_team
        FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE SET NULL;

-- 5. CROP_CATALOG (Danh mục giống cây trồng)
CREATE TABLE crop_catalog (
    crop_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(150) NOT NULL,
    growth_days         INTEGER NOT NULL CHECK (growth_days > 0),
    planting_guide      TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE crop_catalog IS 'Danh mục giống cây trồng (do Admin quản lý)';
COMMENT ON COLUMN crop_catalog.growth_days IS 'Số ngày sinh trưởng chuẩn';

CREATE TRIGGER set_updated_at_crop_catalog
    BEFORE UPDATE ON crop_catalog
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 6. CROP_CARE_MILESTONES (Mốc chăm sóc của giống)
CREATE TABLE crop_care_milestones (
    milestone_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id             UUID NOT NULL REFERENCES crop_catalog(crop_id) ON DELETE CASCADE,
    days_after_planting INTEGER NOT NULL CHECK (days_after_planting >= 0),
    task_type           VARCHAR(50) NOT NULL,          -- bón phân, phun thuốc, làm cỏ, tưới cây,...
    description         TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE crop_care_milestones IS 'Các mốc chăm sóc chuẩn theo từng giống cây';
COMMENT ON COLUMN crop_care_milestones.days_after_planting IS 'Số ngày sau khi gieo thì thực hiện';

CREATE INDEX idx_crop_care_milestones_crop ON crop_care_milestones(crop_id);

-- 7. SEASONS (Mùa vụ)
CREATE TABLE seasons (
    season_id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plot_id                 UUID NOT NULL REFERENCES plots(plot_id),
    crop_id                 UUID NOT NULL REFERENCES crop_catalog(crop_id),
    planting_date           DATE NOT NULL,
    expected_harvest_date   DATE,
    actual_harvest_date     DATE,
    status                  VARCHAR(30) NOT NULL DEFAULT 'growing' CHECK (status IN ('growing', 'ready_to_harvest', 'completed')),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE seasons IS 'Mùa vụ canh tác trên một lô đất';
COMMENT ON COLUMN seasons.status IS 'growing | ready_to_harvest | completed';

-- Index để kiểm tra nhanh lô đang có mùa vụ active
CREATE INDEX idx_seasons_plot_status ON seasons(plot_id, status);
CREATE INDEX idx_seasons_crop ON seasons(crop_id);

CREATE TRIGGER set_updated_at_seasons
    BEFORE UPDATE ON seasons
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 8. REMINDER_SCHEDULES (Lịch nhắc nhở)
CREATE TABLE reminder_schedules (
    reminder_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id           UUID NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    milestone_type      VARCHAR(50) NOT NULL,          -- harvest, fertilize, spray...
    remind_date         DATE NOT NULL,
    channel             VARCHAR(20) DEFAULT 'push',    -- push | sms | email
    status              VARCHAR(20) NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled', 'sent', 'seen')),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE reminder_schedules IS 'Lịch nhắc nhở tự động gắn với mùa vụ';
COMMENT ON COLUMN reminder_schedules.status IS 'scheduled | sent | seen';

CREATE INDEX idx_reminder_date_status ON reminder_schedules(remind_date, status);

-- 9. HARVEST_BATCHES (Lô thu hoạch)
CREATE TABLE harvest_batches (
    batch_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_code          VARCHAR(100) UNIQUE,           -- sinh sau khi tạo
    org_id              UUID NOT NULL REFERENCES organizations(org_id),
    quantity            DOUBLE PRECISION,
    harvest_date        DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'ready', 'cancelled')),
    qr_url              VARCHAR(500),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE harvest_batches IS 'Lô thu hoạch (có mã QR truy xuất nguồn gốc)';
COMMENT ON COLUMN harvest_batches.batch_code IS 'Mã định danh duy nhất (BATCH-...)';
COMMENT ON COLUMN harvest_batches.status IS 'pending | ready | cancelled (xóa mềm)';

CREATE INDEX idx_harvest_batches_org ON harvest_batches(org_id);

CREATE TRIGGER set_updated_at_harvest_batches
    BEFORE UPDATE ON harvest_batches
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- 10. BATCH_SEASONS (Trung gian Lô thu hoạch ↔ Mùa vụ)
CREATE TABLE batch_seasons (
    batch_id                UUID NOT NULL REFERENCES harvest_batches(batch_id) ON DELETE CASCADE,
    season_id               UUID NOT NULL REFERENCES seasons(season_id),
    contributed_quantity    DOUBLE PRECISION,
    PRIMARY KEY (batch_id, season_id)
);

COMMENT ON TABLE batch_seasons IS 'Bảng trung gian: 1 lô thu hoạch có thể gom từ nhiều mùa vụ';
COMMENT ON COLUMN batch_seasons.contributed_quantity IS 'Sản lượng đóng góp từ mùa vụ này';

-- PK (batch_id, season_id) da co index tu nhien cho tra cuu theo batch_id,
-- nhung tra cuu nguoc theo season_id ("mua vu nay gop vao lo nao") can index rieng
CREATE INDEX idx_batch_seasons_season ON batch_seasons(season_id);

-- 11. SEASON_TEAM_ASSIGNMENTS (Gán tổ hỗ trợ mùa vụ)
CREATE TABLE season_team_assignments (
    season_id           UUID NOT NULL REFERENCES seasons(season_id) ON DELETE CASCADE,
    team_id             UUID NOT NULL REFERENCES teams(team_id),
    start_date          DATE,
    end_date            DATE,
    PRIMARY KEY (season_id, team_id)
);

COMMENT ON TABLE season_team_assignments IS 'Bảng trung gian: mùa vụ được hỗ trợ bởi những tổ nào';

-- Tra cuu nguoc theo team_id ("to nay dang ho tro nhung mua vu nao")
CREATE INDEX idx_season_team_assignments_team ON season_team_assignments(team_id);

-- 12. FARMING_LOGS (Nhật ký canh tác)
CREATE TABLE farming_logs (
    log_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id           UUID NOT NULL REFERENCES seasons(season_id),
    user_id             UUID NOT NULL REFERENCES users(user_id),
    activity_type       VARCHAR(50),                   -- bón phân, tưới nước, phun thuốc...
    content             TEXT,
    gps                 GEOMETRY(Point, 4326),
    logged_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE farming_logs IS 'Nhật ký canh tác do công nhân / tổ trưởng ghi';
COMMENT ON COLUMN farming_logs.user_id IS 'Người ghi nhật ký';

CREATE INDEX idx_farming_logs_season ON farming_logs(season_id);
CREATE INDEX idx_farming_logs_user ON farming_logs(user_id);
CREATE INDEX idx_farming_logs_time ON farming_logs(logged_at DESC);

-- 13. LOG_PHOTOS (Ảnh đính kèm nhật ký)
CREATE TABLE log_photos (
    photo_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id              UUID NOT NULL REFERENCES farming_logs(log_id) ON DELETE CASCADE,
    url                 VARCHAR(500) NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE log_photos IS 'Ảnh thực địa đính kèm nhật ký canh tác';

-- 14. LOG_NOTES (Ghi chú của Tổ trưởng dưới nhật ký)
CREATE TABLE log_notes (
    note_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id              UUID NOT NULL REFERENCES farming_logs(log_id) ON DELETE CASCADE,
    leader_id           UUID NOT NULL REFERENCES users(user_id),
    content             TEXT NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE log_notes IS 'Ghi chú / nhắc nhở của Tổ trưởng dưới nhật ký';
COMMENT ON COLUMN log_notes.leader_id IS 'user_id của Tổ trưởng viết ghi chú';

-- 15. TASKS (Nhiệm vụ)
CREATE TABLE tasks (
    task_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id             UUID NOT NULL REFERENCES teams(team_id),
    worker_id           UUID NOT NULL REFERENCES users(user_id),
    plot_id             UUID NOT NULL REFERENCES plots(plot_id),
    content             TEXT NOT NULL,
    due_date            DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'completed')),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tasks IS 'Nhiệm vụ do Tổ trưởng giao cho công nhân';
COMMENT ON COLUMN tasks.worker_id IS 'user_id của công nhân được giao việc';
COMMENT ON COLUMN tasks.status IS 'in_progress | completed';

CREATE INDEX idx_tasks_worker ON tasks(worker_id);
CREATE INDEX idx_tasks_team ON tasks(team_id);
CREATE INDEX idx_tasks_plot ON tasks(plot_id);

CREATE TRIGGER set_updated_at_tasks
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 16. ERROR_REPORTS (Báo cáo lỗi hệ thống)
CREATE TABLE error_reports (
    report_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(user_id),
    org_id              UUID NOT NULL REFERENCES organizations(org_id),
    error_type          VARCHAR(50),
    description         TEXT NOT NULL,
    screenshot_url      VARCHAR(500),
    status              VARCHAR(20) NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'processing', 'resolved', 'rejected')),
    admin_response      TEXT,
    submitted_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE error_reports IS 'Báo cáo lỗi kỹ thuật từ người dùng gửi lên Admin';
COMMENT ON COLUMN error_reports.status IS 'new | processing | resolved | rejected';

-- UC-A03.1: Admin xem danh sach, uu tien loc theo trang thai / nong trai
CREATE INDEX idx_error_reports_status ON error_reports(status);
CREATE INDEX idx_error_reports_org ON error_reports(org_id);
CREATE INDEX idx_error_reports_user ON error_reports(user_id);

CREATE TRIGGER set_updated_at_error_reports
    BEFORE UPDATE ON error_reports
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 17. NOTIFICATIONS (Thông báo)
CREATE TABLE notifications (
    notification_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content             TEXT NOT NULL,
    type                VARCHAR(50),                   -- task_assigned, log_note, reminder...
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notifications IS 'Thông báo hệ thống gửi đến người dùng (tự động tạo bởi backend)';
COMMENT ON COLUMN notifications.type IS 'Loại thông báo: task_assigned | log_note | reminder | ...';
COMMENT ON COLUMN notifications.is_read IS 'Đã đọc hay chưa';

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 18. SYSTEM_LOGS (Nhật ký của hệ thống)
CREATE TABLE system_logs (
    log_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id            UUID REFERENCES users(user_id),
    target_type         VARCHAR(50),                   -- users, seasons, tasks...
    target_id           UUID,
    action              VARCHAR(50) NOT NULL,          -- create, update, delete, login...
    performed_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    result              VARCHAR(20) DEFAULT 'success'  -- success | failed
);

COMMENT ON TABLE system_logs IS 'Nhật ký hoạt động hệ thống (audit trail)';
COMMENT ON COLUMN system_logs.actor_id IS 'Người thực hiện hành động';
COMMENT ON COLUMN system_logs.target_type IS 'Loại đối tượng bị tác động';
COMMENT ON COLUMN system_logs.action IS 'Hành động: create | update | delete | login...';

CREATE INDEX idx_system_logs_actor ON system_logs(actor_id);
CREATE INDEX idx_system_logs_time ON system_logs(performed_at DESC);

-- 19. TOKEN_BLACKLIST (Danh sách token đã bị vô hiệu hóa do logout)
CREATE TABLE token_blacklist (
    jti                 UUID PRIMARY KEY,
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at          TIMESTAMP WITH TIME ZONE NOT NULL,  --exp gốc của token, để biết khi nào có thể dọn
    revoked_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE token_blacklist IS 'Cac access token da bi vo hieu hoa (do nguoi dung logout) truoc khi het han tu nhien';

--Dùng để dọn nhanh các bản ghi đã hết hạn (token đã tự hết hạn, không cần check nữa)
CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);
