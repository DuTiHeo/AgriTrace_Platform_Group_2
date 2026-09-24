# backend/app/utils/batch_code.py
import re
import uuid
from datetime import date
from typing import Optional

BATCH_CODE_REGEX = re.compile(r"^(AGT-[A-Z0-9]{4}-\d{8}-[A-Z0-9]{4}|BATCH-[\w-]+)$", re.IGNORECASE)


def generate_batch_code(farm_id: str, harvest_date: Optional[date] = None) -> str:
    """
    Sinh mã định danh duy nhất cho 1 lô thu hoạch.
    Định dạng: AGT-<4 ký tự đầu farm_id>-<YYYYMMDD>-<4 ký tự random>
    Ví dụ: AGT-3F9A-20260415-7C2D

    Mã này sẽ được các phân hệ Kiểm định / Vận chuyển / Tra cứu QR dùng chung,
    nên KHÔNG đổi định dạng này sau khi đã thống nhất.
    """
    harvest_date = harvest_date or date.today()
    farm_prefix = str(farm_id).replace("-", "")[:4].upper()
    date_part = harvest_date.strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:4].upper()
    return f"AGT-{farm_prefix}-{date_part}-{random_part}"


def validate_batch_code(batch_code: str) -> bool:
    """
    Kiểm tra tính hợp lệ của mã lô thu hoạch:
    - Định dạng chuẩn mới: AGT-<farm_prefix>-<YYYYMMDD>-<rand> (VD: AGT-3F9A-20260415-7C2D)
    - Hoặc định dạng mẫu cũ: BATCH-... (VD: BATCH-DL-0001)
    """
    if not batch_code or not isinstance(batch_code, str):
        return False
    return bool(BATCH_CODE_REGEX.match(batch_code.strip()))
