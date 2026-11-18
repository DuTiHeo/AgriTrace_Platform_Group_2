import base64
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger(__name__)


def to_e164_vn(phone: str) -> str:
    """Chuyển đổi số điện thoại Việt Nam sang định dạng quốc tế E.164 (VD: 0912345678 -> +84912345678)."""
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("+"):
        return p
    if p.startswith("84"):
        return "+" + p
    if p.startswith("0"):
        return "+84" + p[1:]
    return "+84" + p


ESMS_ERROR_MAP = {
    "100": "Thành công",
    "101": "Sai thông tin ApiKey hoặc SecretKey eSMS",
    "102": "Tài khoản eSMS của bạn không đủ tiền (số dư 0đ). Vui lòng nạp tiền vào eSMS.vn để gửi tin nhắn",
    "103": "Số điện thoại không hợp lệ",
    "104": "Brandname không tồn tại hoặc chưa được duyệt trên eSMS. Hãy cấu hình Brandname test 'Baotrixemay' hoặc chuyển SMS_PROVIDER=console trong backend/.env",
    "118": "Loại tin nhắn (SmsType) không hợp lệ trên tài khoản này",
    "119": "Brandname chưa được kích hoạt",
    "131": "Mẫu tin nhắn OTP (Template) chưa được đăng ký duyệt trước với eSMS",
    "99": "Lỗi không xác định từ nhà mạng eSMS",
}


class BaseSMSProvider(ABC):
    @abstractmethod
    def send_otp(self, phone: str, otp: str, expire_minutes: int = 5) -> tuple[bool, str]:
        """Gửi mã OTP qua SMS tới số điện thoại, trả về (thành_công, thông_báo)."""
        pass


class ConsoleSMSProvider(BaseSMSProvider):
    """
    Provider mặc định cho môi trường phát triển & kiểm thử.
    Ghi mã OTP ra console/terminal để kiểm tra mà không tốn chi phí SMS.
    """
    def send_otp(self, phone: str, otp: str, expire_minutes: int = 5) -> tuple[bool, str]:
        message = f"Ma OTP AgriTrace cua ban la: {otp}. Hieu luc trong {expire_minutes} phut. Vui long khong chia se ma nay."
        border = "=" * 64
        print(f"\n{border}")
        print(f" [SMS GATEWAY - CONSOLE MOCK]")
        print(f" So dien thoai : {phone}")
        print(f" Ma OTP        : {otp}")
        print(f" Noi dung      : {message}")
        print(f"{border}\n", flush=True)
        logger.info("Sent mock SMS OTP to %s: %s", phone, otp)
        return (True, "Console Mock")


