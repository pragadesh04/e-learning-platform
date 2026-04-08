import os
import requests
import logging

logger = logging.getLogger(__name__)

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")
FAST2SMS_SENDER_ID = os.getenv("FAST2SMS_SENDER_ID", "TRINITY")
FAST2SMS_URL = "https://www.fast2sms.com/dev/bulkV2"


def send_sms(mobile: str, message: str) -> bool:
    """
    Send SMS using Fast2SMS API
    Returns True if successful, False otherwise
    """
    if not FAST2SMS_API_KEY:
        logger.error("FAST2SMS_API_KEY not configured")
        return False

    try:
        payload = {
            "authorization": FAST2SMS_API_KEY,
            "sender_id": FAST2SMS_SENDER_ID,
            "message": message,
            "language": "english",
            "route": "v3",
            "numbers": mobile,
        }

        headers = {"Cache-Control": "no-cache"}

        response = requests.post(
            FAST2SMS_URL, data=payload, headers=headers, timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            if result.get("return"):
                logger.info(f"SMS sent successfully to {mobile}")
                return True
            else:
                logger.error(f"SMS failed: {result}")
                return False
        else:
            logger.error(
                f"SMS request failed with status {response.status_code}: {response.text}"
            )
            return False

    except requests.exceptions.Timeout:
        logger.error("SMS request timed out")
        return False
    except requests.exceptions.RequestException as e:
        logger.error(f"SMS request failed: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error in send_sms: {str(e)}")
        return False


def send_otp(mobile: str, otp: str) -> bool:
    """
    Send OTP via SMS
    """
    message = f"Your Trinity OTP is {otp}. Valid for 3 minutes. Do not share this OTP."
    return send_sms(mobile, message)
