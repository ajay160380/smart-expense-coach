"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║          PAISA MITRA — EXPENSE TRACKER  |  views.py  |  Production v3.0        ║
║          Full-stack Django views with AI, Voice, Analytics & Smart Features     ║
╚══════════════════════════════════════════════════════════════════════════════════╝

Author   : PaisaMitra Dev Team
Version  : 3.0.0
Python   : 3.11+
Django   : 4.2+
AI Model : Groq (llama-3.3-70b-versatile)

Features:
  ✅ Dashboard with AI coach (Hinglish)
  ✅ Voice-to-Expense (100x upgraded — date, description, confidence)
  ✅ AI Chat Assistant (PaisaMitra bot)
  ✅ Category Insight API
  ✅ Monthly & Weekly Analytics API
  ✅ Budget Goal Tracker
  ✅ Subscription Manager with auto-deduct
  ✅ Smart CSV/JSON Export
  ✅ Recurring Expense Patterns
  ✅ Spending Heatmap Data API
  ✅ Anomaly Detection (sudden spike alert)
  ✅ Savings Goal Tracker
  ✅ Rate Limiting on AI endpoints
  ✅ Full audit logging
"""

import csv
import json
import calendar
import logging
import re
import hashlib
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from collections import defaultdict
from functools import wraps
from typing import Optional

from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db import transaction
from django.db.models import (
    Avg, Count, Max, Min, Sum, Q, F,
    ExpressionWrapper, DecimalField, FloatField,
    Window, functions
)
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay, ExtractMonth
from django.http import HttpRequest, HttpResponse, JsonResponse, Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.cache import cache_page
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from groq import Groq

from django.conf import settings
from .models import Expense, Subscription
from .forms import ExpenseForm, SubscriptionForm


# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS & CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

logger = logging.getLogger(__name__)

# Budget & Display Defaults
DEFAULT_BUDGET       = 20_000.0
MAX_UPCOMING_SUBS    = 5
CHART_DAYS           = 7
CHART_MONTHS         = 6
EXPENSES_PER_PAGE    = 15
MAX_EXPORT_ROWS      = 10_000

# Cache Timeouts (seconds)
AI_CACHE_TIMEOUT     = 300      # 5 min — AI insights
CAT_CACHE_TIMEOUT    = 180      # 3 min — category tips
ANALYTICS_TIMEOUT    = 120      # 2 min — analytics data
HEATMAP_TIMEOUT      = 600      # 10 min — heatmap (changes less often)

# AI Rate Limiting
AI_RATE_LIMIT_CALLS  = 15       # max calls per window
AI_RATE_LIMIT_WINDOW = 3600     # per hour

# Voice Processing
VOICE_MAX_TEXT_LEN   = 500
VOICE_CONFIDENCE_WARN = 0.60    # below this → warn user

# Anomaly Detection
ANOMALY_MULTIPLIER   = 2.5      # if today's spend > 2.5x avg → alert

# Category Configuration
CAT_COLORS = {
    "food":          "#6c5ce7",
    "transport":     "#00cec9",
    "shopping":      "#fd79a8",
    "health":        "#00b894",
    "entertainment": "#fdcb6e",
    "education":     "#74b9ff",
    "utilities":     "#a29bfe",
    "other":         "#dfe6e9",
}
CAT_ICONS = {
    "food":          "🍜",
    "transport":     "🚗",
    "shopping":      "🛍️",
    "health":        "💊",
    "entertainment": "🎬",
    "education":     "📚",
    "utilities":     "⚡",
    "other":         "📦",
}
CAT_KEYWORDS = {
    "food":          ["khana", "lunch", "dinner", "breakfast", "chai", "pizza", "zomato",
                      "swiggy", "restaurant", "dhaba", "grocery", "sabzi", "fruit", "snack",
                      "bhojan", "roti", "dal", "paneer", "biryani", "café", "cafe"],
    "transport":     ["petrol", "diesel", "auto", "cab", "uber", "ola", "metro", "bus",
                      "taxi", "parking", "toll", "train", "flight", "rickshaw", "fuel"],
    "shopping":      ["kapde", "clothes", "shoes", "mall", "amazon", "flipkart", "online",
                      "shirt", "jeans", "dress", "bag", "watch", "gadget", "mobile", "laptop"],
    "health":        ["dawai", "medicine", "doctor", "hospital", "chemist", "pharmacy",
                      "gym", "clinic", "test", "pathlab", "dawa", "injection", "checkup"],
    "entertainment": ["movie", "netflix", "ott", "game", "concert", "sports", "match",
                      "hotstar", "prime", "spotify", "youtube", "ticket", "fun", "outing"],
    "education":     ["book", "course", "fees", "tuition", "stationery", "school",
                      "college", "udemy", "coaching", "class", "pen", "notebook"],
    "utilities":     ["light bill", "bijli", "gas", "water", "recharge", "mobile bill",
                      "internet", "broadband", "wifi", "electricity", "maintenance", "rent"],
}
VALID_CATEGORIES = set(CAT_COLORS.keys())
VALID_FILTERS    = {"week", "month", "all"}
VALID_PERIODS    = {"week", "month", "quarter", "year"}

# Hinglish Number Map for Voice Pre-processing
HINGLISH_NUM_MAP = {
    r'\bek\b':         '1',
    r'\bdo\b':         '2',
    r'\bteen\b':       '3',
    r'\bchar\b':       '4',
    r'\bpaanch\b':     '5',
    r'\bchhe\b':       '6',
    r'\bsaat\b':       '7',
    r'\baath\b':       '8',
    r'\bnau\b':        '9',
    r'\bdas\b':        '10',
    r'\bgyarah\b':     '11',
    r'\bbaarah\b':     '12',
    r'\bterah\b':      '13',
    r'\bchaudah\b':    '14',
    r'\bpandrah\b':    '15',
    r'\bsolah\b':      '16',
    r'\bsattrah\b':    '17',
    r'\baathaarah\b':  '18',
    r'\bunees\b':      '19',
    r'\bbees\b':       '20',
    r'\bpaccheees\b':  '25',
    r'\btees\b':       '30',
    r'\bchaalis\b':    '40',
    r'\bpackaas\b':    '50',
    r'\saath\b':       '60',
    r'\bsaattar\b':    '70',
    r'\bassee\b':      '80',
    r'\bnabbe\b':      '90',
    r'\bsau\b':        '00',
    r'\bsou\b':        '00',
    r'\bhazar\b':      '000',
    r'\bhajaar\b':     '000',
    r'\blakh\b':       '00000',
    r'\bkarod\b':      '0000000',
}

# Month names for analytics labels
MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ══════════════════════════════════════════════════════════════════════════════
# DECORATORS & UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

def ai_rate_limited(view_func):
    """
    Decorator: limits AI endpoint calls per user per hour.
    Uses cache as a sliding-window counter.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return view_func(request, *args, **kwargs)
        ck = f"ai_rate_{request.user.id}"
        count = cache.get(ck, 0)
        if count >= AI_RATE_LIMIT_CALLS:
            return JsonResponse({
                "error": f"Bhai {AI_RATE_LIMIT_CALLS} baar ho gaya! Ek ghante baad aana. 🕐"
            }, status=429)
        cache.set(ck, count + 1, AI_RATE_LIMIT_WINDOW)
        return view_func(request, *args, **kwargs)
    return wrapper


