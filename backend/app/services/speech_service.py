from fastapi import HTTPException

from app.core.config import settings


async def transcribe_audio(audio: bytes, filename: str, content_type: str) -> str:
    api_key = settings.openai_api_key.get_secret_value().strip()
    if not api_key:
        raise HTTPException(503, "Chưa cấu hình dịch vụ giọng nói. Vui lòng báo người quản lý.")

    try:
        import httpx
    except ImportError as exc:
        raise HTTPException(503, "Dịch vụ giọng nói chưa được cài đặt. Vui lòng báo người quản lý.") from exc

    try:
        async with httpx.AsyncClient(timeout=settings.speech_timeout_seconds) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {api_key}"},
                files={"file": (filename, audio, content_type)},
                data={"model": settings.speech_model, "language": "vi", "response_format": "json"},
            )
    except httpx.TimeoutException as exc:
        raise HTTPException(504, "Chuyển giọng nói quá lâu. Vui lòng thử lại.") from exc
    except httpx.RequestError as exc:
        raise HTTPException(502, "Không kết nối được dịch vụ giọng nói. Vui lòng thử lại.") from exc

    if response.status_code == 429:
        raise HTTPException(503, "Dịch vụ giọng nói đang bận hoặc hết hạn mức. Vui lòng thử lại sau.")
    if response.status_code in (400, 422):
        raise HTTPException(422, "Không đọc được âm thanh. Vui lòng thu âm lại.")
    if not response.is_success:
        raise HTTPException(502, "Dịch vụ giọng nói chưa hoạt động. Vui lòng báo người quản lý.")
    try:
        text = response.json().get("text")
    except (ValueError, AttributeError) as exc:
        raise HTTPException(502, "Dịch vụ giọng nói trả về dữ liệu không hợp lệ.") from exc
    if not isinstance(text, str):
        raise HTTPException(502, "Dịch vụ giọng nói trả về dữ liệu không hợp lệ.")
    if not text.strip():
        raise HTTPException(422, "Không nhận được lời nói. Vui lòng nói rõ hơn và thu âm lại.")
    return text.strip()
