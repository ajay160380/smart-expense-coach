# RBI Account Aggregator (AA) Architecture & Integration Guide

**Document Version:** 1.0  
**Target Platform:** PaisaMitra / Smart Expense Coach (`smart-expense-coach`)  
**Status:** Architectural Blueprint & Future Implementation Guide  

---

## 1. Executive Summary & Why RBI AA is the Future of Bank Sync

In India, automated expense tracking has evolved through three distinct generations:

1. **SMS Scraping (Legacy - Deprecated):**
   - Historically used by Walnut, Money View.
   - **Google Play Restrictions:** Google Play strictly restricts `READ_SMS` and `RECEIVE_SMS` permissions to default SMS apps only. Using SMS permissions for financial tracking results in immediate Play Store rejection.
2. **Notification Listener Service (Current Phase 9.3):**
   - High privacy, device-local, zero API costs.
   - **Limitations:** Dependent on aggressive OEM battery optimizations (MIUI, ColorOS, OneUI killing background services) and payment apps actually posting a persistent push notification.
3. **RBI Account Aggregator Framework (The Gold Standard):**
   - Introduced by the Reserve Bank of India (RBI) under the *Non-Banking Financial Company - Account Aggregator (NBFC-AA) Directions, 2016*.
   - **Official, direct, bank-grade API:** Connects directly with Indian banks (HDFC, SBI, ICICI, Axis, Kotak, PNB, etc.) via RBI-regulated consent managers.
   - **100% Reliability:** Does not rely on phone notifications, lockscreen states, or SMS delivery. Every debit and credit is verified directly by the core banking system (CBS).
   - Used by top fintechs: PhonePe, CRED, Fold Money, Fi Money, and Jupiter.

---

## 2. Core Architecture: FIP -> AA -> FIU

```
+-------------------------------------------------------------+
|                     USER (PaisaMitra App)                   |
+-------------------------------------------------------------+
        |                                             ^
        | 1. Initiates Link (Select Bank & Mobile)     | 3. Approves Consent
        v                                             |    via Bank OTP
+-------------------------------------------------------------+
|                ACCOUNT AGGREGATOR (AA Partner)              |
|                   (e.g., Setu, Finvu, OneMoney)             |
+-------------------------------------------------------------+
        |                                             ^
        | 2. Requests Consent                         | 4. Delivers Encrypted
        v                                             |    Financial Data (JSON)
+-------------------------------------------------------------+
|            FINANCIAL INFORMATION PROVIDER (FIP)             |
|          (User's Bank: HDFC, SBI, ICICI, Axis, etc.)        |
+-------------------------------------------------------------+
        |
        | 5. Forward Encrypted FI Data (Digitally Signed)
        v
+-------------------------------------------------------------+
|            FINANCIAL INFORMATION USER (FIU)                 |
|             (PaisaMitra Django Backend API)                 |
|                                                             |
|  * Decrypts with Private Key                                |
|  * Normalizes to: amount, merchant, source="bank", txn_id   |
|  * Calls process_auto_expense() -> Zero DB Schema Changes!  |
+-------------------------------------------------------------+
```

### Entity Roles:
1. **FIP (Financial Information Provider):** The institution holding the user's financial accounts (Banks, Mutual Funds, Depositories).
2. **AA (Account Aggregator):** RBI-licensed consent broker that facilitates encrypted transmission without reading or storing data.
3. **FIU (Financial Information User):** Our application and backend service that ingests transaction data solely to categorize and display expenses to the user.

---

## 3. Candidate Partner Comparison

| Feature / Metric | **Setu (Pine Labs)** *(Recommended)* | **Finvu (Cookiejar)** | **OneMoney** |
| :--- | :--- | :--- | :--- |
| **Developer Experience** | ⭐️⭐️⭐️⭐️⭐️ Modern REST APIs, Postman collections, rich docs | ⭐️⭐️⭐️ Enterprise-focused documentation | ⭐️⭐️⭐️ Good technical specs |
| **SDK & Mobile Integration** | Prebuilt React Native / Expo WebView SDK | Native Android / iOS SDKs | REST API + Custom WebView |
| **Sandbox & Mock Bank** | Instant sandbox with mock SBI/HDFC accounts & sample transactions | Sandbox available upon onboarding | Sandbox available |
| **Bank (FIP) Coverage** | 100% of major Indian public & private banks | 100% major banks | 100% major banks |
| **Pricing Model** | ~₹2.00 - ₹3.50 per successful consent pull | Tiered monthly commitment | Volume-based |
| **Best Suited For** | Fast startup deployment, high developer velocity | Established financial institutions | High-volume enterprise |

**Recommendation:** **Setu AA (Bridge by Pine Labs)** is the premier choice for PaisaMitra due to its comprehensive React Native SDK, instant sandbox sandbox simulator, and seamless webhook integration.