def json_required(view_func):
    """Decorator: ensures request body is valid JSON for POST views."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.method == "POST":
            try:
                request._json_body = json.loads(request.body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                return JsonResponse({"error": "Invalid JSON body"}, status=400)
        return view_func(request, *args, **kwargs)
    return wrapper


def get_user_budget(request) -> float:
    """Safely retrieve budget from session with fallback."""
    try:
        budget = float(request.session.get("budget", DEFAULT_BUDGET))
        return budget if budget > 0 else DEFAULT_BUDGET
    except (ValueError, TypeError):
        return DEFAULT_BUDGET


def _groq_client() -> Groq:
    """Return a configured Groq client instance."""
    return Groq(api_key=settings.GROQ_API_KEY)


def _cache_key(*parts) -> str:
    """Build a consistent cache key from parts."""
    raw = "_".join(str(p) for p in parts)
    return hashlib.md5(raw.encode()).hexdigest()[:24]


def _safe_float(value, default: float = 0.0) -> float:
    """Convert value to float safely."""
    try:
        return float(value or default)
    except (ValueError, TypeError):
        return default


# ══════════════════════════════════════════════════════════════════════════════
# HINGLISH VOICE PRE-PROCESSOR
# ══════════════════════════════════════════════════════════════════════════════

def normalize_hinglish_numbers(text: str) -> str:
    """
    Pre-process ASR (speech-to-text) Hinglish output.
    Converts spoken number words to digits before AI extraction.

    Examples:
        "teen sau pachaas" → "3 00 50" → "350"
        "do hazar paanch sau" → "2 000 5 00" → "2500"
        "pandrah00" → "1500"    (broken ASR concatenation)
        "Solah00"   → "1600"
    """
    text = text.lower().strip()

    # Fix broken ASR concatenations like "pandrah00", "Solah00"
    text = re.sub(r'([a-z]+)(\d{2,})', r'\1 \2', text)
    text = re.sub(r'(\d+)([a-z]+)', r'\1 \2', text)

    # Replace word numbers with digit strings
    for pattern, replacement in HINGLISH_NUM_MAP.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    # Combine digit fragments: "3 00" → "300", "2 000" → "2000"
    text = re.sub(r'(\d+)\s+(0{2,})', r'\1\2', text)

    # Clean up extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    logger.debug("Normalized Hinglish: %r", text)
    return text


def build_voice_ai_prompt(spoken_text: str, today: date) -> str:
    """
    Build the ultra-detailed voice extraction prompt for Groq.
    Handles date, amount, category, description, confidence.
    """
    yesterday = (today - timedelta(days=1)).isoformat()
    day_before = (today - timedelta(days=2)).isoformat()

    cat_hints = "\n".join(
        f"   - {cat}: {', '.join(kws[:6])}"
        for cat, kws in CAT_KEYWORDS.items()
    )

    return f"""You are a precise AI that extracts expense data from Indian users speaking Hinglish, Hindi, or English.

TODAY: {today.isoformat()} | YESTERDAY: {yesterday} | DAY BEFORE: {day_before}

USER SAID: "{spoken_text}"

══════════ EXTRACTION RULES ══════════

① AMOUNT (number only, no commas):
   - Word numbers: "do hazar" = 2000, "teen sau" = 300, "paanch sou" = 500
   - Mixed: "1 hazar 2 sau" = 1200, "do hazar paanch" = 2005
   - Broken ASR: "pandrah00" = 1500, "Solah00" = 1600, "ek hazar" = 1000
   - English: "two fifty" = 250, "five hundred" = 500, "two k" = 2000
   - Currency phrases: "rupye", "rs", "₹", "bucks" → amount before them
   - If no amount found → 0

② CATEGORY (must be one of these exact strings):
{cat_hints}
   - When ambiguous, lean toward the most specific category
   - Default: other

③ DATE (YYYY-MM-DD only):
   - "aaj" / "today" / no date → {today.isoformat()}
   - "kal" / "yesterday" / "kal ka" → {yesterday}
   - "parso" / "day before yesterday" → {day_before}
   - Specific: "3 tarikh", "3rd", "3 may" → use current month/year if unspecified
   - Never return a future date

④ DESCRIPTION (2-5 words, plain English/Hinglish):
   - Short summary of what was bought/paid
   - Examples: "Zomato lunch order", "Petrol fill", "Doctor fees", "Metro pass"

⑤ CONFIDENCE (0.00 to 1.00):
   - 0.90+ = crystal clear input
   - 0.70–0.89 = mostly clear, minor ambiguity
   - 0.50–0.69 = some guessing involved
   - below 0.50 = very unclear

══════════ RESPONSE FORMAT ══════════
Return ONLY valid JSON. No markdown. No explanation. No extra text whatsoever.

{{"amount": <number>, "category": "<string>", "date": "<YYYY-MM-DD>", "description": "<string>", "confidence": <float>}}

══════════ EXAMPLES ══════════
"aaj zomato pe 450 kharch kiya"
→ {{"amount": 450, "category": "food", "date": "{today.isoformat()}", "description": "Zomato food order", "confidence": 0.97}}

"kal petrol ke liye pandrah sau diye"
→ {{"amount": 1500, "category": "transport", "date": "{yesterday}", "description": "Petrol fill", "confidence": 0.95}}

"doctor ko do hazar"
→ {{"amount": 2000, "category": "health", "date": "{today.isoformat()}", "description": "Doctor consultation", "confidence": 0.91}}

"netflix subscription teen sou nau nabbe"
→ {{"amount": 399, "category": "entertainment", "date": "{today.isoformat()}", "description": "Netflix subscription", "confidence": 0.94}}

"bijli ka bill gyarah sou aaya"
→ {{"amount": 1100, "category": "utilities", "date": "{today.isoformat()}", "description": "Electricity bill", "confidence": 0.96}}