class ESmsProvider(BaseSMSProvider):
    """
    Provider tích hợp dịch vụ eSMS.vn (Cổng SMS Việt Nam).
    """
    def __init__(self, api_key: str, secret_key: str, brandname: str = "AgriTrace", sms_type: str = "4"):
        self.api_key = api_key.strip()
        self.secret_key = secret_key.strip()
        self.brandname = brandname.strip()
        self.sms_type = sms_type.strip()
        self.endpoint = "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/"

    def send_otp(self, phone: str, otp: str, expire_minutes: int = 5) -> tuple[bool, str]:
        if not self.api_key or not self.secret_key or "your_esms" in self.api_key:
            err = "Chưa cấu hình API Key hoặc Secret Key của eSMS trong backend/.env"
            logger.error(err)
            print(f"\n[eSMS CẢNH BÁO] {err}\n")
            return (False, err)

        if self.brandname.lower() == "baotrixemay":
            # Template mặc định đã được eSMS duyệt sẵn cho Brandname Baotrixemay
            content = f"{otp} la ma dat lai mat khau Baotrixemay cua ban"
        else:
            content = f"Ma OTP cua ban la {otp}. Hieu luc trong {expire_minutes} phut."
        clean_phone = phone.strip().replace(" ", "").replace("-", "")
        if clean_phone.startswith("+84"):
            clean_phone = "0" + clean_phone[3:]

        payload = {
            "ApiKey": self.api_key,
            "SecretKey": self.secret_key,
            "Content": content,
            "Phone": clean_phone,
            "SmsType": self.sms_type,  # 8: Đầu số cố định (gửi OTP), 2: Brandname CSKH
            "IsUnicode": "0",
            "SendDate": ""
        }
        if self.sms_type == "2" and self.brandname:
            payload["Brandname"] = self.brandname

        try:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.endpoint,
                data=req_data,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=12) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                code_result = str(result.get("CodeResult", ""))
                if code_result in ("100", 100):
                    sms_id = result.get("SMSID", "")
                    logger.info("Gui SMS eSMS thanh cong den %s (SMSID: %s)", clean_phone, sms_id)
                    print(f"\n[eSMS SUCCESS] Đã gửi mã OTP tới {clean_phone} thành công! SMSID: {sms_id}\n")
                    return (True, "Thành công")
                else:
                    error_msg = result.get("ErrorMessage", "")
                    meaning = ESMS_ERROR_MAP.get(code_result, error_msg or "Lỗi từ eSMS")
                    full_err = f"Nhà mạng eSMS từ chối gửi tin [Mã {code_result}]: {meaning}"
                    logger.error(full_err)
                    print(f"\n[eSMS ERROR] {full_err}\n")
                    return (False, full_err)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.error("Lỗi HTTP eSMS %s: %s", e.code, err_body)
            print(f"\n[eSMS HTTP ERROR] {e.code}: {err_body}\n")
            return (False, f"Lỗi máy chủ eSMS HTTP {e.code}: {err_body}")
        except Exception as e:
            logger.error("Loi khi goi eSMS API: %s", str(e))
            print(f"\n[eSMS EXCEPTION]: {str(e)}\n")
            return (False, f"Không thể kết nối đến máy chủ eSMS: {str(e)}")


class TwilioSMSProvider(BaseSMSProvider):
    """
    Provider gửi SMS quốc tế & Việt Nam thông qua Twilio REST API.
    Có gói Trial $15 miễn phí để nhận SMS thật về số điện thoại cá nhân.
    """
    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = account_sid.strip()
        self.auth_token = auth_token.strip()
        self.from_number = from_number.strip()

    def send_otp(self, phone: str, otp: str, expire_minutes: int = 5) -> tuple[bool, str]:
        if not self.account_sid or not self.auth_token or not self.from_number or "your_twilio" in self.account_sid:
            err = "Chưa điền đầy đủ Twilio Account SID, Auth Token hoặc Phone Number trong backend/.env"
            logger.error(err)
            print(f"\n[Twilio CẢNH BÁO] {err}\n")
            return (False, err)

        to_phone = to_e164_vn(phone)
        message = f"Ma OTP AgriTrace cua ban la: {otp}. Hieu luc trong {expire_minutes} phut."
        endpoint = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"

        data = urllib.parse.urlencode({
            "To": to_phone,
            "From": self.from_number,
            "Body": message
        }).encode("utf-8")

        auth_string = f"{self.account_sid}:{self.auth_token}"
        auth_header = "Basic " + base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")

        req = urllib.request.Request(endpoint, data=data, method="POST")
        req.add_header("Authorization", auth_header)
        req.add_header("Content-Type", "application/x-www-form-urlencoded")

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status in (200, 201):
                    logger.info("Gui SMS Twilio thanh cong den %s", to_phone)
                    print(f"\n[Twilio SMS SUCCESS] Đã gửi mã OTP thực qua SMS tới {to_phone}!\n")
                    return (True, "Thành công")
                return (False, f"Twilio trả về trạng thái HTTP {resp.status}")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="ignore")
            logger.error("Twilio HTTP Error %s: %s", e.code, error_body)
            print(f"\n[Twilio SMS ERROR] HTTP {e.code}: {error_body}\n")
            return (False, f"Twilio từ chối gửi tin [HTTP {e.code}]: {error_body}")
        except Exception as e:
            logger.error("Loi khi goi Twilio API: %s", str(e))
            print(f"\n[Twilio SMS EXCEPTION]: {str(e)}\n")
            return (False, f"Không thể kết nối đến Twilio: {str(e)}")


