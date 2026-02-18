
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any
import asyncio

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        pass
        
    def _send_sync(self, to_email: str, subject: str, html_content: str, config: Dict[str, Any]):
        host = config.get("host")
        if not host:
            logger.info(f"[[MOCK EMAIL]] (No Host) To: {to_email} | Subject: {subject}")
            return False

        try:
            port = config.get("port", 587)
            user = config.get("user")
            password = config.get("password")
            sender = config.get("sender", "noreply@checkit.com")

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = sender
            msg["To"] = to_email

            part = MIMEText(html_content, "html")
            msg.attach(part)

            # Connect
            with smtplib.SMTP(host, port) as server:
                server.starttls()
                if user and password:
                    server.login(user, password)
                server.sendmail(sender, to_email, msg.as_string())
            
            logger.info(f"[[SMTP EMAIL]] Sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    async def send_bulk(self, separate_emails: List[Dict], smtp_config: Dict[str, Any] = {}):
        # separate_emails = [{to, subject, body}, ...]
        # smtp_config = {host, port, user, password, sender}
        
        loop = asyncio.get_event_loop()
        count = 0
        
        # In a real heavy app, use a queue worker (Celery/ARQ)
        # Here we just run in thread pool
        for email in separate_emails:
            # Run blocking SMTP in thread
            result = await loop.run_in_executor(
                None, 
                lambda: self._send_sync(email['to'], email['subject'], email['body'], smtp_config)
            )
            if result:
                count += 1
                
        return count

email_service = EmailService()