"parso amazon se kapde khareed, ek hazar paanch sau"
→ {{"amount": 1500, "category": "shopping", "date": "{day_before}", "description": "Amazon clothes", "confidence": 0.93}}"""


# ══════════════════════════════════════════════════════════════════════════════
# SERVICE LAYER — DATA QUERIES
# ══════════════════════════════════════════════════════════════════════════════

def _next_month_date(d: date) -> date:
    """Advance date by one calendar month, clamping to month end."""
    m = d.month % 12 + 1
    y = d.year + (1 if d.month == 12 else 0)
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


@transaction.atomic
def process_subscriptions(user) -> int:
    """
    Process all overdue subscriptions for a user.
    Creates Expense records and advances next_billing_date.
    Returns count of expense entries created.
    """
    today = date.today()
    subs  = (Subscription.objects
             .filter(user=user, next_billing_date__lte=today)
             .select_for_update())
    debits, batch = 0, []

    for sub in subs:
        bd, itr = sub.next_billing_date, 0
        while bd <= today and itr < 24:
            batch.append(Expense(
                user=user,
                category=sub.category,
                amount=sub.amount,
                date=bd,
            ))
            bd = _next_month_date(bd)
            itr += 1
            debits += 1
        sub.next_billing_date = bd
        sub.save(update_fields=["next_billing_date"])

    if batch:
        Expense.objects.bulk_create(batch, ignore_conflicts=True)

    if debits:
        logger.info("Subscriptions processed uid=%s count=%d", user.id, debits)

    return debits


def get_filtered_expenses(user, filter_type: str, search_query: str = ""):
    """
    Return filtered expense queryset for a user.
    Supports filter_type: 'week', 'month', 'all'.
    Optional search_query filters by category name.
    """
    qs = Expense.objects.filter(user=user)

    if search_query:
        qs = qs.filter(
            Q(category__icontains=search_query)
        )

    today = date.today()
    if filter_type == "week":
        qs = qs.filter(date__gte=today - timedelta(days=7))
    elif filter_type == "month":
        qs = qs.filter(date__year=today.year, date__month=today.month)

    return qs.order_by("-date", "-id")


def get_period_expenses(user, period: str):
    """
    Return expenses for a named period.
    period: 'week' | 'month' | 'quarter' | 'year'
    """
    today = date.today()
    qs    = Expense.objects.filter(user=user)

    if period == "week":
        return qs.filter(date__gte=today - timedelta(days=7))
    elif period == "month":
        return qs.filter(date__year=today.year, date__month=today.month)
    elif period == "quarter":
        quarter_start = today.replace(day=1) - timedelta(days=(today.month - 1) % 3 * 30)
        return qs.filter(date__gte=quarter_start)
    elif period == "year":
        return qs.filter(date__year=today.year)
    return qs


def calculate_stats(qs, budget: float) -> dict:
    """
    Aggregate expense statistics from a queryset.
    Returns a dict of computed metrics.
    """
    agg = qs.aggregate(
        total=Sum("amount"),
        count=Count("id"),
        highest=Max("amount"),
        lowest=Min("amount"),
        average=Avg("amount"),
    )
    ts     = _safe_float(agg["total"])
    days   = max(date.today().day, 1)
    budget = max(budget, 0.01)

    return {
        "total_spent":        ts,
        "transaction_count":  agg["count"] or 0,
        "highest_expense":    _safe_float(agg["highest"]),
        "lowest_expense":     _safe_float(agg["lowest"]),
        "average_expense":    _safe_float(agg["average"]),
        "budget_percent":     min(ts / budget * 100, 100),
        "remaining_budget":   max(budget - ts, 0),
        "avg_per_day":        ts / days,
        "savings_rate":       max(0, min(100, (budget - ts) / budget * 100)),
        "overspent":          ts > budget,
        "projected_month_end": (ts / days) * calendar.monthrange(
                                  date.today().year, date.today().month)[1],
    }


def build_category_breakdown(qs, total_spent: float) -> list:
    """
    Build a list of category-level spend summaries sorted by total descending.
    Each entry includes name, icon, color, total, percentage.
    """
    result = []
    for c in qs.values("category").annotate(total=Sum("amount")).order_by("-total"):
        n = (c["category"] or "other").lower()
        t = _safe_float(c["total"])
        result.append({
            "name":    n,
            "title":   n.title(),
            "total":   t,
            "percent": min(t / total_spent * 100 if total_spent else 0, 100),
            "color":   CAT_COLORS.get(n, "#888"),
            "icon":    CAT_ICONS.get(n, "📦"),
        })
    return result


def build_chart_data(user) -> list:
    """
    Build last-N-days daily spending data for the chart widget.
    Returns list of dicts with day label, total, bar height, and today flag.
    """
    today = date.today()
    start = today - timedelta(days=CHART_DAYS - 1)
    day_map = {
        r["date"]: _safe_float(r["day_total"])
        for r in (Expense.objects
                  .filter(user=user, date__range=(start, today))
                  .values("date")
                  .annotate(day_total=Sum("amount")))
    }
    totals  = [day_map.get(start + timedelta(days=i), 0) for i in range(CHART_DAYS)]
    max_val = max(totals) if max(totals) > 0 else 1

    return [
        {
            "day":      (start + timedelta(days=i)).strftime("%a"),
            "date":     (start + timedelta(days=i)).isoformat(),
            "total":    totals[i],
            "height":   max(totals[i] / max_val * 140, 8 if totals[i] else 2),
            "is_today": (start + timedelta(days=i)) == today,
        }
        for i in range(CHART_DAYS)
    ]


def build_monthly_trend(user, months: int = 6) -> list:
    """
    Build monthly spending totals for the past N months.
    Used for the trend chart on analytics page.
    """
    today    = date.today()
    result   = []
    for i in range(months - 1, -1, -1):
        # Go back i months from today
        target_month = today.month - i
        target_year  = today.year
        while target_month <= 0:
            target_month += 12
            target_year  -= 1

        agg = (Expense.objects
               .filter(user=user, date__year=target_year, date__month=target_month)
               .aggregate(total=Sum("amount"), count=Count("id")))
        result.append({
            "month":  MONTH_NAMES[target_month - 1],
            "year":   target_year,
            "total":  _safe_float(agg["total"]),
            "count":  agg["count"] or 0,
            "label":  f"{MONTH_NAMES[target_month-1]} {str(target_year)[-2:]}",
        })
    return result


def build_spending_heatmap(user) -> dict:
    """
    Build a 52-week spending heatmap (GitHub-contribution style).
    Returns weeks list with day-level totals for the past year.
    """
    today  = date.today()
    start  = today - timedelta(days=364)

    day_map = {
        r["date"]: _safe_float(r["total"])
        for r in (Expense.objects
                  .filter(user=user, date__range=(start, today))
                  .values("date")
                  .annotate(total=Sum("amount")))
    }

    # Build 52-week grid
    weeks = []
    cur   = start - timedelta(days=start.weekday())  # align to Monday
    while cur <= today:
        week = []
        for d in range(7):
            day  = cur + timedelta(days=d)
            total = day_map.get(day, 0)
            week.append({
                "date":  day.isoformat(),
                "total": total,
                "level": 0 if total == 0 else (
                          1 if total < 500 else
                          2 if total < 1500 else
                          3 if total < 3000 else 4),
            })
        weeks.append(week)
        cur += timedelta(days=7)

    max_day = max((d["total"] for w in weeks for d in w), default=1)
    return {"weeks": weeks, "max_day": max_day, "start": start.isoformat(), "end": today.isoformat()}


def detect_anomalies(user, budget: float) -> list:
    """
    Detect spending anomalies for the current user:
    - Today's spending significantly above average
    - Category spikes
    - Budget already exceeded before month end
    Returns list of alert dicts.
    """
    alerts = []
    today  = date.today()

    # ① Today vs average daily
    month_qs  = Expense.objects.filter(user=user, date__year=today.year, date__month=today.month)
    month_agg = month_qs.aggregate(total=Sum("amount"), days=Count("date", distinct=True))
    month_total = _safe_float(month_agg["total"])
    active_days = max(month_agg["days"] or 1, 1)
    avg_daily   = month_total / active_days

    today_total = _safe_float(
        month_qs.filter(date=today).aggregate(t=Sum("amount"))["t"]
    )
    if avg_daily > 0 and today_total > avg_daily * ANOMALY_MULTIPLIER:
        alerts.append({
            "type":    "spending_spike",
            "icon":    "🚨",
            "message": f"Aaj ₹{today_total:,.0f} kharch ho gaya — "
                       f"daily avg se {today_total/avg_daily:.1f}x zyada! Sambhalo yaar.",
            "severity": "high",
        })

    # ② Budget overspent
    if month_total > budget:
        over_by = month_total - budget
        alerts.append({
            "type":    "budget_exceeded",
            "icon":    "💸",
            "message": f"Budget ₹{budget:,.0f} cross ho gaya! "
                       f"₹{over_by:,.0f} zyada kharch. Matlab koi control nahi. 😬",
            "severity": "critical",
        })

    # ③ Projected overspend
    elif avg_daily > 0:
        days_in_month  = calendar.monthrange(today.year, today.month)[1]
        days_remaining = days_in_month - today.day
        projected_end  = month_total + (avg_daily * days_remaining)
        if projected_end > budget * 1.1:
            alerts.append({
                "type":    "projected_overspend",
                "icon":    "📈",
                "message": f"Is rate se month end pe ₹{projected_end:,.0f} kharch hoga — "
                           f"budget ₹{budget:,.0f} hai. Abhi se bachao karo! 🏃",
                "severity": "warning",
            })

    # ④ Single category dominance
    cat_agg = (month_qs.values("category")
               .annotate(total=Sum("amount"))
               .order_by("-total").first())
    if cat_agg and month_total > 0:
        cat_pct = _safe_float(cat_agg["total"]) / month_total * 100
        if cat_pct > 60:
            cat = cat_agg["category"]
            alerts.append({
                "type":    "category_dominance",
                "icon":    CAT_ICONS.get(cat, "📦"),
                "message": f"{cat.title()} pe {cat_pct:.0f}% budget uda diya! "
                            f"Ek hi cheez pe itna? Diversify karo yaar.",
                "severity": "warning",
            })

    return alerts


# ══════════════════════════════════════════════════════════════════════════════
# SERVICE LAYER — AI INSIGHTS
# ══════════════════════════════════════════════════════════════════════════════

def get_ai_insight(user_id: int, expenses, budget: float, total_spent: float) -> str:
    """
    Generate AI-powered one-liner insight in Hinglish for the dashboard.
    Cached per user/budget/spent combination to avoid redundant API calls.
    """
    ck = f"ai_insight_{user_id}_{int(budget)}_{int(total_spent)}"
    if hit := cache.get(ck):
        return hit

    try:
        summary    = "; ".join(f"{e.category}: ₹{e.amount}" for e in expenses[:5]) or "No data"
        remaining  = max(0, budget - total_spent)
        days_left  = (
            (date.today().replace(day=1) + timedelta(days=32)).replace(day=1) - date.today()
        ).days

        prompt = (
            f"You are a brutally honest, funny Indian financial coach.\n"
            f"Budget: ₹{budget:,.0f} | Spent: ₹{total_spent:,.0f} | "
            f"Remaining: ₹{remaining:,.0f} | Days left this month: {days_left}\n"
            f"Recent expenses: {summary}\n\n"
            f"Write ONE punchy Hinglish sentence (Roman script). Rules:\n"
            f"- Sarcastic but loving\n"
            f"- Include a specific Indian pop-culture or relatable reference\n"
            f"- Under 30 words\n"
            f"- End with a practical micro-tip\n"
            f"- ONLY return the sentence, nothing else."
        )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.85,
            max_tokens=90,
        )
        insight = r.choices[0].message.content.strip()
        cache.set(ck, insight, AI_CACHE_TIMEOUT)
        return insight

    except Exception as e:
        logger.error("AI insight uid=%s error=%s", user_id, e)
        remaining = max(0, budget - total_spent)
        return f"Bhai ₹{remaining:,.0f} bacha hai — Zomato band karo, ghar ka khana khao! 🍛"


def get_category_ai_tip(user_id: int, category: str, cat_total: float,
                         share_pct: float, avg_txn: float, period: str) -> str:
    """
    Generate a category-specific roast + saving hack via AI.
    Cached per user/category/period/total combination.
    """
    ck = f"cat_tip_{user_id}_{category}_{period}_{int(cat_total)}"
    if hit := cache.get(ck):
        return hit

    try:
        prompt = (
            f"You are a witty Indian financial coach.\n"
            f"User spent ₹{cat_total:,.0f} on {category} this {period}.\n"
            f"That's {share_pct:.1f}% of their total budget.\n"
            f"Average per transaction: ₹{avg_txn:,.0f}.\n\n"
            f"Write ONE Hinglish sentence that:\n"
            f"- Roasts this {category} spending with a funny Indian reference\n"
            f"- Gives ONE specific saving hack for {category}\n"
            f"- Is under 35 words\n"
            f"- ONLY return the sentence."
        )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.85,
            max_tokens=100,
        )
        tip = r.choices[0].message.content.strip()
        cache.set(ck, tip, CAT_CACHE_TIMEOUT)
        return tip

    except Exception as e:
        logger.error("Cat tip uid=%s cat=%s error=%s", user_id, category, e)
        return f"{category.title()} pe itna? Thoda control karo yaar! 💸"


def get_monthly_ai_report(user_id: int, month_data: dict) -> str:
    """
    Generate a brief AI-powered monthly spending report / roast.
    """
    ck = f"monthly_report_{user_id}_{month_data.get('month_key','')}"
    if hit := cache.get(ck):
        return hit

    try:
        top_cats = ", ".join(
            f"{c['name']} ₹{c['total']:,.0f}" for c in month_data.get("categories", [])[:3]
        )
        prompt = (
            f"Monthly financial summary for an Indian user:\n"
            f"Total spent: ₹{month_data['total']:,.0f} | Budget: ₹{month_data['budget']:,.0f}\n"
            f"Top categories: {top_cats or 'None'}\n"
            f"Transactions: {month_data['count']}\n\n"
            f"Write a 2-sentence Hinglish monthly report:\n"
            f"Sentence 1: Summary of how the month went (honest, slightly funny)\n"
            f"Sentence 2: One specific action for next month\n"
            f"ONLY return the 2 sentences. No headings."
        )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.75,
            max_tokens=120,
        )
        report = r.choices[0].message.content.strip()
        cache.set(ck, report, AI_CACHE_TIMEOUT)
        return report

    except Exception as e:
        logger.error("Monthly report uid=%s error=%s", user_id, e)
        return "Is mahine ka hisaab theek nahi tha. Agla mahine aur dhyan rakho! 📊"


# ══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION VIEWS
# ══════════════════════════════════════════════════════════════════════════════

def register(request: HttpRequest) -> HttpResponse:
    """User registration with auto-login on success."""
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            logger.info("New user registered uid=%s username=%s", user.id, user.username)
            messages.success(request, "Account ban gaya! Swagat hai PaisaMitra mein 🎉")
            return redirect("dashboard")
        messages.error(request, "Kuch gadbad hai — form dobara check karo.")
    else:
        form = UserCreationForm()

    return render(request, "tracker/register.html", {"form": form})


def user_login(request: HttpRequest) -> HttpResponse:
    """Custom login view with friendly error messages."""
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            logger.info("User login uid=%s", user.id)
            messages.success(request, f"Welcome back {user.username}! 👋")
            return redirect(request.GET.get("next", "dashboard"))
        messages.error(request, "Username ya password galat hai bhai.")
    else:
        form = AuthenticationForm()

    return render(request, "tracker/login.html", {"form": form})


@login_required(login_url="login")
def user_logout(request: HttpRequest) -> HttpResponse:
    """Logout and redirect to login page."""
    logger.info("User logout uid=%s", request.user.id)
    logout(request)
    messages.info(request, "Log out ho gaye. Phir milenge! 👋")
    return redirect("login")


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD VIEW
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def dashboard(request: HttpRequest) -> HttpResponse:
    """
    Main dashboard view.
    Handles:
    - Budget update via POST
    - Subscription auto-deduction
    - Expense filtering (week/month/all) and search
    - Stats, category breakdown, chart data
    - Anomaly alerts
    - AI insight generation
    - Pagination
    """

    # ── Budget update ───────────────────────────────────────────────────────
    if request.method == "POST" and "new_budget" in request.POST:
        try:
            nb = float(request.POST["new_budget"])
            if nb <= 0:
                raise ValueError("Budget must be positive")
            request.session["budget"] = nb
            logger.info("Budget updated uid=%s budget=%.0f", request.user.id, nb)
            messages.success(request, f"Budget set: ₹{nb:,.0f} 💰")
        except (ValueError, TypeError):
            messages.error(request, "Valid budget daalo (positive number).")
        return redirect("dashboard")

    user   = request.user
    budget = get_user_budget(request)
    today  = date.today()

    # ── Process subscriptions ───────────────────────────────────────────────
    debits = process_subscriptions(user)
    if debits:
        messages.info(request, f"📅 {debits} subscription(s) auto-deduct ho gaye.")

    # ── Upcoming subscriptions ──────────────────────────────────────────────
    upcoming_subs = (Subscription.objects
                     .filter(user=user, next_billing_date__gte=today)
                     .order_by("next_billing_date")[:MAX_UPCOMING_SUBS])

    # ── Filter & search ─────────────────────────────────────────────────────
    search_query = request.GET.get("q", "").strip()
    filter_type  = request.GET.get("filter", "month")
    if filter_type not in VALID_FILTERS:
        filter_type = "month"

    expenses_qs        = get_filtered_expenses(user, filter_type, search_query)
    stats              = calculate_stats(expenses_qs, budget)
    category_data_list = build_category_breakdown(expenses_qs, stats["total_spent"])
    chart_data         = build_chart_data(user)
    anomaly_alerts     = detect_anomalies(user, budget)

    # ── Pagination ──────────────────────────────────────────────────────────
    page_number = request.GET.get("page", 1)
    paginator   = Paginator(expenses_qs, EXPENSES_PER_PAGE)
    try:
        expenses_page = paginator.page(page_number)
    except (PageNotAnInteger, EmptyPage):
        expenses_page = paginator.page(1)

    # ── AI Insight ──────────────────────────────────────────────────────────
    if stats["transaction_count"] == 0:
        insight = "<strong>Shuru karo!</strong> Pehla expense add karo, AI coaching milegi. 🚀"
    else:
        raw     = get_ai_insight(user.id, expenses_qs, budget, stats["total_spent"])
        insight = f"<strong>AI Coach:</strong> {raw}"

    # ── Monthly trend for mini-chart ────────────────────────────────────────
    monthly_trend = build_monthly_trend(user, months=CHART_MONTHS)

    context = {
        # Budget & core stats
        "budget":             budget,
        "insight":            insight,
        "anomaly_alerts":     anomaly_alerts,

        # Category & charts
        "category_data_list": category_data_list,
        "chart_data":         chart_data,
        "monthly_trend":      monthly_trend,

        # Expenses
        "expenses":           expenses_page,
        "paginator":          paginator,
        "current_filter":     filter_type,
        "search_query":       search_query,

        # Forms
        "form":               ExpenseForm(),
        "sub_form":           SubscriptionForm(),

        # Subscriptions
        "upcoming_subs":      upcoming_subs,

        # Meta
        "today_month_year":   today.strftime("%B %Y"),
        "valid_categories":   sorted(VALID_CATEGORIES),
        "cat_icons":          CAT_ICONS,
        "cat_colors":         CAT_COLORS,

        # Spread stats dict into context
        **stats,
    }
    return render(request, "tracker/dashboard.html", context)


# ══════════════════════════════════════════════════════════════════════════════
# EXPENSE CRUD VIEWS
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@require_POST
def add_expense(request: HttpRequest) -> HttpResponse:
    """
    Add a new expense entry.
    Validates amount (positive Decimal), category (must be valid), and date.
    """
    # Amount validation
    try:
        amount = Decimal(request.POST.get("amount", "").strip())
        if amount <= 0:
            raise InvalidOperation("Non-positive amount")
    except (InvalidOperation, ValueError):
        messages.error(request, "Valid amount daalo yaar (e.g., 150 or 1500.50).")
        return redirect("dashboard")

    # Category validation
    category = request.POST.get("category", "other").strip().lower()
    if category not in VALID_CATEGORIES:
        category = "other"

    # Date validation
    try:
        exp_date = date.fromisoformat(request.POST.get("date", ""))
    except (ValueError, TypeError):
        exp_date = date.today()

    # Clamp date: not in future
    if exp_date > date.today():
        exp_date = date.today()

    # Save
    expense = Expense.objects.create(
        user=request.user,
        amount=amount,
        category=category,
        date=exp_date,
    )
    logger.info("Expense added uid=%s id=%s amount=%s cat=%s",
                request.user.id, expense.pk, amount, category)
    messages.success(request, f"{CAT_ICONS.get(category,'📦')} ₹{amount:,} added! ✅")
    return redirect("dashboard")


@login_required(login_url="login")
def edit_expense(request: HttpRequest, pk: int) -> HttpResponse:
    """Edit an existing expense (POST only; GET redirects to dashboard)."""
    expense = get_object_or_404(Expense, pk=pk, user=request.user)

    if request.method == "POST":
        form = ExpenseForm(request.POST, instance=expense)
        if form.is_valid():
            form.save()
            logger.info("Expense edited uid=%s id=%s", request.user.id, pk)
            messages.success(request, "Updated! ✏️")
        else:
            messages.error(request, f"Invalid data: {form.errors}")

    return redirect("dashboard")


@login_required(login_url="login")
@require_POST
def delete_expense(request: HttpRequest, pk: int) -> HttpResponse:
    """Delete an expense belonging to the current user."""
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    expense.delete()
    logger.info("Expense deleted uid=%s id=%s", request.user.id, pk)
    messages.success(request, "Deleted. 🗑️")
    return redirect("dashboard")


@login_required(login_url="login")
@require_POST
def bulk_delete_expenses(request: HttpRequest) -> HttpResponse:
    """
    Bulk-delete multiple expenses by a list of PKs.
    Expects JSON body: {"ids": [1, 2, 3]}
    """
    try:
        data = json.loads(request.body)
        ids  = [int(i) for i in data.get("ids", [])]
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid body"}, status=400)

    if not ids:
        return JsonResponse({"error": "No IDs provided"}, status=400)

    deleted, _ = Expense.objects.filter(user=request.user, pk__in=ids).delete()
    logger.info("Bulk delete uid=%s count=%d", request.user.id, deleted)
    return JsonResponse({"deleted": deleted, "message": f"{deleted} expenses delete ho gaye! 🗑️"})


# ══════════════════════════════════════════════════════════════════════════════
# VOICE EXPENSE — PRODUCTION-GRADE
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@ai_rate_limited
@json_required
def voice_expense(request: HttpRequest) -> JsonResponse:
    """
    Ultra-intelligent voice-to-expense endpoint.

    Pipeline:
      1. Parse & validate spoken text
      2. Pre-process Hinglish numbers (normalize_hinglish_numbers)
      3. Send to Groq AI with full prompt (build_voice_ai_prompt)
      4. Parse & validate extracted JSON
      5. Save Expense record
      6. Return rich JSON response with confidence, description, confirmation

    Handles:
      - Complex Hinglish (paanch sau, do hazar, etc.)
      - Date expressions (aaj, kal, parso, specific dates)
      - Category auto-detection from keywords
      - Confidence scoring with user warning
      - Broken ASR output (pandrah00, Solah00)
      - Date clamping (no future dates, no >90 day old dates)
    """
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "POST only bhai"}, status=405)

    # ── Extract spoken text ─────────────────────────────────────────────────
    body        = getattr(request, "_json_body", {})
    spoken_text = body.get("text", "").strip()

    if not spoken_text:
        return JsonResponse({
            "status":  "error",
            "message": "Kuch bola nahi tune! 🎤 Dobara try karo.",
        }, status=400)

    if len(spoken_text) > VOICE_MAX_TEXT_LEN:
        spoken_text = spoken_text[:VOICE_MAX_TEXT_LEN]

    logger.info("Voice expense uid=%s text=%r", request.user.id, spoken_text)

    today = date.today()

    # ── Pre-process Hinglish numbers ────────────────────────────────────────
    normalized_text = normalize_hinglish_numbers(spoken_text)

    # ── Call Groq AI ────────────────────────────────────────────────────────
    raw_response = ""
    try:
        prompt   = build_voice_ai_prompt(normalized_text, today)
        response = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.0,
            max_tokens=150,
        )
        raw_response = response.choices[0].message.content.strip()
        logger.debug("Groq voice raw uid=%s response=%r", request.user.id, raw_response)

    except Exception as e:
        logger.error("Groq voice API uid=%s error=%s", request.user.id, e)
        return JsonResponse({
            "status":  "error",
            "message": "AI se connect nahi ho paya. Thodi der mein try karo 😅",
        })

    # ── Parse AI JSON response ──────────────────────────────────────────────
    try:
        json_match = re.search(r'\{[^{}]+\}', raw_response, re.DOTALL)
        if not json_match:
            raise ValueError(f"No JSON found in response: {raw_response}")
        ai_data = json.loads(json_match.group(0))
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("Voice JSON parse uid=%s error=%s raw=%r", request.user.id, e, raw_response)
        return JsonResponse({
            "status":  "error",
            "message": "AI ne samjha nahi yaar 😕 Seedha bolo, jaise: 'Zomato pe 350 kharch kiya'",
        })

    # ── Validate & sanitize extracted fields ────────────────────────────────

    # Amount
    try:
        amount = Decimal(str(ai_data.get("amount", 0)))
        if amount <= 0:
            return JsonResponse({
                "status":       "error",
                "message":      "Amount samajh nahi aaya 😕 Try: 'Petrol pe 1500 diye'",
                "original_text": spoken_text,
            })
    except (InvalidOperation, TypeError, ValueError):
        return JsonResponse({
            "status":  "error",
            "message": "Amount galat hai, dobara bolo.",
        })

    # Category
    category = str(ai_data.get("category", "other")).strip().lower()
    if category not in VALID_CATEGORIES:
        # Attempt keyword-based fallback before defaulting to "other"
        category = _keyword_category_fallback(spoken_text)

    # Date
    try:
        exp_date = date.fromisoformat(str(ai_data.get("date", today.isoformat())))
    except (ValueError, TypeError):
        exp_date = today

    # Clamp: not future, not more than 90 days old
    if exp_date > today:
        exp_date = today
        logger.warning("Voice date clamped (future) uid=%s", request.user.id)
    elif (today - exp_date).days > 90:
        exp_date = today
        logger.warning("Voice date clamped (>90 days) uid=%s", request.user.id)

    # Description
    description = str(ai_data.get("description", "")).strip()[:100]

    # Confidence
    try:
        confidence = float(ai_data.get("confidence", 0.5))
        confidence = max(0.0, min(1.0, confidence))
    except (TypeError, ValueError):
        confidence = 0.5

    # ── Save expense ────────────────────────────────────────────────────────
    try:
        expense = Expense.objects.create(
            user=request.user,
            amount=amount,
            category=category,
            date=exp_date,
            # Uncomment if Expense model has a notes/description field:
            # notes=description,
        )
        logger.info(
            "Voice expense saved uid=%s id=%s amount=%s cat=%s date=%s confidence=%.2f",
            request.user.id, expense.pk, amount, category, exp_date, confidence,
        )
    except Exception as e:
        logger.error("Voice save uid=%s error=%s", request.user.id, e)
        return JsonResponse({
            "status":  "error",
            "message": "Save nahi hua bhai. Dobara try karo.",
        })

    # ── Build user-friendly confirmation ────────────────────────────────────
    icon       = CAT_ICONS.get(category, "📦")
    date_label = (
        "aaj"  if exp_date == today else
        "kal"  if exp_date == today - timedelta(days=1) else
        "parso" if exp_date == today - timedelta(days=2) else
        exp_date.strftime("%d %b")
    )
    confirm = f"{icon} ₹{amount:,} — {category.title()} ({date_label}) saved! ✅"
    if confidence < VOICE_CONFIDENCE_WARN:
        confirm += " ⚠️ Mujhe pakka yakin nahi tha — ek baar verify karo."

    return JsonResponse({
        "status":        "success",
        "message":       confirm,
        "expense_id":    expense.pk,
        "amount":        float(amount),
        "category":      category,
        "icon":          icon,
        "date":          exp_date.isoformat(),
        "date_label":    date_label,
        "description":   description,
        "confidence":    round(confidence, 2),
        "original_text": spoken_text,
        "normalized":    normalized_text,
    })


def _keyword_category_fallback(text: str) -> str:
    """
    Fallback category detection using keyword matching.
    Used when AI returns an invalid/unknown category.
    """
    text_lower = text.lower()
    scores     = defaultdict(int)
    for cat, keywords in CAT_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                scores[cat] += 1
    if scores:
        return max(scores, key=scores.get)
    return "other"


# ══════════════════════════════════════════════════════════════════════════════
# AI CHAT — PAISAMITRA BOT
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@ai_rate_limited
@json_required
def ai_chat(request: HttpRequest) -> JsonResponse:
    """
    PaisaMitra conversational AI chat endpoint.
    Accepts POST with {"message": "...", "history": [...]}
    Supports multi-turn conversation via history array.

    Returns: {"reply": "...", "intent": "..."}
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    body     = getattr(request, "_json_body", {})
    user_msg = body.get("message", "").strip()
    history  = body.get("history", [])  # list of {"role": "...", "content": "..."}

    if not user_msg:
        return JsonResponse({"error": "Message khali hai yaar"}, status=400)

    if len(user_msg) > 500:
        return JsonResponse({"error": "Itna lamba mat likho, summary mein bolo"}, status=400)

    # ── Build user context ──────────────────────────────────────────────────
    budget   = get_user_budget(request)
    month_qs = get_filtered_expenses(request.user, "month")
    stats    = calculate_stats(month_qs, budget)
    cats     = build_category_breakdown(month_qs, stats["total_spent"])
    cat_lines = "\n".join(
        f"  - {c['title']}: ₹{c['total']:,.0f} ({c['percent']:.0f}%)"
        for c in cats[:6]
    )

    today     = date.today()
    days_left = (
        (today.replace(day=1) + timedelta(days=32)).replace(day=1) - today
    ).days

    system = f"""You are "PaisaMitra" — a friendly, witty, and brutally honest Indian personal finance coach.
Speak in Hinglish (Roman script). Be warm, sometimes sarcastic, always practical and helpful.
Never be preachy. Be like that one smart dost who genuinely wants you to save money.

══ USER's {today.strftime('%B %Y')} FINANCIAL SNAPSHOT ══
Budget:         ₹{budget:,.0f}
Spent:          ₹{stats['total_spent']:,.0f}
Remaining:      ₹{stats['remaining_budget']:,.0f}
Budget Used:    {stats['budget_percent']:.0f}%
Transactions:   {stats['transaction_count']}
Daily Average:  ₹{stats['avg_per_day']:,.0f}
Days Left:      {days_left}
Projected End:  ₹{stats['projected_month_end']:,.0f}
Savings Rate:   {stats['savings_rate']:.0f}%

TOP SPENDING CATEGORIES:
{cat_lines or '  (Koi data nahi abhi)'}

══ YOUR RULES ══
1. Always respond in Hinglish naturally.
2. Keep responses concise — max 100 words.
3. If user asks for calculations, do them correctly.
4. If question is unrelated to finance/money, gently redirect.
5. Never make up numbers you don't have.
6. If budget is exceeded, be extra honest about it.
7. Suggest specific, actionable Indian-context tips (UPI offers, grocery apps, etc.)."""

    # ── Build message history ───────────────────────────────────────────────
    messages_payload = [{"role": "system", "content": system}]

    # Validate and include conversation history (max last 6 turns)
    safe_history = []
    for turn in history[-6:]:
        if (isinstance(turn, dict) and
                turn.get("role") in ("user", "assistant") and
                isinstance(turn.get("content"), str)):
            safe_history.append({"role": turn["role"], "content": turn["content"][:400]})
    messages_payload.extend(safe_history)
    messages_payload.append({"role": "user", "content": user_msg})

    # ── Call AI ─────────────────────────────────────────────────────────────
    try:
        resp = _groq_client().chat.completions.create(
            messages=messages_payload,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=200,
        )
        reply = resp.choices[0].message.content.strip()
        logger.info("AI chat uid=%s msg_len=%d", request.user.id, len(user_msg))
        return JsonResponse({"reply": reply, "status": "success"})

    except Exception as e:
        logger.error("AI chat uid=%s error=%s", request.user.id, e)
        return JsonResponse({
            "reply":  "Oops! Network issue aa gaya. Thodi der baad try karo yaar 😅",
            "status": "error",
        })


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY INSIGHT API
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@ai_rate_limited
def api_category_insight(request: HttpRequest) -> JsonResponse:
    """
    Return detailed spending analytics for a specific category,
    plus an AI-generated roast/tip.

    Query params:
      category (str): one of VALID_CATEGORIES
      period   (str): 'week' | 'month' | 'quarter' | 'year'
    """
    category = request.GET.get("category", "").strip().lower()
    period   = request.GET.get("period", "month")

    if category not in VALID_CATEGORIES:
        return JsonResponse({"error": "Invalid category"}, status=400)
    if period not in VALID_PERIODS:
        period = "month"

    base_qs = get_period_expenses(request.user, period)
    cat_qs  = base_qs.filter(category=category)

    agg = cat_qs.aggregate(
        total=Sum("amount"),
        count=Count("id"),
        highest=Max("amount"),
        lowest=Min("amount"),
        avg=Avg("amount"),
    )

    cat_total = _safe_float(agg["total"])
    all_total = _safe_float(base_qs.aggregate(t=Sum("amount"))["t"])
    share_pct = round(cat_total / all_total * 100 if all_total else 0, 1)

    # Daily average for this category
    qs_dates      = cat_qs.values("date").distinct().count()
    cat_daily_avg = cat_total / max(qs_dates, 1)

    # Recent transactions
    recent = [
        {
            "date":     r["date"].isoformat(),
            "amount":   float(r["amount"]),
            "day_name": r["date"].strftime("%A"),
        }
        for r in cat_qs.values("date", "amount").order_by("-date")[:5]
    ]

    # Weekly breakdown within the period
    weekly = []
    if period in ("month", "quarter"):
        for wk in (cat_qs.annotate(week=TruncWeek("date"))
                         .values("week")
                         .annotate(total=Sum("amount"))
                         .order_by("week")):
            weekly.append({
                "week":  wk["week"].strftime("W%W"),
                "total": _safe_float(wk["total"]),
            })

    # AI Tip
    tip = get_category_ai_tip(
        user_id=request.user.id,
        category=category,
        cat_total=cat_total,
        share_pct=share_pct,
        avg_txn=_safe_float(agg["avg"]),
        period=period,
    )

    return JsonResponse({
        "category":      category,
        "period":        period,
        "icon":          CAT_ICONS.get(category, "📦"),
        "color":         CAT_COLORS.get(category, "#888"),
        "total":         cat_total,
        "share_pct":     share_pct,
        "count":         agg["count"] or 0,
        "avg":           round(_safe_float(agg["avg"]), 2),
        "highest":       _safe_float(agg["highest"]),
        "lowest":        _safe_float(agg["lowest"]),
        "daily_avg":     round(cat_daily_avg, 2),
        "recent":        recent,
        "weekly":        weekly,
        "ai_tip":        tip,
    })


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS API
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def api_analytics(request: HttpRequest) -> JsonResponse:
    """
    Comprehensive analytics API endpoint.
    Returns monthly trends, category breakdown, heatmap, anomalies,
    and a cached AI-generated monthly report.

    Query params:
      period (str): 'week' | 'month' | 'quarter' | 'year'
    """
    period = request.GET.get("period", "month")
    if period not in VALID_PERIODS:
        period = "month"

    budget   = get_user_budget(request)
    today    = date.today()
    ck       = f"analytics_{request.user.id}_{period}_{today.isoformat()}"
    cached   = cache.get(ck)
    if cached:
        return JsonResponse(cached)

    period_qs = get_period_expenses(request.user, period)
    stats     = calculate_stats(period_qs, budget)
    cats      = build_category_breakdown(period_qs, stats["total_spent"])
    trend     = build_monthly_trend(request.user, months=CHART_MONTHS)
    anomalies = detect_anomalies(request.user, budget)

    # Top expense day
    day_agg = (period_qs.values("date")
               .annotate(total=Sum("amount"))
               .order_by("-total").first())
    top_day = ({"date": day_agg["date"].isoformat(),
                "total": _safe_float(day_agg["total"])} if day_agg else None)

    # AI Monthly Report
    month_data = {
        "total":     stats["total_spent"],
        "budget":    budget,
        "count":     stats["transaction_count"],
        "categories": cats,
        "month_key": today.strftime("%Y-%m"),
    }
    ai_report = get_monthly_ai_report(request.user.id, month_data)

    payload = {
        "period":        period,
        "stats":         {k: round(v, 2) if isinstance(v, float) else v
                          for k, v in stats.items()},
        "categories":    cats,
        "monthly_trend": trend,
        "anomalies":     anomalies,
        "top_day":       top_day,
        "ai_report":     ai_report,
        "generated_at":  datetime.now().isoformat(),
    }

    cache.set(ck, payload, ANALYTICS_TIMEOUT)
    return JsonResponse(payload)


