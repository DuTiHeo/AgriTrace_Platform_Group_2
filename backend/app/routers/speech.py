from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.core.limiter import limiter
from app.routers.user import require_role
from app.schemas.speech import TranscriptionResponse
from app.services.speech_service import transcribe_audio

router = APIRouter()
MAX_AUDIO_BYTES = 10 * 1024 * 1024
AUDIO_TYPES = {".m4a": "audio/mp4", ".mp4": "audio/mp4", ".webm": "audio/webm", ".wav": "audio/wav", ".mp3": "audio/mpeg"}


@router.post("/transcribe", response_model=TranscriptionResponse)
@limiter.limit("6/minute")
async def transcribe(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_role("leader", "worker")),
):
    try:
        extension = Path(file.filename or "").suffix.lower()
        if extension not in AUDIO_TYPES:
            raise HTTPException(415, "Chỉ hỗ trợ âm thanh M4A, MP4, WebM, WAV hoặc MP3.")
        audio = await file.read(MAX_AUDIO_BYTES + 1)
        if len(audio) > MAX_AUDIO_BYTES:
            raise HTTPException(413, "Bản ghi âm quá lớn. Tối đa 10 MB mỗi lần.")
        if not audio:
            raise HTTPException(422, "Bản ghi âm trống. Vui lòng thu âm lại.")
        text = await transcribe_audio(audio, f"recording{extension}", AUDIO_TYPES[extension])
        return TranscriptionResponse(text=text)
    finally:
        await file.close()
