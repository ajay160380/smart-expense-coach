# PaisaMitra (Smart Expense Coach) — API & Bot Baseline Specification

> **Version:** 1.3.2 (Build 8)  
> **Date:** Baseline captured on branch `prod-hardening`  
> **Status:** Reference specification for backward compatibility verification across all hardening phases.

---

## 1. Authentication & Session Management

### 1.1 User Registration
- **Endpoint:** `POST /api/register/`
- **Auth:** None
- **Request Body (JSON):**
  ```json
  {
    "username": "user123",
    "email": "user@example.com",
    "password": "SecurePassword123",
    "phone": "9876543210"
  }
  ```
- **Response Shapes:**
  - *Success (201 Created):*
    ```json
    {
      "status": "success",
      "message": "User registered successfully!",
      "token": "<auth_token>",
      "user": {
        "id": 1,
        "username": "user123",
        "email": "user@example.com",
        "phone": "9876543210"
      }
    }
    ```
  - *Validation Failure (400 Bad Request):*
    ```json
    {
      "status": "error",
      "message": "Username already exists."
    }
    ```

### 1.2 User Login (Password)
- **Endpoint:** `POST /api/login/`
- **Auth:** None
- **Request Body (JSON):**
  ```json
  {
    "identifier": "user123",  // username, email, or phone
    "password": "SecurePassword123"
  }
  ```
- **Response Shapes:**
  - *Success (200 OK):*
    ```json
    {
      "status": "success",
      "token": "<auth_token>",
      "user": {
        "id": 1,
        "username": "user123",
        "email": "user@example.com",
        "phone": "9876543210",
        "name": "User Name"
      }
    }
    ```
  - *Invalid Credentials (400 Bad Request):*
    ```json
    {
      "status": "error",
      "message": "Invalid password."
    }
    ```

### 1.3 OTP Authentication Flow
- **Send OTP:** `POST /api/auth/send-otp/`
  - Body: `{"identifier": "9876543210", "type": "phone"|"email", "purpose": "login"|"reset"}`
  - Response: `{"status": "success", "message": "OTP sent successfully."}`
- **Verify OTP:** `POST /api/auth/verify-otp/`
  - Body: `{"identifier": "9876543210", "otp": "123456"}`
  - Response: `{"status": "success", "message": "OTP verified successfully."}`
- **Login via OTP:** `POST /api/auth/login-otp/`
  - Body: `{"identifier": "9876543210", "otp": "123456"}`
  - Response: `{"status": "success", "token": "<token>", "user_id": 1, "username": "user123", ...}`
- **Reset Password via OTP:** `POST /api/auth/reset-password/`
  - Body: `{"identifier": "9876543210", "otp": "123456", "new_password": "NewPassword123"}`
  - Response: `{"message": "Password reset successfully. You can now login."}`

### 1.4 Logout & Account Deletion
- **Logout:** `POST /api/logout/`
  - Auth: Token (`Authorization: Token <token>`)
  - Response: `{"status": "success", "message": "Logged out successfully."}`
- **Delete Account (App):** `POST /api/auth/delete-account/`
  - Auth: Token (`Authorization: Token <token>`)
  - Response: `{"status": "success", "message": "Account and all associated data permanently deleted."}`

---

## 2. Expense Management APIs

### 2.1 Quick Add Expense
- **Endpoint:** `POST /api/quick-add/`
- **Auth:** Token (`Authorization: Token <token>`)
- **Request Body (JSON):**
  ```json
  {
    "amount": 250.00,
    "category": "Food",
    "description": "Lunch with team",
    "payment_method": "UPI",
    "date": "2026-11-01"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Expense added successfully!",
    "expense": {
      "id": 101,
      "amount": 250.0,
      "category": "Food",
      "description": "Lunch with team",
      "payment_method": "UPI",
      "date": "2026-11-01"
    }
  }
  ```

### 2.2 Edit Expense
- **Endpoint:** `POST /api/edit-expense/<int:pk>/`
- **Auth:** Token
- **Request Body (JSON):** `{"amount": 300, "category": "Food", "description": "Lunch updated", "payment_method": "UPI", "date": "2026-11-01"}`
- **Response (200 OK):** `{"status": "success", "message": "Expense updated successfully!", "expense": {...}}`

### 2.3 Delete Expense
- **Endpoint:** `POST /api/delete-expense/<int:pk>/`
- **Auth:** Token
- **Response (200 OK):** `{"status": "success", "message": "Expense deleted successfully!"}`