---

## 4. End-to-End User Experience & Consent Lifecycle

1. **User Discovery:** User taps "Link Bank Account (100% Auto-Sync)" in Profile Settings.
2. **Consent Details Displayed:**
   - Purpose: Personal expense coaching & budgeting.
   - Frequency: Periodic daily sync (e.g. at 11:30 PM).
   - Data requested: Only Savings/Current account debit transactions (no loan data, no investments).
   - Duration: Valid for 365 days (user can revoke anytime in 1 tap).
3. **OTP Verification:** The user receives an OTP directly from their bank (FIP) to authorize linking.
4. **Automated Background Fetch:**
   - Once linked, the FIU backend receives scheduled transaction updates or triggers a daily pull.
   - Transactions are ingested silently with `source='bank'`.

---

## 5. Privacy, Data Minimisation & Security Guidelines

- **Zero Third-Party Sharing:** Financial data is never shared with third-party advertisers, credit bureaus, or marketing partners.
- **Data Minimisation:**
  - We only ingest: Transaction timestamp, Debit Amount, Narration / Counterparty, Unique Reference Number (UTR / Bank Ref ID).
  - We **do not store** full account numbers (only masked `****1234`).
  - We **do not store** raw bank credentials or NetBanking passwords (AA never asks for passwords).
- **Encryption Standards:**
  - In Transit: TLS 1.3 with forward secrecy.
  - End-to-end data transfer between FIP and FIU is encrypted using **ReBIT-standard ECC key pairs** (Curve25519 / ECDH) ensuring even the AA partner cannot read transaction payloads.
  - At Rest: Database columns are encrypted using AES-256 where applicable.
- **Play Store Data Safety Declaration:**
  - Category: Financial Info -> Other Financial Info (Transaction history).
  - Purpose: App Functionality (Expense tracking & budget management).
  - User Deletion: Users can delete their data and account at any time via Profile Settings.

---

## 6. Unit Economics & User Pricing

### Will users be charged ₹2-₹3?
**No. In consumer apps, users are never charged for bank linking.**
- The cost (~₹2 to ₹3 per consent or periodic pull) is an operational API cost paid directly by the platform to the AA partner.
- **Freemium Strategy:**
  - **Free Tier:** Android Notification Listener (100% free, device-local).
  - **Premium / Pro Tier (e.g. ₹49/month or ₹299/year):** Direct Bank Sync via RBI Account Aggregator with real-time CBS reconciliation.
- At ₹49/month, the platform easily absorbs the ₹2-₹3 monthly sync cost while delivering 90%+ gross margin.

---

## 7. Zero-Schema-Change Drop-in Interface

To ensure that integrating Setu or Finvu in the future requires **zero database migrations**, the AA sync service directly bridges into the Phase 9.3 auto-expense pipeline (`process_auto_expense` or `POST /api/auto-expense/`).

### Canonical Transaction Ingestion Interface

```python
# backend/tracker/account_aggregator_service.py

from decimal import Decimal
from datetime import datetime
from tracker.auto_expense_service import process_auto_expense

def ingest_account_aggregator_transaction(
    user,
    bank_name: str,
    bank_txn_id: str,
    amount: Decimal,
    narration: str,
    txn_type: str, # "DEBIT" or "CREDIT"
    timestamp: datetime
) -> dict:
    """
    Ingests a decrypted bank transaction from an RBI Account Aggregator webhook/pull.
    Normalizes the payload into the Phase 9 auto-expense engine.
    """
    # 1. Skip credits, interest deposits, refunds if only tracking debits
    if str(txn_type).upper() != "DEBIT":
        return {"status": "skipped", "reason": "non_debit_transaction"}

    # 2. Extract clean merchant / payee from bank narration
    # Example: "UPI/503412984501/SWIGGY BANGALORE/PAYTM" -> "SWIGGY"
    clean_merchant = extract_merchant_from_narration(narration)

    # 3. Call canonical Phase 9 auto-expense processor
    # Uses bank_txn_id as client_txn_id for guaranteed idempotency
    result = process_auto_expense(
        user=user,
        amount=amount,
        merchant=clean_merchant or bank_name,
        source="bank",
        timestamp=timestamp,
        client_txn_id=f"aa_{bank_name.lower()}_{bank_txn_id}"
    )

    return result
```

By adhering to this interface, connecting a live AA provider requires only:
1. Setting partner credentials (`SETU_CLIENT_ID`, `SETU_CLIENT_SECRET`, `AA_PRIVATE_KEY_PEM`).
2. Receiving the AA webhook and invoking `ingest_account_aggregator_transaction`.
3. All existing category mapping, memory learning, budget alerts, and deduplication logic automatically apply with zero changes!

