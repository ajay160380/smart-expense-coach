# Production Launch & Security Checklist

Complete each of the following sections before launching Expense Tracker to production.

---

## 1. Supabase / Database Credential Rotation

Because historical git commits previously contained connection strings, rotate the database password before production launch:
1. Log into your **Supabase Dashboard** (or PostgreSQL provider).
2. Go to **Project Settings** → **Database** → **Database Password**.
3. Click **Reset database password** and generate a strong 32+ character random password.
4. Copy the newly generated connection string (`postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`).
5. Update `DATABASE_URL` in your **Render Environment Variables** (see Section 2 below).
6. Verify database connectivity using `/health/`.

---

## 2. Render Environment Variables Configuration

Set these environment variables in your **Render Dashboard** under **Environment**:

### Required Production Variables (Application will fail to start if missing)
| Variable | Description | Example / Note |
| -------- | ----------- | -------------- |
| `DJANGO_SECRET_KEY` | High-entropy secret key for Django sessions and signing | Generate via `openssl rand -base64 48` |
| `DATABASE_URL` | Production PostgreSQL connection URL | `postgresql://user:pass@host:5432/dbname` |
| `DAILY_TIP_SECRET` | Secret token to authenticate daily tip scheduler triggers | Generate via `openssl rand -hex 24` |
| `ADMIN_PUSH_SECRET` | Secret token to authenticate admin push notifications | Generate via `openssl rand -hex 24` |
| `INTERNAL_BOT_SECRET` | Shared secret header between Node.js bot and Django API | Generate via `openssl rand -hex 24` |
| `GROQ_API_KEY` | API Key for Groq AI inference | Starts with `gsk_...` |

### Recommended Production Variables
| Variable | Description | Default / Recommended |
| -------- | ----------- | --------------------- |
| `DEBUG` | Enable/disable debug mode in Django | `False` |
| `ALLOWED_HOSTS` | Comma-separated list of allowed domains | `expense-coach-prxm.onrender.com,localhost,127.0.0.1` |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated list of trusted origins | `https://expense-coach-prxm.onrender.com` |
| `GROQ_MODEL` | Groq AI model name | `qwen/qwen3.8-27b` |
| `GROQ_TIMEOUT` | Timeout in seconds for AI completions | `30.0` |
| `NUM_PROXIES` | Number of reverse proxies in front of Django (Render uses 1) | `1` |
| `SENTRY_DSN` | Sentry DSN for error monitoring | (Optional Sentry URL) |
| `ENVIRONMENT` | Environment name | `production` |
| `DEFAULT_FROM_EMAIL` | Sender address for transactional emails | `noreply@smart-expense-coach.com` |
| `RESEND_API_KEY` | API Key for Resend transactional email service | (From Resend dashboard) |
| `FIREBASE_CREDENTIALS_PATH` | Path to Firebase admin JSON service account file | `backend/firebase-service-account.json` |

---

## 3. Git History Sanitization (`git-filter-repo`)

To purge leaked secrets from git commit history without altering current code:
> **Note:** Run this on a separate machine or clean clone before pushing final history rewrite.

```bash
# 1. Install git-filter-repo
pip install git-filter-repo

# 2. Make a fresh backup mirror clone
git clone --mirror git@github.com:ajay160380/smart-expense-coach.git backup-repo.git

# 3. Create a replace expressions file expressions.txt
cat << 'EOF' > expressions.txt
# Replace old database passwords or tokens:
regex:postgres:[a-zA-Z0-9_#$]+@==>postgres:REDACTED_SECRET@
regex:gsk_[a-zA-Z0-9_]{30,}==>gsk_REDACTED_GROQ_KEY
regex:re_[a-zA-Z0-9_]{24,}==>re_REDACTED_RESEND_KEY
EOF

# 4. Run git-filter-repo
git-filter-repo --replace-text expressions.txt

# 5. Remove untracked large APK files from history if desired:
git-filter-repo --invert-paths --path backend/tracker/static/downloads/ExpenseTracker.apk

# 6. Force push cleanly to remote
git push origin --force --all
git push origin --force --tags
```

---

## 4. Google Play Console Data Safety Form

When submitting the Android app to Google Play, complete the **Data Safety** section as follows:

### Data Collection & Purpose
1. **Financial Info:**
   - **User Payment Info / Expenses:** Collected for App Functionality (Expense tracking, budget calculation, category analytics). Tied to User Account.
2. **Audio / Voice Recording:**
   - **Microphone:** Optional. Used strictly for voice expense logging (transcription via Groq Whisper API). Audio is transiently processed and not permanently stored.
3. **Photos / Receipts:**
   - **Camera / Photos:** Optional. Used strictly for scanning receipt amounts via OCR.
4. **Device or Other IDs:**
   - **FCM Push Notification Token:** Collected for App Functionality (sending user-requested budget tips, expense reminders).
5. **Personal Info:**
   - **Name, Email Address, Phone Number:** Collected for Account Management, OTP verification, and WhatsApp integration.

### Security Practices
- **Data Encrypted in Transit:** Yes. All traffic between the mobile app, bot, and backend is encrypted using HTTPS / TLS 1.3.
- **Data Deletion Mechanism:** Yes. Users can request immediate account and data deletion directly at `/delete-account/` or inside the app settings.
