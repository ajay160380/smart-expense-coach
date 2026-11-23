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
    # Groceries & Quick-Commerce (food)
    "blinkit": "food",
    "zepto": "food",
    "bigbasket": "food",
    "instamart": "food",
    "bb daily": "food",
    "dmart": "food",
    "d-mart": "food",
    "nature's basket": "food",
    "more retail": "food",
    "spencers": "food",
    "supermarket": "food",
    "kirana": "food",
    "provision": "food",
    "grocery": "food",
    "dairy": "food",
    "milk": "food",
    "amul": "food",
    "mother dairy": "food",
    "country delight": "food",
    "licious": "food",
    "freshtohome": "food",
    "sabzi": "food",
    "vegetable": "food",
    "fruit": "food",
    
    # Food & Dining (food)
    "swiggy": "food",
    "zomato": "food",
    "starbucks": "food",
    "mcdonald": "food",
    "kfc": "food",
    "dominos": "food",
    "pizza": "food",
    "burger king": "food",
    "chaayos": "food",
    "chai point": "food",
    "haldiram": "food",
    "bikanervala": "food",
    "subway": "food",
    "behrouz": "food",
    "faasos": "food",
    "eatfit": "food",
    "biryani": "food",
    "restaurant": "food",
    "dhaba": "food",
    "cafe": "food",
    "kitchen": "food",
    "sweet": "food",
    "mithai": "food",
    "bakery": "food",
    "wow momo": "food",
    "dineout": "food",
    "tapri": "food",
    "chai": "food",
    "coffee": "food",
    "bhojanalaya": "food",
    
    # Shopping (shopping)
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
    "vijay sales": "shopping",
    "decathlon": "shopping",
    "lenskart": "shopping",
    "snitch": "shopping",
    "uniqlo": "shopping",
    "pantaloons": "shopping",
    "max fashion": "shopping",
    "westside": "shopping",
    "shoppers stop": "shopping",
    "lifestyle": "shopping",
    "trends": "shopping",
    "bata": "shopping",
    
    # Transport & Fuel (transport)
    "uber": "transport",
    "ola": "transport",
    "rapido": "transport",
    "irctc": "transport",
    "redbus": "transport",
    "abhibus": "transport",
    "makemytrip": "transport",
    "goibibo": "transport",
    "indigo": "transport",
    "air india": "transport",
    "fastag": "transport",
    "metro": "transport",
    "dmrc": "transport",
    "bmrc": "transport",
    "mmrcl": "transport",
    "yatri": "transport",
    "petrol": "transport",
    "fuel": "transport",
    "diesel": "transport",
    "cng": "transport",
    "iocl": "transport",
    "indianoil": "transport",
    "indian oil": "transport",
    "bpcl": "transport",
    "bharat petroleum": "transport",
    "hpcl": "transport",
    "hindustan petroleum": "transport",
    "shell": "transport",
    "toll": "transport",
    "parking": "transport",
    "auto": "transport",
    "cab": "transport",
    
    # Entertainment (entertainment)
    "netflix": "entertainment",
    "spotify": "entertainment",
    "hotstar": "entertainment",
    "prime video": "entertainment",
    "bookmyshow": "entertainment",
    "pvr": "entertainment",
    "inox": "entertainment",
    "cinepolis": "entertainment",
    "youtube": "entertainment",
    "sonyliv": "entertainment",
    "zee5": "entertainment",
    "steam": "entertainment",
    "playstation": "entertainment",
    "apple.com": "entertainment",
    "google play": "entertainment",
    "cinema": "entertainment",
    "movie": "entertainment",
    
    # Health & Medical (health)
    "apollo": "health",
    "1mg": "health",
    "tata 1mg": "health",
    "pharmeasy": "health",
    "netmeds": "health",
    "practo": "health",
    "medplus": "health",
    "pharmacy": "health",
    "chemist": "health",
    "hospital": "health",
    "clinic": "health",
    "doctor": "health",
    "pathlab": "health",
    "cult.fit": "health",
    "cultfit": "health",
    "gym": "health",
    
    # Utilities & Bills (utilities)
    "bescom": "utilities",
    "tneb": "utilities",
    "mahadiscom": "utilities",
    "uppcl": "utilities",
    "msedcl": "utilities",
    "bses": "utilities",
    "adani electricity": "utilities",
    "tatapower": "utilities",
    "tata power": "utilities",
    "airtel": "utilities",
    "jio": "utilities",
    "vi": "utilities",
    "vodafone": "utilities",
    "bsnl": "utilities",
    "act fibernet": "utilities",
    "hathway": "utilities",
    "tata play": "utilities",
    "dth": "utilities",
    "broadband": "utilities",
    "wifi": "utilities",
    "gas": "utilities",
    "igl": "utilities",
    "mgl": "utilities",
    "rent": "utilities",
    "maintenance": "utilities",
    
    # Education (education)
    "udemy": "education",
    "coursera": "education",
    "unacademy": "education",
    "physicswallah": "education",
    "byjus": "education",
    "school": "education",
    "college": "education",
    "tuition": "education",
    "coaching": "education",
    "books": "education",
    "stationery": "education",
}

