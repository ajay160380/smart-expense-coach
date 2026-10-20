"""
╔══════════════════════════════════════════════════════════════════════════════╗
║        EXPENSE TRACKER — TRANSACTIONAL EMAIL SERVICE (HTTP & SMTP)          ║
║        Works over HTTPS (Port 443) on Render free tier via Resend API        ║
║        with seamless fallback to Django SMTP for local dev                   ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import requests
from django.conf import settings
from django.core.mail import send_mail

def send_transactional_email(to_email, subject, body, html_body=None):
    """
    Sends transactional email over HTTPS (Port 443) via Resend API to bypass
    Render's firewall on SMTP ports (25, 465, 587).
    Falls back to standard Django SMTP if Resend key is not configured or fails.
    
    Returns:
        (success: bool, info: dict)
    """
    resend_key = (getattr(settings, 'RESEND_API_KEY', '') or os.getenv('RESEND_API_KEY', '')).strip()
    recipients = [to_email] if isinstance(to_email, str) else list(to_email)
    last_error = None

    # 1. Try Resend HTTP API (Port 443 HTTPS - 100% allowed on Render Free Tier)
    if resend_key:
        from_email = getattr(settings, 'RESEND_FROM_EMAIL', 'Expense Tracker <onboarding@resend.dev>')
        try:
            payload = {
                'from': from_email,
                'to': recipients,
                'subject': subject,
                'text': body,
            }
            if html_body:
                payload['html'] = html_body
                
            resp = requests.post(
                'https://api.resend.com/emails',
                headers={
                    'Authorization': f'Bearer {resend_key}',
                    'Content-Type': 'application/json',
                },
                json=payload,
                timeout=12,
            )
            if resp.status_code in (200, 201):
                data = resp.json()
                print(f"✅ Email delivered via Resend HTTP API (id: {data.get('id')}) to {recipients}", flush=True)
                return True, {'provider': 'resend', 'id': data.get('id')}
            else:
                error_detail = resp.text
                try:
                    error_detail = resp.json().get('message', error_detail)
                except Exception:
                    pass
                print(f"⚠️ Resend HTTP API error ({resp.status_code}): {error_detail}", flush=True)
                last_error = f"Resend ({resp.status_code}): {error_detail}"
        except Exception as e:
            print(f"⚠️ Resend API request exception: {e}", flush=True)
            last_error = f"Resend exception: {e}"
    else:
        last_error = "RESEND_API_KEY not configured"

    # 2. Fallback to Django SMTP (works locally, but will hit port 587 firewall on Render free tier)
    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Expense Tracker <gagankumar160380@gmail.com>')
        smtp_recipients = list(recipients)
        host_user = getattr(settings, 'EMAIL_HOST_USER', '')
        if host_user and '@' in host_user and host_user.lower() not in [r.lower() for r in smtp_recipients]:
            smtp_recipients.append(host_user)

        send_mail(
            subject,
            body,
            from_email,
            smtp_recipients,
            html_message=html_body,
            fail_silently=False
        )
        print(f"✅ Email delivered via SMTP to {smtp_recipients}", flush=True)
        return True, {'provider': 'smtp'}
    except Exception as e:
        print(f"⚠️ SMTP send failed: {e}", flush=True)
        return False, {'error': str(e), 'resend_error': last_error}
