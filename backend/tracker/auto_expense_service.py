"""
PHASE 9.3: AUTO-CAPTURE AND BANK TRANSACTION INGESTION SERVICE
Handles idempotency, hash-based deduplication, merchant-to-category mapping,
per-user category memory, and auto-expense review pipeline.
"""

import hashlib
from datetime import datetime, date, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q
from .models import Expense, UserProfile, UserMerchantCategory

MERCHANT_CATEGORY_MAP = {
    # Groceries & Quick-Commerce
    "blinkit": "food",
    "zepto": "food",
    "bigbasket": "food",
    "instamart": "food",
    "bb daily": "food",
    "dmart": "food",
    "nature's basket": "food",
    
    # Food & Dining
    "swiggy": "food",
    "zomato": "food",
    "starbucks": "food",
    "mcdonalds": "food",
    "kfc": "food",
    "dominos": "food",
    "pizza hut": "food",
    "burger king": "food",
    "chaayos": "food",
    "chai point": "food",
    "haldiram": "food",
    "subway": "food",
    "behrouz": "food",
    "faasos": "food",
    
    # Shopping
    "amazon": "shopping",
    "flipkart": "shopping",
    "myntra": "shopping",
    "meesho": "shopping",
    "ajio": "shopping",
    "nykaa": "shopping",
    "tata cliq": "shopping",
    "zara": "shopping",
    "h&m": "shopping",
    "reliance digital": "shopping",
    "croma": "shopping",
    
    # Transport
    "uber": "transport",
    "ola": "transport",
    "rapido": "transport",
    "irctc": "transport",
    "redbus": "transport",
    "makemytrip": "transport",
    "indigo": "transport",
    "air india": "transport",
    "fastag": "transport",
    
    # Entertainment
    "netflix": "entertainment",
    "spotify": "entertainment",
    "hotstar": "entertainment",
    "prime video": "entertainment",
    "bookmyshow": "entertainment",
    "pvr": "entertainment",
    "inox": "entertainment",
    "youtube": "entertainment",
    
    # Health
    "apollo": "health",
    "1mg": "health",
    "pharmeasy": "health",
    "netmeds": "health",
    "practo": "health",
    
    # Utilities
    "bescom": "utilities",
    "tneb": "utilities",
    "mahadiscom": "utilities",
    "airtel": "utilities",
    "jio": "utilities",
    "vi": "utilities",
    "tatapower": "utilities",
    "adani electricity": "utilities",
}

CAT_ICONS = {
    "food": "🍜",
    "transport": "🚗",
    "shopping": "🛍️",
    "health": "💊",
    "entertainment": "🎬",
    "education": "📚",
    "utilities": "⚡",
    "other": "📦",
}

def determine_merchant_category(user, merchant: str, description: str = "") -> str:
    """
    1. Check per-user category memory (UserMerchantCategory)
    2. Check curated merchant map
    3. Check keyword heuristics
    4. Fallback to 'other'
    """
    cleaned_merchant = merchant.strip().lower()

    # 1. Per-user category memory
    if user and user.is_authenticated:
        saved_pref = UserMerchantCategory.objects.filter(user=user, merchant__iexact=cleaned_merchant).first()
        if saved_pref:
            return saved_pref.category

    # 2. Curated merchant map
    for key, cat in MERCHANT_CATEGORY_MAP.items():
        if key in cleaned_merchant:
            return cat

    # 3. Keyword check on combined merchant and description
    combined = f"{cleaned_merchant} {description.lower()}".strip()
    from .views import CAT_KEYWORDS
    for cat, keywords in CAT_KEYWORDS.items():
        if any(kw in combined for kw in keywords):
            return cat

    return "other"


