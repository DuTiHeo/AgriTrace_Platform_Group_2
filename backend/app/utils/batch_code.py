import uuid
from datetime import date
from typing import Optional


def generate_batch_code(farm_id: str, harvest_date: Optional[date] = None) -> str:
    """
    Sinh ma dinh danh duy nhat cho 1 lo thu hoach.
    Dinh dang: AGT-<4 ky tu dau farm_id>-<YYYYMMDD>-<4 ky tu random>
    Vi du: AGT-3F9A-20260415-7C2D

    Ma nay se duoc cac phan he Kiem dinh / Van chuyen / Tra cuu QR dung chung,
    nen KHONG doi dinh dang nay sau khi da thong bao cho cac nhom khac.
    """
    harvest_date = harvest_date or date.today()
    farm_prefix = str(farm_id).replace("-", "")[:4].upper()
    date_part = harvest_date.strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:4].upper()
    return f"AGT-{farm_prefix}-{date_part}-{random_part}"