def clean_merchant_name(text: str) -> str:
    if not text:
        return ""
    import re
    cleaned = re.sub(r"[^\w\s&'.-]", " ", text)
    cleaned = re.sub(r"(?i)\b(?:payment to|paid to|sent to|transferred to|upi|txn|info)\b", " ", cleaned)
    return " ".join(cleaned.lower().split()).strip()

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
    cleaned_merchant = clean_merchant_name(merchant)

    # 1. Per-user category memory (100% priority for user's trained rules)
    if user and user.is_authenticated:
        saved_pref = UserMerchantCategory.objects.filter(user=user, merchant__iexact=cleaned_merchant).first()
        if saved_pref:
            return saved_pref.category
        # Also check without exact match (e.g. "ramesh store" in "ramesh store bangalore")
        rules = UserMerchantCategory.objects.filter(user=user)
        for r in rules:
            if r.merchant.lower() in cleaned_merchant:
                return r.category

    # 2. Curated merchant map
    for key, cat in sorted(MERCHANT_CATEGORY_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if key in cleaned_merchant:
            return cat

    # 3. Keyword check on combined merchant and description
    combined = f"{cleaned_merchant} {clean_merchant_name(description)}".strip()
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

    # 2. Debounce window deduplication (120 seconds): Prevents App Notification + Bank SMS double counting
    # while NEVER dropping genuine repeated purchases (like 2nd coffee or metro ticket later in the day)
    recent_cutoff = timezone.now() - timedelta(seconds=120)
    existing_recent = Expense.objects.filter(
        user=user,
        amount=amt,
        date=parsed_date,
        created_at__gte=recent_cutoff
    ).first()
    if existing_recent:
        clean_curr = clean_merchant_name(merchant_name)
        clean_prev = clean_merchant_name(existing_recent.description or "")
        if (clean_curr and clean_prev and (clean_curr in clean_prev or clean_prev in clean_curr)) or (not clean_curr and not clean_prev):
            return True, {
                "status": "duplicate",
                "message": "Debounce: duplicate capture ignored within 2 minutes.",
                "expense_id": existing_recent.id,
                "amount": float(existing_recent.amount),
                "merchant": merchant_name,
                "category": existing_recent.category,
                "date": existing_recent.date.isoformat(),
                "source": existing_recent.source,
            }, 200

    # Bucket dedupe hash with 2-minute time window for database uniqueness
    time_bucket = int(timezone.now().timestamp() // 120)
    dedupe_str = f"{user.id}:{float(amt):.2f}:{merchant_name.lower()}:{parsed_date.isoformat()}:{time_bucket}"
    dedupe_hash = hashlib.sha256(dedupe_str.encode('utf-8')).hexdigest()

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