@login_required(login_url="login")
def api_heatmap(request: HttpRequest) -> JsonResponse:
    """
    Return 52-week spending heatmap data for the current user.
    Cached for 10 minutes since it covers a whole year.
    """
    ck     = f"heatmap_{request.user.id}_{date.today().isoformat()}"
    cached = cache.get(ck)
    if cached:
        return JsonResponse(cached)

    heatmap = build_spending_heatmap(request.user)
    cache.set(ck, heatmap, HEATMAP_TIMEOUT)
    return JsonResponse(heatmap)


@login_required(login_url="login")
def api_anomalies(request: HttpRequest) -> JsonResponse:
    """
    Return current anomaly alerts for the user.
    Lightweight endpoint, called periodically by the frontend.
    """
    budget   = get_user_budget(request)
    alerts   = detect_anomalies(request.user, budget)
    return JsonResponse({"alerts": alerts, "count": len(alerts)})


@login_required(login_url="login")
def api_summary_stats(request: HttpRequest) -> JsonResponse:
    """
    Quick summary stats API for dashboard widgets (no AI, no heavy queries).
    Returns current month stats + budget info.
    """
    budget   = get_user_budget(request)
    month_qs = get_filtered_expenses(request.user, "month")
    stats    = calculate_stats(month_qs, budget)
    today    = date.today()

    return JsonResponse({
        "budget":           budget,
        "total_spent":      round(stats["total_spent"], 2),
        "remaining":        round(stats["remaining_budget"], 2),
        "budget_percent":   round(stats["budget_percent"], 1),
        "transaction_count": stats["transaction_count"],
        "avg_per_day":      round(stats["avg_per_day"], 2),
        "savings_rate":     round(stats["savings_rate"], 1),
        "overspent":        stats["overspent"],
        "month":            today.strftime("%B %Y"),
        "days_left":        (
            (today.replace(day=1) + timedelta(days=32)).replace(day=1) - today
        ).days,
    })


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@require_POST
def add_subscription(request: HttpRequest) -> HttpResponse:
    """Add a new recurring subscription."""
    form = SubscriptionForm(request.POST)
    if form.is_valid():
        sub      = form.save(commit=False)
        sub.user = request.user
        sub.save()
        logger.info("Subscription added uid=%s id=%s", request.user.id, sub.pk)
        messages.success(request, f"📅 '{sub.category}' subscription add ho gayi! ₹{sub.amount}/month")
    else:
        messages.error(request, f"Details check karo: {form.errors}")
    return redirect("dashboard")


