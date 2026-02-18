
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.simple_config import settings
from typing import List, Dict

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.enabled = False # Default disabled until config checked
        # In real scenario, we load config from DB or settings
        
    async def send_email(self, to_email: str, subject: str, html_content: str):
        if not to_email:
            return
            
        # MOCK SENDING for now to avoid blocking if no SMTP
        # In production, replace with aiosmtplib or background task
        logger.info(f"[[MOCK EMAIL]] To: {to_email} | Subject: {subject}")
        # logger.debug(f"Body: {html_content[:100]}...")
        return True

    async def send_bulk(self, separate_emails: List[Dict]):
        # separate_emails = [{to, subject, body}, ...]
        count = 0
        for email in separate_emails:
            await self.send_email(email['to'], email['subject'], email['body'])
            count += 1
        return count

email_service = EmailService()
