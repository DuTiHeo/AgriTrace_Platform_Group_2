-- Migration 001: Fix status constraints and columns for tasks and batch_seasons
-- Description:
-- 1. Cập nhật CHECK constraint của bảng tasks để cho phép trạng thái 'cancelled' (xóa mềm).
-- 2. Bổ sung cột status vào bảng batch_seasons để hỗ trợ xóa mềm liên kết giữa lô thu hoạch và mùa vụ.

-- 1. Cập nhật CHECK constraint trên bảng tasks
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('in_progress', 'completed', 'cancelled'));

-- 2. Thêm cột status cho bảng batch_seasons nếu chưa có
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'batch_seasons' AND column_name = 'status'
    ) THEN
        ALTER TABLE batch_seasons 
            ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'cancelled'));
    END IF;
END $$;

COMMENT ON COLUMN batch_seasons.status IS 'active | cancelled (xóa mềm liên kết)';