class SpeedSMSProvider(BaseSMSProvider):
    """
    Provider tích hợp dịch vụ SpeedSMS.vn.
    """
    def __init__(self, access_token: str):
        self.access_token = access_token.strip()
        self.endpoint = "https://api.speedsms.vn/index.php/sms/send"

    def send_otp(self, phone: str, otp: str, expire_minutes: int = 5) -> tuple[bool, str]:
        if not self.access_token:
            err = "Chưa điền SPEEDSMS_ACCESS_TOKEN trong backend/.env"
            logger.error(err)
            print(f"\n[SpeedSMS WARNING] {err}\n")
            return (False, err)

        message = f"Ma OTP AgriTrace cua ban la {otp}. Hieu luc trong {expire_minutes} phut."
        clean_phone = phone.strip().replace(" ", "").replace("-", "")
        if clean_phone.startswith("+84"):
            clean_phone = "0" + clean_phone[3:]

        payload = {
            "to": [clean_phone],
            "content": message,
            "sms_type": 2  # 2: CSKH/OTP
        }

        auth_header = "Basic " + base64.b64encode(f"{self.access_token}:x".encode("utf-8")).decode("utf-8")
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.endpoint,
            data=req_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": auth_header
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                result = json.loads(resp.read().decode("utf-8"))
                if result.get("status") == "success":
                    logger.info("Gui SMS SpeedSMS thanh cong den %s", clean_phone)
                    print(f"\n[SpeedSMS SUCCESS] Đã gửi mã OTP tới {clean_phone}!\n")
                    return (True, "Thành công")
                else:
                    msg = result.get("message", "Lỗi không xác định")
                    logger.error("SpeedSMS tra ve loi: %s", msg)
                    print(f"\n[SpeedSMS ERROR]: {msg}\n")
                    return (False, f"SpeedSMS báo lỗi: {msg}")
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            logger.error("Lỗi SpeedSMS HTTP %s: %s", e.code, err_body)
            print(f"\n[SpeedSMS HTTP ERROR] {e.code}: {err_body}\n")
            return (False, f"SpeedSMS lỗi HTTP {e.code}: {err_body}")
        except Exception as e:
            logger.error("Loi khi goi SpeedSMS API: %s", str(e))
            print(f"\n[SpeedSMS EXCEPTION]: {str(e)}\n")
            return (False, f"Không thể kết nối đến SpeedSMS: {str(e)}")


def get_sms_provider() -> BaseSMSProvider:
    provider = settings.sms_provider.lower().strip()
    if provider == "esms":
        return ESmsProvider(
            api_key=settings.esms_api_key,
            secret_key=settings.esms_secret_key,
            brandname=settings.esms_brandname,
            sms_type=settings.esms_sms_type
        )
    elif provider == "twilio":
        return TwilioSMSProvider(
            account_sid=settings.twilio_account_sid,
            auth_token=settings.twilio_auth_token,
            from_number=settings.twilio_from_number
        )
    elif provider == "speedsms":
        return SpeedSMSProvider(
            access_token=settings.speedsms_access_token
        )
    return ConsoleSMSProvider()


def send_sms_otp(phone: str, otp: str, expire_minutes: int = 5) -> tuple[bool, str]:
    """Hàm helper tiện lợi gửi mã OTP SMS, trả về (thành_công, thông_báo)."""
    provider = get_sms_provider()
    return provider.send_otp(phone, otp, expire_minutes)