def process_auto_expense(user, amount, merchant: str, source: str = "auto", timestamp=None, client_txn_id=None, description=None):
    """
    Processes an incoming auto-captured or bank-synced expense:
      - Validates amount
      - Enforces client_txn_id idempotency
      - Computes SHA-256 dedupe hash
      - Checks for possible near-duplicate manual entries
      - Creates unreviewed Expense with source='auto'/'bank_sync'
    Returns:
      (success: bool, data: dict, status_code: int)
    """
    try:
        amt = Decimal(str(amount))
        if amt <= 0:
            return False, {"error": "Amount must be positive."}, 400
    except Exception:
        return False, {"error": "Invalid amount format."}, 400

    merchant_name = str(merchant or "Payment").strip()
    if not merchant_name:
        merchant_name = "Payment"

    # Resolve date
    parsed_date = timezone.localdate()
    if timestamp:
        try:
            if isinstance(timestamp, (int, float)):
                parsed_date = datetime.fromtimestamp(timestamp, tz=timezone.get_current_timezone()).date()
            elif isinstance(timestamp, str):
                parsed_date = datetime.fromisoformat(timestamp.replace('Z', '+00:00')).date()
        except Exception:
            parsed_date = timezone.localdate()

    # 1. Idempotency Check by client_txn_id
    if client_txn_id:
        existing_txn = Expense.objects.filter(user=user, client_txn_id=client_txn_id).first()
        if existing_txn:
            return True, {
                "status": "duplicate",
                "is_idempotent": True,
                "message": "Transaction already recorded.",
                "expense_id": existing_txn.id,
                "amount": float(existing_txn.amount),
                "merchant": merchant_name,
                "category": existing_txn.category,
                "date": existing_txn.date.isoformat(),
                "source": existing_txn.source,
            }, 200

    # 2. Hash-based Deduplication Key
    dedupe_str = f"{user.id}:{float(amt):.2f}:{merchant_name.lower()}:{parsed_date.isoformat()}"
    dedupe_hash = hashlib.sha256(dedupe_str.encode('utf-8')).hexdigest()

    existing_hash = Expense.objects.filter(user=user, dedupe_hash=dedupe_hash).first()
    if existing_hash:
        return True, {
            "status": "duplicate",
            "message": "Duplicate payment already captured for today.",
            "expense_id": existing_hash.id,
            "amount": float(existing_hash.amount),
            "merchant": merchant_name,
            "category": existing_hash.category,
            "date": existing_hash.date.isoformat(),
            "source": existing_hash.source,
        }, 200

    # 3. Flag possible manual duplicate (same amount & merchant on same day)
    recent_possible_dup = Expense.objects.filter(
        user=user,
        date=parsed_date,
        amount=amt
    ).filter(
        Q(description__icontains=merchant_name) | Q(category__icontains=merchant_name)
    ).first()
    is_possible_dup = recent_possible_dup is not None

    # 4. Determine category and icon
    category = determine_merchant_category(user, merchant_name, description or "")
    icon = CAT_ICONS.get(category, "💸")
    desc = description or f"Auto-paid at {merchant_name}"

    # 5. Create Expense record
    expense = Expense.objects.create(
        user=user,
        amount=amt,
        category=category,
        date=parsed_date,
        icon=icon,
        description=desc,
        source=source or "auto",
        client_txn_id=client_txn_id,
        dedupe_hash=dedupe_hash,
        is_reviewed=False # Marked for user review / confirmation
    )

    # 6. Live Budget Feedback (Section 9.4)
    from .views import calculate_daily_budget
    daily_calc = calculate_daily_budget(user, target_date=parsed_date)
    remaining_today = daily_calc.get("today_remaining", 0)

    live_alert = None
    profile = getattr(user, 'profile', None)
    if profile and profile.live_budget_alerts:
        # Check quiet hours (default 11 PM to 7 AM)
        now_hour = timezone.localtime().hour
        if 7 <= now_hour < 23:
            live_alert = f"{merchant_name} -₹{amt:,.0f}. Aaj ka bacha: ₹{remaining_today:,.0f}."

    return True, {
        "status": "success",
        "expense_id": expense.id,
        "amount": float(expense.amount),
        "merchant": merchant_name,
        "category": expense.category,
        "icon": expense.icon,
        "description": expense.description,
        "date": expense.date.isoformat(),
        "source": expense.source,
        "is_reviewed": expense.is_reviewed,
        "is_possible_duplicate": is_possible_dup,
        "daily_budget_remaining": remaining_today,
        "live_alert": live_alert
    }, 201
