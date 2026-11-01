# Security Policy

## Reporting Security Vulnerabilities

We take the security of Expense Tracker and user financial data seriously. If you believe you have found a security vulnerability in our codebase, APIs, WhatsApp bot, or mobile app, please report it responsibly.

### How to Report
- **Email:** `security@smart-expense-coach.com` (or open a confidential GitHub Security Advisory).
- Please include:
  1. Description of the vulnerability.
  2. Proof of Concept (PoC) steps or script to reproduce.
  3. Potential impact and attack scenarios.
  4. Suggested remediation if available.

### Our Commitment
- **Initial Response:** Within 24-48 hours acknowledging receipt.
- **Triage & Fix:** Critical vulnerabilities will be patched and deployed within 7 business days.
- **Credit:** We will gladly credit security researchers in our release notes upon verified resolution.

---

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.3.2 (Build 8+) | :white_check_mark: |
| 1.3.1 and older | :x: |

---

## Security Architecture & Controls

### 1. Authentication & Token Management
- DRF API Tokens expire after **30 days of inactivity**. Each successful authenticated request updates the token's activity timestamp.
- Passwords are encrypted using Django's PBKDF2 with SHA-256 password hasher.
- One-Time Passwords (OTPs) are generated cryptographically using `secrets.randbelow()` and stored using salted SHA-256 digests.
- Timing attack mitigations: all sensitive token, OTP, and internal header checks use `hmac.compare_digest`.

### 2. Internal Microservice Authentication
- Communication between the Node.js WhatsApp bot and Django backend requires the `X-Internal-Secret` header matching `INTERNAL_BOT_SECRET`.
- Admin and cron trigger endpoints require `DAILY_TIP_SECRET` or `ADMIN_PUSH_SECRET`.

### 3. Rate Limiting & Abuse Prevention
- DRF ScopedRateThrottle limits authentication attempts (`/api/login/`, `/api/reset-password/`) and OTP requests (`/api/send-otp/`, `/api/verify-otp/`).
- Outbound OTP requests are strictly limited to a maximum of 5 sends per hour per phone or email address.
- Public split share links are throttled per IP and per split token.

### 4. Injection Protection & Data Integrity
- All database queries use the Django ORM with parameterized SQL queries.
- Raw SQL queries are prohibited in application views.
- Input validation sanitizes expense categories, split amounts, user notes, and feedback.
- Public client IP addresses are resolved safely with bounded proxy trust (`NUM_PROXIES` setting) to prevent IP spoofing attacks.

### 5. Sensitive Data Redaction
- Application logs never print user passwords, tokens, full credit card/UPI details, or third-party API keys.
- Sentry error monitoring is configured with `send_default_pii=False`.