### 2.4 Transactions History
- **Endpoint:** `GET /api/transactions-history/`
- **Auth:** Token
- **Query Params:** `month` (1-12), `year` (e.g. 2026), `category` (optional), `page` (optional)
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "expenses": [...],
    "total_spent": 14500.0,
    "count": 42
  }
  ```

---

## 3. Voice Expense & WhatsApp Integration

### 3.1 Voice Expense Endpoint
- **Endpoint:** `POST /api/voice-expense/`
- **Dual-Mode Operation:**
  1. **Mobile / Web App Mode:** Authenticated user session or Token. Accepts JSON `{"text": "500 petrol"}` or Multipart Audio `audio: <binary_file>`.
  2. **WhatsApp Bot Mode:** Incoming JSON payload with `phone`, `text`, `name`, `message_id`, `sender_id`.
- **Payload (WhatsApp Mode):**
  ```json
  {
    "phone": "919876543210",
    "text": "250 chai biscuit",
    "name": "Ajay",
    "message_id": "ABC12345XYZ",
    "sender_id": "919876543210@s.whatsapp.net"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "message": "✅ *₹250* kharcha jud gaya!\n📂 Category: Food\n📝 Note: chai biscuit\n💰 Aaj ka total: ₹750",
    "expense": {
      "amount": 250.0,
      "category": "Food",
      "description": "chai biscuit"
    }
  }
  ```
  *(Or if report requested, returns PDF base64 media object)*:
  ```json
  {
    "status": "success",
    "message": "📊 Aapka Monthly Report",
    "media": {
      "base64": "<base64_data>",
      "mimetype": "application/pdf",
      "filename": "Expense_Report.pdf"
    }
  }
  ```

### 3.2 WhatsApp Summary Endpoint
- **Endpoint:** `POST /api/whatsapp-summary/`
- **Payload:** `{"phone": "919876543210"}`
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "summary": "📊 *PaisaMitra Financial Snapshot* ...",
    "lifetime_spent": 45000,
    "month_spent": 12000,
    "remaining_budget": 8000
  }
  ```

### 3.3 WhatsApp Bot Commands Baseline
- `500 petrol` / `250 chai` / `1200 dinner with Aman` -> Add expense with automatic NLP category & payment method.
- `today summary` / `aaj ka kharcha` -> Returns today's total spending and itemized list.
- `month summary` / `is mahine ka kharcha` -> Returns current month budget status and category breakdown.
- `safe to spend` / `daily limit` -> Calculates safe daily spending limit based on remaining monthly budget.
- `trip link` / `active trip link` / `split link` -> Returns link to active trip / split expense web view.
- `link <number>` / `link <code>` -> WhatsApp account linking mechanism.
- `!push <1-6>` (Admin only) -> Sends predefined app push notification template.
- `!custom_push <Title> | <Message>` (Admin only) -> Broadcasts custom push notification.
- `!broadcast <Message>` (Admin only) -> Broadcasts WhatsApp announcement to all users.
- `!trigger_morning` / `!trigger_night` (Admin only) -> Manually initiates daily tips distribution.

---

## 4. AI Financial Coach

### 4.1 AI Chat Endpoint
- **Endpoint:** `POST /ai_chat/`
- **Auth:** Token or Session
- **Payload:** `{"message": "How can I reduce my food expenses?", "history": [...]}`
- **Response (200 OK):**
  ```json
  {
    "response": "Based on your spending this month...",
    "status": "success"
  }
  ```

---

## 5. Analytics, Projections & Diagnostics

### 5.1 Analytics Data
- **Endpoint:** `GET /api/analytics/`
- **Auth:** Token
- **Response:** Category totals, monthly trend, top expenses, percentage allocations.

### 5.2 Safe to Spend
- **Endpoint:** `GET /api/safe-to-spend/`
- **Auth:** Token
- **Response:** Daily safe spending amount, days left in cycle, budget pacing status.

### 5.3 Heatmap & Anomalies
- **Heatmap:** `GET /api/heatmap/` -> Day-by-day expenditure matrix.
- **Anomalies:** `GET /api/anomalies/` -> Unusual spikes detected in spending.

---

## 6. Expense Splits & Group Sharing

