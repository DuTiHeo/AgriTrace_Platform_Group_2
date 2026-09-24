# backend/app/utils/qr_generator.py
import os
from typing import Optional

DEFAULT_TRACE_BASE_URL = os.getenv("TRACE_BASE_URL", "https://quicklog.agritrace.vn/qr")


def generate_qr_url(batch_code: str, base_url: Optional[str] = None) -> str:
    """
    Sinh đường dẫn trang tra cứu QR công khai cho lô thu hoạch.
    Ví dụ: https://quicklog.agritrace.vn/qr/AGT-3F9A-20260415-7C2D
    """
    base = (base_url or DEFAULT_TRACE_BASE_URL).rstrip("/")
    clean_code = batch_code.strip()
    return f"{base}/{clean_code}"