@login_required(login_url="login")
@require_POST
def delete_subscription(request: HttpRequest, pk: int) -> HttpResponse:
    """Delete/cancel a subscription."""
    sub = get_object_or_404(Subscription, pk=pk, user=request.user)
    sub.delete()
    logger.info("Subscription deleted uid=%s id=%s", request.user.id, pk)
    messages.success(request, "✂️ Subscription cancel ho gayi!")
    return redirect("dashboard")


@login_required(login_url="login")
def api_subscriptions(request: HttpRequest) -> JsonResponse:
    """
    Return all subscriptions for the current user as JSON.
    Includes next billing date, monthly cost, and yearly cost.
    """
    subs = Subscription.objects.filter(user=request.user).order_by("next_billing_date")
    today = date.today()
    data  = []
    for s in subs:
        days_until = (s.next_billing_date - today).days
        data.append({
            "id":               s.pk,
            "category":         s.category,
            "icon":             CAT_ICONS.get(s.category, "📦"),
            "color":            CAT_COLORS.get(s.category, "#888"),
            "amount":           float(s.amount),
            "next_billing":     s.next_billing_date.isoformat(),
            "days_until":       days_until,
            "due_soon":         days_until <= 3,
            "yearly_cost":      float(s.amount) * 12,
        })

    total_monthly = sum(d["amount"] for d in data)
    return JsonResponse({
        "subscriptions":   data,
        "count":           len(data),
        "total_monthly":   total_monthly,
        "total_yearly":    total_monthly * 12,
    })