### 6.1 Private Splits API
- `GET /api/splits/` -> List user's split groups.
- `POST /api/splits/create/` -> Create group `{"name": "Goa Trip", "members": ["Ajay", "Aman"]}`.
- `POST /api/splits/<int:pk>/add-expense/` -> Add expense within group.
- `GET /api/splits/<int:pk>/summary/` -> Debt balances & settlement calculations.
- `POST /api/splits/<int:pk>/settle/` -> Record settlement between members.
- `POST /api/splits/<int:pk>/delete/` -> Delete split group.

### 6.2 Public Splits (Token-based URL)
- **Public Split Data:** `GET /api/public-split/<str:share_token>/`
  - Auth: None (Token in URL)
  - Response: Group name, members, expenses, debts, settled status.
- **Public Add Expense:** `POST /api/public-split/<str:share_token>/add/`
  - Payload: `{"title": "Dinner", "amount": 1200, "paid_by": "Ajay", "split_among": ["Ajay", "Aman"]}`
- **Public Settle:** `POST /api/public-split/<str:share_token>/settle/`
  - Payload: `{"debtor": "Aman", "creditor": "Ajay", "amount": 600}`
- **Public Toggle Settled:** `POST /api/public-split/<str:share_token>/toggle-settle/`

---

## 7. Savings Goals, Subscriptions & Notes

### 7.1 Savings Goals
- `GET /api/savings-goals/` -> List all goals with progress.
- `POST /api/savings-goals/add/` -> `{"name": "iPhone", "target_amount": 75000, "icon": "phone", "deadline": "2026-12-31"}`.
- `POST /api/savings-goals/<pk>/update/` -> Update target or add savings contribution.
- `POST /api/savings-goals/<pk>/delete/` -> Delete goal.

### 7.2 Subscriptions (Recurring Radar)
- `GET /api/subscriptions/` -> List recurring subscriptions, renewals, total monthly commitment.
- `POST /add-sub/` (or API) -> Add subscription.
- `POST /delete-sub/<pk>/` -> Delete subscription.

### 7.3 Notes (Personal Notepad)
- `GET /api/notes/` -> List notes.
- `POST /api/notes/` -> Create note `{"title": "...", "content": "..."}`.
- `POST /api/notes/<pk>/delete/` -> Delete note.

---

## 8. Export & Push Notifications

### 8.1 Export CSV & PDF
- `GET /api/export/csv/` -> Download CSV attachment of expenses.
- `GET /api/export/pdf/` -> Download PDF summary report.

### 8.2 Push Notifications
- `POST /api/update-fcm-token/` -> Update FCM registration token for push notifications.
- `POST /api/trigger-daily-tips/` -> Admin/Bot trigger for daily tips dispatch.
- `POST /api/confirm-tip-sent/` -> Bot confirmation that a tip was delivered to WhatsApp.
- `POST /api/send-admin-push/` -> Admin broadcast push notification.

---

## 9. Current Environment Variables Inventory

| Variable Name | Component | Current Usage | Required in Production |
|---|---|---|---|
| `DJANGO_SECRET_KEY` | Backend | Django secret key (insecure default when DEBUG) | YES (Must be set, cannot have fallback) |
| `DEBUG` | Backend | Debug flag (boolean) | Defaults to False in prod |
| `DATABASE_URL` | Backend / Bot | PostgreSQL / Supabase connection string | YES (Must be set) |
| `ALLOWED_HOSTS` | Backend | Comma-separated allowed hostnames | YES |
| `CORS_ALLOWED_ORIGINS` | Backend | CORS origins | YES |
| `CSRF_TRUSTED_ORIGINS` | Backend | CSRF origins | YES |
| `GROQ_API_KEY` | Backend | Groq LLM & Whisper API key | YES |
| `GROQ_MODEL` | Backend | Groq model identifier | Optional (defaults to llama-3.3-70b-versatile) |
| `DAILY_TIP_SECRET` | Backend / Bot | Shared secret for daily tips dispatch | YES |
| `ADMIN_PUSH_SECRET` | Backend / Bot | Shared secret for admin push notifications | YES |
| `INTERNAL_BOT_SECRET`| Backend / Bot | Shared secret for internal bot communications | YES |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Backend | Firebase admin SDK JSON path / string | YES for push notifications |
| `RESEND_API_KEY` / SMTP | Backend | Email delivery | Optional if using SMTP |
| `SENTRY_DSN` | Backend | Error tracking telemetry | Optional (disabled if empty) |
| `EXPO_PUBLIC_API_URL`| Mobile App | Backend base URL | YES for production app builds |
