import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import get_current_user
from app.routers import speech
from app.services.speech_service import transcribe_audio


class SpeechRouterTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(speech.router, prefix="/speech")
        self.app.state.limiter = limiter
        self.was_enabled = limiter.enabled
        limiter.enabled = False
        self.app.dependency_overrides[get_current_user] = lambda: {"role": "worker"}
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        limiter.enabled = self.was_enabled

    def test_worker_and_leader_receive_text(self):
        for role in ("worker", "leader"):
            with self.subTest(role=role):
                self.app.dependency_overrides[get_current_user] = lambda: {"role": role}
                with patch.object(speech, "transcribe_audio", AsyncMock(return_value="Đã tưới nước khu A.")) as service:
                    response = self.client.post("/speech/transcribe", files={"file": ("voice.m4a", b"audio", "audio/mp4")})
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json(), {"text": "Đã tưới nước khu A."})
                    service.assert_awaited_once_with(b"audio", "recording.m4a", "audio/mp4")

    def test_other_roles_are_rejected(self):
        self.app.dependency_overrides[get_current_user] = lambda: {"role": "owner"}
        with patch.object(speech, "transcribe_audio", AsyncMock()) as service:
            response = self.client.post("/speech/transcribe", files={"file": ("voice.m4a", b"audio")})
            self.assertEqual(response.status_code, 403)
            service.assert_not_awaited()

    def test_login_is_required(self):
        self.app.dependency_overrides.clear()
        response = self.client.post("/speech/transcribe", files={"file": ("voice.m4a", b"audio")})
        self.assertEqual(response.status_code, 401)

    def test_invalid_uploads_do_not_call_provider(self):
        for filename, audio, status in (("voice.txt", b"audio", 415), ("voice.m4a", b"", 422), ("voice.webm", b"x" * 9, 413)):
            with self.subTest(filename=filename, status=status), patch.object(speech, "MAX_AUDIO_BYTES", 8), patch.object(speech, "transcribe_audio", AsyncMock()) as service:
                response = self.client.post("/speech/transcribe", files={"file": (filename, audio)})
                self.assertEqual(response.status_code, status)
                service.assert_not_awaited()


class SpeechServiceTests(unittest.IsolatedAsyncioTestCase):
    async def invoke(self, response=None, error=None):
        client = AsyncMock()
        client.post.return_value = response
        if error:
            client.post.side_effect = error
        context = AsyncMock()
        context.__aenter__.return_value = client
        with patch.object(settings, "openai_api_key", SecretStr("test-key")), patch("httpx.AsyncClient", return_value=context):
            text = await transcribe_audio(b"audio", "recording.m4a", "audio/mp4")
        return text, client

    async def test_vietnamese_transcription_request(self):
        text, client = await self.invoke(httpx.Response(200, json={"text": " Đã tưới nước. "}))
        self.assertEqual(text, "Đã tưới nước.")
        self.assertEqual(client.post.call_args.kwargs["data"]["language"], "vi")
        self.assertEqual(client.post.call_args.kwargs["files"]["file"], ("recording.m4a", b"audio", "audio/mp4"))

    async def test_missing_key(self):
        with patch.object(settings, "openai_api_key", SecretStr("")), patch("httpx.AsyncClient") as client:
            with self.assertRaises(HTTPException) as result:
                await transcribe_audio(b"audio", "recording.m4a", "audio/mp4")
            self.assertEqual(result.exception.status_code, 503)
            client.assert_not_called()

    async def test_missing_library_does_not_break_startup(self):
        import builtins
        original_import = builtins.__import__

        def import_without_httpx(name, *args, **kwargs):
            if name == "httpx":
                raise ImportError("httpx unavailable")
            return original_import(name, *args, **kwargs)

        with patch.object(settings, "openai_api_key", SecretStr("test-key")), patch("builtins.__import__", side_effect=import_without_httpx):
            import importlib
            import app.services.speech_service as service
            importlib.reload(service)
            with self.assertRaises(HTTPException) as result:
                await service.transcribe_audio(b"audio", "recording.m4a", "audio/mp4")
            self.assertEqual(result.exception.status_code, 503)

    async def test_provider_failures(self):
        for provider_status, expected in ((401, 502), (429, 503), (500, 502), (400, 422)):
            with self.subTest(status=provider_status), self.assertRaises(HTTPException) as result:
                await self.invoke(httpx.Response(provider_status, json={"error": "private-provider-details"}))
            self.assertEqual(result.exception.status_code, expected)
            self.assertNotIn("private-provider-details", result.exception.detail)

    async def test_empty_or_invalid_response(self):
        for body, status in (({"text": " "}, 422), ({"text": None}, 502), ([], 502)):
            with self.subTest(body=body), self.assertRaises(HTTPException) as result:
                await self.invoke(httpx.Response(200, json=body))
            self.assertEqual(result.exception.status_code, status)

    async def test_timeout_and_connection_error(self):
        for error, status in ((httpx.ReadTimeout("timeout"), 504), (httpx.ConnectError("connection"), 502)):
            with self.subTest(status=status), self.assertRaises(HTTPException) as result:
                await self.invoke(error=error)
            self.assertEqual(result.exception.status_code, status)


if __name__ == "__main__":
    unittest.main()