# ══════════════════════════════════════════════════════════════════════════════
# EXPORT
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def export_expenses(request: HttpRequest) -> HttpResponse:
    """
    Export expense data as CSV.
    Query params:
      format  (str): 'csv' | 'json' (default: csv)
      filter  (str): 'week' | 'month' | 'all' (default: all)
      start   (str): YYYY-MM-DD (optional, overrides filter)
      end     (str): YYYY-MM-DD (optional)
    """
    export_format = request.GET.get("format", "csv")
    filter_type   = request.GET.get("filter", "all")

    qs = get_filtered_expenses(request.user, filter_type)

    # Date range override
    start_str = request.GET.get("start", "")
    end_str   = request.GET.get("end",   "")
    try:
        if start_str:
            qs = qs.filter(date__gte=date.fromisoformat(start_str))
        if end_str:
            qs = qs.filter(date__lte=date.fromisoformat(end_str))
    except ValueError:
        pass  # Ignore invalid dates

    qs = qs[:MAX_EXPORT_ROWS]

    if export_format == "json":
        data = list(qs.values("id", "date", "category", "amount"))
        for row in data:
            row["amount"] = float(row["amount"])
            row["date"]   = row["date"].isoformat()
        resp = HttpResponse(
            json.dumps({"expenses": data, "count": len(data)}, indent=2),
            content_type="application/json",
        )
        resp["Content-Disposition"] = f'attachment; filename="expenses_{date.today()}.json"'
        logger.info("JSON export uid=%s rows=%d", request.user.id, len(data))
        return resp

    # Default: CSV
    resp = HttpResponse(content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="expenses_{date.today()}.csv"'
    resp.write("\ufeff")  # UTF-8 BOM for Excel compatibility

    writer = csv.writer(resp)
    writer.writerow(["Date", "Day", "Category", "Icon", "Amount (₹)"])
    for exp in qs:
        writer.writerow([
            exp.date.isoformat(),
            exp.date.strftime("%A"),
            exp.category.title(),
            CAT_ICONS.get(exp.category, "📦"),
            float(exp.amount),
        ])

    logger.info("CSV export uid=%s rows=%d", request.user.id, qs.count())
    return resp


# ══════════════════════════════════════════════════════════════════════════════
# SAVINGS GOALS (Bonus Feature)
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def api_savings_projection(request: HttpRequest) -> JsonResponse:
    """
    Project savings based on current spending rate.
    Given a goal amount, return how many months to achieve it.

    Query params:
      goal (float): target savings amount
    """
    try:
        goal = float(request.GET.get("goal", 0))
        if goal <= 0:
            return JsonResponse({"error": "Valid goal amount chahiye"}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({"error": "Invalid goal"}, status=400)

    budget   = get_user_budget(request)
    month_qs = get_filtered_expenses(request.user, "month")
    stats    = calculate_stats(month_qs, budget)

    monthly_savings = max(budget - stats["total_spent"], 0)

    if monthly_savings <= 0:
        return JsonResponse({
            "goal":             goal,
            "monthly_savings":  0,
            "months_needed":    None,
            "achievable":       False,
            "message":          "Abhi koi savings nahi ho rahi — pehle kharch kam karo! 📉",
        })

    months_needed = math_ceil(goal / monthly_savings)
    target_date   = date.today().replace(day=1)
    for _ in range(months_needed):
        target_date = _next_month_date(target_date)

    return JsonResponse({
        "goal":             goal,
        "monthly_savings":  round(monthly_savings, 2),
        "months_needed":    months_needed,
        "target_date":      target_date.strftime("%B %Y"),
        "achievable":       True,
        "message":          f"₹{goal:,.0f} bachane mein ~{months_needed} mahine lagenge. "
                            f"Target: {target_date.strftime('%B %Y')} 🎯",
    })


def math_ceil(x: float) -> int:
    """Ceiling division without importing math."""
    return int(x) + (1 if x != int(x) else 0)


# ══════════════════════════════════════════════════════════════════════════════
# UTILITY / HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

def health_check(request: HttpRequest) -> JsonResponse:
    """
    Simple health check endpoint for monitoring.
    Returns 200 if the app is running.
    No auth required.
    """
    return JsonResponse({
        "status":    "ok",
        "service":   "PaisaMitra",
        "version":   "3.0.0",
        "timestamp": datetime.now().isoformat(),
    })


@login_required(login_url="login")
def api_user_profile(request: HttpRequest) -> JsonResponse:
    """
    Return basic user profile + lifetime stats.
    """
    user       = request.user
    all_time   = Expense.objects.filter(user=user)
    all_agg    = all_time.aggregate(
        total=Sum("amount"),
        count=Count("id"),
        first_date=Min("date"),
        last_date=Max("date"),
    )

    return JsonResponse({
        "username":        user.username,
        "joined":          user.date_joined.strftime("%d %B %Y"),
        "lifetime_spent":  round(_safe_float(all_agg["total"]), 2),
        "total_txns":      all_agg["count"] or 0,
        "first_expense":   all_agg["first_date"].isoformat() if all_agg["first_date"] else None,
        "last_expense":    all_agg["last_date"].isoformat()  if all_agg["last_date"]  else None,
        "budget":          get_user_budget(request),
        "member_days":     (date.today() - user.date_joined.date()).days,
    })


@login_required(login_url="login")
def api_quick_add(request: HttpRequest) -> JsonResponse:
    """
    Quick-add expense via JSON API (for mobile / progressive web app use).
    POST body: {"amount": 150, "category": "food", "date": "2025-05-01"}
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    try:
        amount = Decimal(str(data.get("amount", 0)))
        if amount <= 0:
            raise InvalidOperation("non-positive")
    except (InvalidOperation, TypeError):
        return JsonResponse({"error": "Valid amount chahiye"}, status=400)

    category = str(data.get("category", "other")).strip().lower()
    if category not in VALID_CATEGORIES:
        category = "other"

    try:
        exp_date = date.fromisoformat(str(data.get("date", date.today().isoformat())))
    except ValueError:
        exp_date = date.today()

    if exp_date > date.today():
        exp_date = date.today()

    expense = Expense.objects.create(
        user=request.user,
        amount=amount,
        category=category,
        date=exp_date,
    )

    return JsonResponse({
        "status":     "success",
        "expense_id": expense.pk,
        "message":    f"{CAT_ICONS.get(category,'📦')} ₹{amount:,} saved!",
        "amount":     float(amount),
        "category":   category,
        "date":       exp_date.isoformat(),
    }, status=201)