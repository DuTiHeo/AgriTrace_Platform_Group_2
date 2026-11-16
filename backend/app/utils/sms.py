import json
import logging
import urllib.request
import urllib.parse
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger(__name__)


class BaseSMSProvider(ABC):
    @abstractmethod
    def send_otp(self, phone: str, otp: str, expire_minutes: int = 5) -> bool:
        """Gửi mã OTP qua SMS tới số điện thoại."""
        pass


class ConsoleSMSProvider(BaseSMSProvider):
    """
    Provider mặc định cho môi trường phát triển & kiểm thử.
    Ghi mã OTP ra console/terminal để kiểm tra mà không tốn chi phí SMS.
    """
    def send_otp(self, phone: str, otp: str, expire_minutes: int = 5) -> bool:
        message = f"Ma OTP AgriTrace cua ban la: {otp}. Hieu luc trong {expire_minutes} phut. Vui long khong chia se ma nay."
        border = "=" * 64
        print(f"\n{border}")
        print(f" [SMS GATEWAY - CONSOLE MOCK]")
        print(f" So dien thoai : {phone}")
        print(f" Ma OTP        : {otp}")
        print(f" Noi dung      : {message}")
        print(f"{border}\n", flush=True)
        logger.info("Sent mock SMS OTP to %s: %s", phone, otp)
        return True


class ESmsProvider(BaseSMSProvider):
    """
    Provider tích hợp dịch vụ eSMS.vn (Brandname SMS tại Việt Nam).
    """
    def __init__(self, api_key: str, secret_key: str, brandname: str = "AgriTrace"):
        self.api_key = api_key
        self.secret_key = secret_key
        self.brandname = brandname
        self.endpoint = "http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json"

    def send_otp(self, phone: str, otp: str, expire_minutes: int = 5) -> bool:
        if not self.api_key or not self.secret_key:
            logger.error("eSMS API Key hoặc Secret Key chưa được cấu hình. Fallback về console.")
            return ConsoleSMSProvider().send_otp(phone, otp, expire_minutes)

        content = f"Ma OTP AgriTrace cua ban la {otp}. Hieu luc trong {expire_minutes} phut."
        payload = {
            "ApiKey": self.api_key,
            "SecretKey": self.secret_key,
            "Content": content,
            "Phone": phone,
            "SmsType": "2",  # 2: CSKH Brandname, hoặc 4: OTP
            "Brandname": self.brandname,
            "SendDate": ""
        }

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint,
                data=req_data,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                code_result = result.get("CodeResult")
                if code_result in ("100", 100):
                    logger.info("Gui SMS eSMS thanh cong den %s", phone)
                    return True
                else:
                    logger.error("eSMS tra ve loi: %s", result.get("ErrorMessage"))
                    return False
        except Exception as e:
            logger.error("Loi khi goi eSMS API: %s", str(e))
            return False


def get_sms_provider() -> BaseSMSProvider:
    provider = settings.sms_provider.lower().strip()
    if provider == "esms":
        return ESmsProvider(
            api_key=settings.esms_api_key,
            secret_key=settings.esms_secret_key,
            brandname=settings.esms_brandname
        )
    return ConsoleSMSProvider()


def send_sms_otp(phone: str, otp: str, expire_minutes: int = 5) -> bool:
    """Hàm helper tiện lợi gửi mã OTP SMS."""
    provider = get_sms_provider()
    return provider.send_otp(phone, otp, expire_minutes)
