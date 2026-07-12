"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║          PAISA MITRA — EXPENSE TRACKER  |  views.py  |  Production v3.2        ║
║          Full-stack Django views with AI, Voice, Analytics & Smart Features     ║
╚══════════════════════════════════════════════════════════════════════════════════╝
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
from django.contrib.auth.forms import AuthenticationForm
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
from django.http import JsonResponse
import json
from django.conf import settings
from .models import Expense, Subscription, UserProfile, SavingsGoal, SplitGroup, SplitExpense, SplitMember
from .forms import ExpenseForm, SubscriptionForm, CustomRegistrationForm

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer
from django.db.models import Sum



# ══════════════════════════════════════════════════════════════════════════════
# CONSTANTS & CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

logger = logging.getLogger(__name__)

DEFAULT_BUDGET       = 20_000.0
MAX_UPCOMING_SUBS    = 5
CHART_DAYS           = 7
CHART_MONTHS         = 6
EXPENSES_PER_PAGE    = 15
MAX_EXPORT_ROWS      = 10_000

AI_CACHE_TIMEOUT     = 300
CAT_CACHE_TIMEOUT    = 180
ANALYTICS_TIMEOUT    = 120
HEATMAP_TIMEOUT      = 600

AI_RATE_LIMIT_CALLS  = 60
AI_RATE_LIMIT_WINDOW = 3600

VOICE_MAX_TEXT_LEN   = 500
VOICE_CONFIDENCE_WARN = 0.60

ANOMALY_MULTIPLIER   = 2.5

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

HINGLISH_NUM_MAP = {
    r'\bek\b':        '1',
    r'\bdo\b':        '2',
    r'\bteen\b':      '3',
    r'\bchar\b':      '4',
    r'\bpaanch\b':    '5',
    r'\bchhe\b':      '6',
    r'\bsaat\b':      '7',
    r'\baath\b':      '8',
    r'\bnau\b':       '9',
    r'\bdas\b':       '10',
    r'\bgyarah\b':    '11',
    r'\bbaarah\b':    '12',
    r'\bterah\b':     '13',
    r'\bchaudah\b':   '14',
    r'\bpandrah\b':   '15',
    r'\bsolah\b':     '16',
    r'\bsattrah\b':   '17',
    r'\baathaarah\b': '18',
    r'\bunees\b':     '19',
    r'\bbees\b':      '20',
    r'\bpaccheees\b': '25',
    r'\btees\b':      '30',
    r'\bchaalis\b':   '40',
    r'\bpackaas\b':   '50',
    r'\saath\b':      '60',
    r'\bsaattar\b':   '70',
    r'\bassee\b':     '80',
    r'\bnabbe\b':     '90',
    r'\bsau\b':       '00',
    r'\bsou\b':       '00',
    r'\bhazar\b':     '000',
    r'\bhajaar\b':    '000',
    r'\blakh\b':      '00000',
    r'\bkarod\b':     '0000000',
}

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ══════════════════════════════════════════════════════════════════════════════
# DECORATORS & UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

from rest_framework.authtoken.models import Token

from django.views.decorators.csrf import csrf_exempt

def api_login_required(view_func):
    @csrf_exempt
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user and request.user.is_authenticated:
            return view_func(request, *args, **kwargs)
            
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1]
            try:
                token = Token.objects.get(key=token_key)
                request.user = token.user
                return view_func(request, *args, **kwargs)
            except Token.DoesNotExist:
                pass
                
        return JsonResponse({"error": "Authentication credentials were not provided."}, status=401)
    return wrapper

def ai_rate_limited(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return view_func(request, *args, **kwargs)
        ck = f"ai_rate_{request.user.id}"
        count = cache.get(ck, 0)
        if count >= AI_RATE_LIMIT_CALLS:
            return JsonResponse({
                "error": "Rate limit reached. Please try again after one hour. 🕐"
            }, status=429)
        cache.set(ck, count + 1, AI_RATE_LIMIT_WINDOW)
        return view_func(request, *args, **kwargs)
    return wrapper


def json_required(view_func):
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
    if hasattr(request, "user") and request.user.is_authenticated:
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.monthly_budget and profile.monthly_budget > 0:
                return float(profile.monthly_budget)
        except UserProfile.DoesNotExist:
            pass
    try:
        budget = float(request.session.get("budget", DEFAULT_BUDGET))
        return budget if budget > 0 else DEFAULT_BUDGET
    except (ValueError, TypeError):
        return DEFAULT_BUDGET


def _groq_client() -> Groq:
    return Groq(api_key=settings.GROQ_API_KEY)


def _cache_key(*parts) -> str:
    raw = "_".join(str(p) for p in parts)
    return hashlib.md5(raw.encode()).hexdigest()[:24]


def _safe_float(value, default: float = 0.0) -> float:
    try:
        return float(value or default)
    except (ValueError, TypeError):
        return default


# ══════════════════════════════════════════════════════════════════════════════
# HINGLISH VOICE PRE-PROCESSOR
# ══════════════════════════════════════════════════════════════════════════════

def normalize_hinglish_numbers(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'([a-z]+)(\d{2,})', r'\1 \2', text)
    text = re.sub(r'(\d+)([a-z]+)', r'\1 \2', text)
    for pattern, replacement in HINGLISH_NUM_MAP.items():
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s+(0{2,})', r'\1\2', text)
    text = re.sub(r'\s+', ' ', text).strip()
    logger.debug("Normalized Hinglish: %r", text)
    return text


def build_conversational_ai_prompt(today, user_context: dict) -> str:
    user_name = user_context.get('name', 'User')
    return f"""
    You are PaisaMitra, an insanely smart, brutally honest, funny, and extremely helpful Indian financial AI coach.
    You understand WhatsApp Hinglish slang perfectly (e.g., 'khrcha', 'sb', 'btvo', 'kaha', 'kaisa', 'kitan').
    You analyze the user's message and decide if they want to LOG an expense, OR just chat/ask a question.
    
    Today's Date: {today}
    
    User Context:
    - Name: {user_name}
    - Dashboard Link: https://ajay160380-paisa-mitra.hf.space
    - Monthly Budget: ₹{user_context.get('budget', 20000)}
    - Total Spent This Month: ₹{user_context.get('spent', 0)}
    - Remaining Budget: ₹{user_context.get('remaining', 0)}
    - Category-wise Breakdown: {user_context.get('category_breakdown', 'None')}
    - Recent Expenses: {user_context.get('recent_expenses', 'None')}

    Rules for Routing:
    1. If the user explicitly gives an AMOUNT to log an expense (e.g. "500 ki chai", "petrol 200", "bought a shirt for 1000"):
       - action = "log_expense"
       - amount = exact number extracted.
       - category = one of: food, transport, shopping, health, entertainment, education, utilities, other.
       - description = short description (e.g. "chai", "petrol").
    2. If the user is ASKING a question, requesting a summary, complaining, or chatting (e.g. "khrcha kitan kiya maine", "kaha kaha khrcha kiya", "summary", "hi", "mai garib hu"):
       - action = "chat"
       - chat_response = your natural, conversational, sarcastic but helpful English reply.
         - You MUST ALWAYS reply in pure English, even if the user speaks in Hindi or Hinglish.
         - Address the user by their name ({user_name}) when appropriate!
         - You MUST use WhatsApp formatting (e.g., *bold* for emphasis).
         - Always use relevant emojis (e.g. 💰, 📉, 🚨, 🍜).
         - Use bullet points (`• `) when listing expenses or details.
         - If the user asks where they spent money ("kaha kaha khrcha kiya"), use the 'Category-wise Breakdown' from the context to give them a detailed list!
         - If the user asks who created/made you (e.g. "kisne banaya", "who is your creator", "developer"), reply EXACTLY with this text:
*Hello {user_name}!* 🙋‍♂️ I'm PaisaMitra, your personal financial AI coach. I was created by *Ajay Vishwakarma*, a seasoned AI/ML & Full Stack Developer with a passion for finance and technology. 🤖

You can learn more about my creator's work here:
🌐 *Portfolio:* https://ajay-portfolio-r176.onrender.com
🐙 *GitHub:* https://github.com/ajay160380
📧 *Email:* ajaykumar160380@gmail.com 💻

Now, let's get back to your finances! How can I assist you today?
         - Ensure the message looks premium, attractive, and well-spaced. Keep it concise but deeply informative.

    Response MUST be strict JSON ONLY. No markdown, no extra text.
    {{
        "action": "log_expense" | "chat",
        "expense_details": {{
            "amount": 0,
            "category": "other",
            "description": ""
        }},
        "chat_response": ""
    }}
    """

# ══════════════════════════════════════════════════════════════════════════════
# SERVICE LAYER — DATA QUERIES
# ══════════════════════════════════════════════════════════════════════════════

def _next_month_date(d: date) -> date:
    m = d.month % 12 + 1
    y = d.year + (1 if d.month == 12 else 0)
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


@transaction.atomic
def process_subscriptions(user) -> int:
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
    qs = Expense.objects.filter(user=user)

    if search_query:
        qs = qs.filter(Q(category__icontains=search_query))

    today = date.today()
    if filter_type == "week":
        qs = qs.filter(date__gte=today - timedelta(days=7))
    elif filter_type == "month":
        qs = qs.filter(date__year=today.year, date__month=today.month)

    return qs.order_by("-date", "-id")


def get_period_expenses(user, period: str):
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
    today  = date.today()
    result = []
    for i in range(months - 1, -1, -1):
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
    today  = date.today()
    start  = today - timedelta(days=364)

    day_map = {
        r["date"]: _safe_float(r["total"])
        for r in (Expense.objects
                  .filter(user=user, date__range=(start, today))
                  .values("date")
                  .annotate(total=Sum("amount")))
    }

    weeks = []
    cur   = start - timedelta(days=start.weekday())
    while cur <= today:
        week = []
        for d in range(7):
            day   = cur + timedelta(days=d)
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
    alerts = []
    today  = date.today()

    month_qs    = Expense.objects.filter(user=user, date__year=today.year, date__month=today.month)
    month_agg   = month_qs.aggregate(total=Sum("amount"), days=Count("date", distinct=True))
    month_total = _safe_float(month_agg["total"])
    active_days = max(month_agg["days"] or 1, 1)
    avg_daily   = month_total / active_days

    today_total = _safe_float(
        month_qs.filter(date=today).aggregate(t=Sum("amount"))["t"]
    )
    if avg_daily > 0 and today_total > avg_daily * ANOMALY_MULTIPLIER:
        alerts.append({
            "type":     "spending_spike",
            "icon":     "🚨",
            "message":  f"Today you spent ₹{today_total:,.0f} — {today_total/avg_daily:.1f}x above the daily average. Watch your spending.",
            "severity": "high",
        })

    if month_total > budget:
        over_by = month_total - budget
        alerts.append({
            "type":     "budget_exceeded",
            "icon":     "💸",
            "message":  f"Budget exceeded by ₹{over_by:,.0f}! You spent ₹{month_total:,.0f} against a ₹{budget:,.0f} budget. Take action now. 😬",
            "severity": "critical",
        })
    elif avg_daily > 0:
        days_in_month  = calendar.monthrange(today.year, today.month)[1]
        days_remaining = days_in_month - today.day
        projected_end  = month_total + (avg_daily * days_remaining)
        if projected_end > budget * 1.1:
            alerts.append({
                "type":     "projected_overspend",
                "icon":     "📈",
                "message":  f"If spending continues, you'll spend ₹{projected_end:,.0f} by month end against ₹{budget:,.0f} budget. Start saving! 🏃",
                "severity": "warning",
            })

    cat_agg = (month_qs.values("category")
               .annotate(total=Sum("amount"))
               .order_by("-total").first())
    if cat_agg and month_total > 0:
        cat_pct = _safe_float(cat_agg["total"]) / month_total * 100
        if cat_pct > 60:
            cat = cat_agg["category"]
            alerts.append({
                "type":     "category_dominance",
                "icon":     CAT_ICONS.get(cat, "📦"),
                "message":  f"{cat.title()} accounts for {cat_pct:.0f}% of your spending. Too much in one category — diversify.",
                "severity": "warning",
            })

    return alerts


# ══════════════════════════════════════════════════════════════════════════════
# SERVICE LAYER — AI INSIGHTS
# ══════════════════════════════════════════════════════════════════════════════

def get_ai_insight(user_id: int, expenses, budget: float, total_spent: float) -> str:
    ck = f"ai_insight_{user_id}_{int(budget)}_{int(total_spent)}"
    if hit := cache.get(ck):
        return hit

    try:
        summary   = "; ".join(f"{e.category}: ₹{e.amount}" for e in expenses[:5]) or "No data"
        remaining = max(0, budget - total_spent)
        days_left = (
            (date.today().replace(day=1) + timedelta(days=32)).replace(day=1) - date.today()
        ).days

        prompt = (
            f"You are a brutally honest, funny Indian financial coach.\n"
            f"Budget: ₹{budget:,.0f} | Spent: ₹{total_spent:,.0f} | "
            f"Remaining: ₹{remaining:,.0f} | Days left this month: {days_left}\n"
            f"Recent expenses: {summary}\n\n"
            f"Write ONE punchy English sentence. Rules:\n"
            f"- Sarcastic but loving\n"
            f"- Include a specific relatable pop-culture reference\n"
            f"- Under 30 words\n"
            f"- End with a practical micro-tip\n"
            f"- ONLY return the sentence, nothing else."
        )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.85,
            max_tokens=90,
        )
        insight = r.choices[0].message.content.strip()
        cache.set(ck, insight, AI_CACHE_TIMEOUT)
        return insight

    except Exception as e:
        logger.error("AI insight uid=%s error=%s", user_id, e)
        remaining = max(0, budget - total_spent)
        return f"You have ₹{remaining:,.0f} remaining — reduce takeout and cook at home to save more. 🍛"


def get_category_ai_tip(user_id: int, category: str, cat_total: float,
                         share_pct: float, avg_txn: float, period: str) -> str:
    ck = f"cat_tip_{user_id}_{category}_{period}_{int(cat_total)}"
    if hit := cache.get(ck):
        return hit

    try:
        prompt = (
            f"You are a witty Indian financial coach.\n"
            f"User spent ₹{cat_total:,.0f} on {category} this {period}.\n"
            f"That's {share_pct:.1f}% of their total budget.\n"
            f"Average per transaction: ₹{avg_txn:,.0f}.\n\n"
            f"Write ONE English sentence that:\n"
            f"- Roasts this {category} spending with a funny reference\n"
            f"- Gives ONE specific saving hack for {category}\n"
            f"- Is under 35 words\n"
            f"- ONLY return the sentence."
        )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.85,
            max_tokens=100,
        )
        tip = r.choices[0].message.content.strip()
        cache.set(ck, tip, CAT_CACHE_TIMEOUT)
        return tip

    except Exception as e:
        logger.error("Cat tip uid=%s cat=%s error=%s", user_id, category, e)
        return f"So much on {category.title()}? Try to tighten control on this category. 💸"


def get_monthly_ai_report(user_id: int, month_data: dict) -> str:
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
            f"Write a 2-sentence English monthly report:\n"
            f"Sentence 1: Summary of how the month went (honest, slightly funny)\n"
            f"Sentence 2: One specific action for next month\n"
            f"ONLY return the 2 sentences. No headings."
        )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.75,
            max_tokens=120,
        )
        report = r.choices[0].message.content.strip()
        cache.set(ck, report, AI_CACHE_TIMEOUT)
        return report

    except Exception as e:
        logger.error("Monthly report uid=%s error=%s", user_id, e)
        return "This month's report could not be generated. Pay closer attention next month! 📊"


# ══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION VIEWS
# ══════════════════════════════════════════════════════════════════════════════

# ─── NAYA: API Based Registration (Phone Link ke saath) ───
class RegisterAPIView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "status": "success", 
                "message": "Registration done! You can now track your expenses using your WhatsApp number."
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def register(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = CustomRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            request.session['show_wa_banner'] = True
            logger.info("New user registered uid=%s username=%s", user.id, user.username)
            messages.success(request, "Account created! Send a message on WhatsApp 🎉")
            return redirect("dashboard")
        else:
            print("FORM ERRORS:", form.errors)
            messages.error(request, "Some details are incorrect, please check again.")
    else:
        form = CustomRegistrationForm()

    return render(request, "tracker/register.html", {"form": form})


def user_login(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            request.session['show_wa_banner'] = True
            logger.info("User login uid=%s", user.id)
            messages.success(request, f"Welcome back {user.username}! 👋")
            return redirect(request.GET.get("next", "dashboard"))
        messages.error(request, "Invalid username or password.")
    else:
        form = AuthenticationForm()

    return render(request, "tracker/login.html", {"form": form})


@login_required(login_url="login")
def user_logout(request: HttpRequest) -> HttpResponse:
    logger.info("User logout uid=%s", request.user.id)
    logout(request)
    messages.info(request, "You have been logged out. See you soon! 👋")
    return redirect("login")


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD VIEW
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def dashboard(request: HttpRequest) -> HttpResponse:
    user = request.user
    
    # UserProfile fetch karo taaki budget DB mein permanently save ho sake
    profile, created = UserProfile.objects.get_or_create(user=user)

    # WhatsApp token logic removed for simpler phone linking

    # ──────────────────────────────────────────────────────────────────────────
    # FIX 1: Budget update logic ab Database use karega, Session nahi
    # ──────────────────────────────────────────────────────────────────────────
    if request.method == "POST" and "new_budget" in request.POST:
        try:
            nb = float(request.POST["new_budget"])
            if nb <= 0:
                raise ValueError("Budget must be positive")
            profile.monthly_budget = nb
            profile.save()  # Permanently saved in DB!
            logger.info("Budget updated uid=%s budget=%.0f", user.id, nb)
            messages.success(request, f"Budget set: ₹{nb:,.0f} 💰")
        except (ValueError, TypeError):
            messages.error(request, "Please enter a valid budget (positive number).")
        return redirect("dashboard")

    # Fallback default agar profile mein budget na ho
    budget = float(getattr(profile, 'monthly_budget', 20000)) 
    today  = date.today()

    debits = process_subscriptions(user)
    if debits:
        messages.info(request, f"📅 {debits} subscription(s) were auto-deducted.")

    upcoming_subs = (Subscription.objects
                     .filter(user=user, next_billing_date__gte=today)
                     .order_by("next_billing_date")[:MAX_UPCOMING_SUBS])

    search_query = request.GET.get("q", "").strip()
    filter_type  = request.GET.get("filter", "month")
    if filter_type not in VALID_FILTERS:
        filter_type = "month"

    expenses_qs        = get_filtered_expenses(user, filter_type, search_query)
    chart_data         = build_chart_data(user)
    anomaly_alerts     = detect_anomalies(user, budget)

    # ──────────────────────────────────────────────────────────────────────────
    # PERFECT AGGREGATION (Jo tumne likha tha, ekdum mast hai)
    # ──────────────────────────────────────────────────────────────────────────
    actual_month_total = float(
        Expense.objects.filter(
            user=user,
            date__year=today.year,
            date__month=today.month
        ).aggregate(t=Sum("amount"))["t"] or 0
    )
    actual_week_total = float(
        Expense.objects.filter(
            user=user,
            date__gte=today - timedelta(days=7)
        ).aggregate(t=Sum("amount"))["t"] or 0
    )
    actual_all_total = float(
        Expense.objects.filter(user=user).aggregate(t=Sum("amount"))["t"] or 0
    )

    if filter_type == "month":
        current_total_spent = actual_month_total
    elif filter_type == "week":
        current_total_spent = actual_week_total
    else:  
        current_total_spent = actual_all_total

    remaining_budget = max(budget - current_total_spent, 0)
    budget_percent   = min(current_total_spent / max(budget, 0.01) * 100, 100)

    stats = calculate_stats(expenses_qs, budget)
    stats["total_spent"]      = current_total_spent
    stats["remaining_budget"] = remaining_budget
    stats["budget_percent"]   = budget_percent
    stats["overspent"]        = current_total_spent > budget

    category_data_list = build_category_breakdown(expenses_qs, current_total_spent)

    # ──────────────────────────────────────────────────────────────────────────
    # FIX 2: Paginator hata diya taaki frontend JS search theek se kaam kare
    # Ab 'expenses_qs' direct pass ho raha hai (sirf array mein bhejne ke liye)
    # ──────────────────────────────────────────────────────────────────────────
    if stats.get("transaction_count", 0) == 0:
        insight = "<strong>Get started!</strong> Add your first expense to receive guidance. 🚀"
    else:
        # Fast rule-based insight fallback to avoid slow Groq API calls on page load
        insight = f"<strong>Smart Tracker:</strong> You have spent ₹{current_total_spent:,.0f} so far. Keep it under ₹{budget:,.0f}!"

    # ──────────────────────────────────────────────────────────────────────────
    # 🔥 PAISAMITRA AI TIPS LOGIC (Added by Ajay's Backend setup)
    # ──────────────────────────────────────────────────────────────────────────
    ai_main_tip = "Hello! I am PaisaMitra — ask me anything about your finances!"
    ai_sub_tip = ""

    if budget > 0 and current_total_spent > 0:
        # 1. Main Tip Logic (Budget Check)
        if budget_percent < 50:
            ai_main_tip = f"Great job! You used only {budget_percent:.1f}% of your budget — you can comfortably save ₹{remaining_budget:,.0f} more. 🌟"
        elif budget_percent <= 80:
            ai_main_tip = f"You are on track! You've used {budget_percent:.1f}% of your budget."
        else:
            ai_main_tip = f"Alert! 🚨 You've used {budget_percent:.1f}% of your budget. Time to cut back!"

        # 2. Sub Tip Logic (Highest Category Check)
        top_category = expenses_qs.values('category').annotate(total=Sum('amount')).order_by('-total').first()
        
        if top_category and top_category['total']:
            cat_name = top_category['category'].capitalize()
            cat_percent = (float(top_category['total']) / current_total_spent) * 100
            
            if cat_percent > 40:
                ai_sub_tip = f"{cat_name} accounts for {cat_percent:.0f}% of your spending. Too much in one category — diversify."
            else:
                ai_sub_tip = f"Your spending is well diversified! Highest is {cat_name} at {cat_percent:.0f}%."

    monthly_trend = build_monthly_trend(user, months=CHART_MONTHS)

    # ──────────────────────────────────────────────────────────────────────────
    # NAYA FEATURE: Monthly Comparison Data
    # ──────────────────────────────────────────────────────────────────────────
    comparison = build_monthly_comparison(user)

    # ──────────────────────────────────────────────────────────────────────────
    # NAYA FEATURE: Savings Goals
    # ──────────────────────────────────────────────────────────────────────────
    savings_goals = SavingsGoal.objects.filter(user=user, is_completed=False)[:5]
    completed_goals = SavingsGoal.objects.filter(user=user, is_completed=True).count()

    # ──────────────────────────────────────────────────────────────────────────
    # NAYA FEATURE: Split Groups
    # ──────────────────────────────────────────────────────────────────────────
    active_splits_qs = SplitGroup.objects.filter(creator=user, is_settled=False).annotate(
        total_expense=Sum('expenses__amount')
    )[:5]
    
    active_splits = []
    for s in active_splits_qs:
        s.tot = s.total_expense or 0
        mc = s.members.count()
        s.pp = s.tot / mc if mc > 0 else 0
        active_splits.append(s)

    show_wa_banner = request.session.pop('show_wa_banner', False)

    context = {
        "budget":               budget,
        "insight":              insight,
        "ai_main_tip":          ai_main_tip,   # <-- Ye yahan add kiya
        "ai_sub_tip":           ai_sub_tip,    # <-- Ye yahan add kiya
        "anomaly_alerts":       anomaly_alerts,
        "category_data_list":   category_data_list,
        "chart_data":           chart_data,
        "monthly_trend":        monthly_trend,
        "show_wa_banner":       show_wa_banner,
        
        "expenses":             expenses_qs, 
        
        "current_filter":       filter_type,
        "whatsapp_linked":      profile.whatsapp_linked,
        "whatsapp_number":      profile.whatsapp_number,
        "user_phone":           profile.phone_number,
        "search_query":         search_query,
        "form":                 ExpenseForm(),
        "sub_form":             SubscriptionForm(),
        "upcoming_subs":        upcoming_subs,
        "today_month_year":     today.strftime("%B %Y"),
        "valid_categories":     sorted(VALID_CATEGORIES),
        "cat_icons":            CAT_ICONS,
        "cat_colors":           CAT_COLORS,
        "actual_month_total":   actual_month_total,
        "actual_week_total":    actual_week_total,
        "actual_all_total":     actual_all_total,
        "total_spent":          current_total_spent,
        "remaining_budget":     remaining_budget,
        "budget_percent":       budget_percent,
        "comparison":            comparison,
        "savings_goals":         savings_goals,
        "completed_goals_count": completed_goals,
        "active_splits":         active_splits,
        **stats,  
    }
    return render(request, "tracker/dashboard.html", context)

# ══════════════════════════════════════════════════════════════════════════════
# EXPENSE CRUD VIEWS
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@require_POST
def add_expense(request: HttpRequest) -> HttpResponse:
    try:
        amount = Decimal(request.POST.get("amount", "").strip())
        if amount <= 0:
            raise InvalidOperation("Non-positive amount")
    except (InvalidOperation, ValueError):
        messages.error(request, "Please enter a valid amount (e.g., 150 or 1500.50).")
        return redirect("dashboard")

    category = request.POST.get("category", "other").strip().lower()
    if category not in VALID_CATEGORIES:
        category = "other"

    try:
        exp_date = date.fromisoformat(request.POST.get("date", ""))
    except (ValueError, TypeError):
        exp_date = date.today()

    if exp_date > date.today():
        exp_date = date.today()

    expense = Expense.objects.create(
        user=request.user,
        amount=amount,
        category=category,
        date=exp_date,
    )
    logger.info("Expense added uid=%s id=%s amount=%s cat=%s",
                request.user.id, expense.pk, amount, category)

    # --- Gamification Logic ---
    profile, created = UserProfile.objects.get_or_create(user=request.user)
    today = date.today()

    # 1. Streak Logic 🔥
    if profile.last_expense_date == today - timedelta(days=1):
        profile.streak += 1
    elif profile.last_expense_date != today:
        profile.streak = 1
    profile.last_expense_date = today

    # 2. XP Logic ⭐️ (Har entry par 20 XP)
    profile.xp += 20

    # 3. Level Logic 🚀 (Har 100 XP par naya Level)
    profile.level = (profile.xp // 100) + 1

    profile.save()

    messages.success(request, f"{CAT_ICONS.get(category,'📦')} ₹{amount:,} added! ✅")
    return redirect("dashboard")


@login_required(login_url="login")
def edit_expense(request: HttpRequest, pk: int) -> HttpResponse:
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
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    expense.delete()
    logger.info("Expense deleted uid=%s id=%s", request.user.id, pk)
    messages.success(request, "Deleted. 🗑️")
    return redirect("dashboard")


@login_required(login_url="login")
@require_POST
def bulk_delete_expenses(request: HttpRequest) -> HttpResponse:
    try:
        data = json.loads(request.body)
        ids  = [int(i) for i in data.get("ids", [])]
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid body"}, status=400)

    if not ids:
        return JsonResponse({"error": "No IDs provided"}, status=400)

    deleted, _ = Expense.objects.filter(user=request.user, pk__in=ids).delete()
    logger.info("Bulk delete uid=%s count=%d", request.user.id, deleted)
    return JsonResponse({"deleted": deleted, "message": f"{deleted} expenses deleted! 🗑️"})


# ══════════════════════════════════════════════════════════════════════════════
# VOICE EXPENSE — DUAL MODE (Web Browser + WhatsApp)
# ══════════════════════════════════════════════════════════════════════════════

import tempfile
import os

@csrf_exempt
@ai_rate_limited
def voice_expense(request: HttpRequest) -> JsonResponse:
    """
    Dual-mode voice expense endpoint:
    - Browser mode: No phone needed — uses logged-in session user directly.
    - WhatsApp mode: Phone number se UserProfile dhoondo, uska user lo.
    - Mobile App mode: Accepts audio files for speech-to-text via Whisper.
    """
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Only POST allowed."}, status=405)

    incoming_phone = ""
    spoken_text = ""

    # ── Check Content-Type ─────────────────────────────────────────────────────
    content_type = request.content_type
    
    if content_type == 'application/json':
        try:
            body = json.loads(request.body)
            incoming_phone = str(body.get("phone", "")).strip()
            spoken_text = str(body.get("text", "")).strip()
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"status": "error", "message": "Invalid JSON."}, status=400)
            
    elif content_type.startswith('multipart/form-data'):
        # For Mobile App Audio Uploads
        incoming_phone = str(request.POST.get("phone", "")).strip()
        audio_file = request.FILES.get("audio")
        
        if audio_file:
            try:
                # Save uploaded file temporarily to pass to Groq
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(audio_file.name)[1]) as temp_audio:
                    for chunk in audio_file.chunks():
                        temp_audio.write(chunk)
                    temp_audio_path = temp_audio.name
                
                logger.info("Transcribing audio file via Groq Whisper...")
                with open(temp_audio_path, "rb") as file:
                    translation = _groq_client().audio.transcriptions.create(
                        file=(audio_file.name, file.read()),
                        model="whisper-large-v3",
                    )
                    spoken_text = translation.text.strip()
                    logger.info("Transcription result: %s", spoken_text)
                    
                os.remove(temp_audio_path)
            except Exception as e:
                logger.error("Audio transcription failed: %s", e)
                return JsonResponse({"status": "error", "message": "Failed to transcribe audio. Please try again."}, status=500)
        else:
            # If they sent multipart without an audio file, maybe they just sent text
            spoken_text = str(request.POST.get("text", "")).strip()
            
    else:
        return JsonResponse({"status": "error", "message": "Unsupported Content-Type. Use JSON or multipart/form-data."}, status=415)

    print(f"DEBUG voice_expense | phone={incoming_phone!r} | text={spoken_text!r}")

    if not spoken_text:
        return JsonResponse({"status": "error", "message": "No text received."}, status=400)

    # ── Handle special "link" command ─────────────────────────────────────────
    if spoken_text.lower().startswith("link "):
        mobile_to_link = spoken_text.split(" ", 1)[-1].strip()
        
        # Check if it looks like a phone number (only +, -, digits, and spaces)
        if re.match(r'^\+?[\d\s\-]+$', mobile_to_link):
            # 1. Find profile by mobile number
            profile = UserProfile.objects.filter(phone_number=mobile_to_link).first()
            
            if not profile:
                return JsonResponse({"status": "error", "message": f"❌ Could not find an account with mobile number: {mobile_to_link}. Please check the number and try again."})
    
            # 2. Link the incoming WhatsApp JID/LID to this profile
            profile.whatsapp_number = incoming_phone
            profile.whatsapp_linked = True
            profile.save(update_fields=['whatsapp_number', 'whatsapp_linked'])
            logger.info("WhatsApp linked for uid=%s with WA ID=%s", profile.user.id, incoming_phone)
            
            return JsonResponse({
                "status": "success",
                "message": "✅ Verified! Your WhatsApp account has been successfully linked. You can start tracking expenses now! (e.g., '500 petrol')"
            })

    # ── Dual-mode user resolution ─────────────────────────────────────────────
    target_user = None

    if not incoming_phone:
        if request.user.is_authenticated:
            target_user = request.user
        else:
            return JsonResponse({"status": "error", "message": "Please log in or send your WhatsApp number. 🔐"}, status=401)
    else:
        import phonenumbers
        # Try exact match first (supports raw LIDs or unformatted numbers)
        profile = UserProfile.objects.filter(whatsapp_number=incoming_phone).select_related("user").first()
        
        if not profile:
            # Fallback to E164 formatting
            try:
                incoming_parsed = phonenumbers.parse("+" + incoming_phone.lstrip("+"), None)
                incoming_e164 = phonenumbers.format_number(incoming_parsed, phonenumbers.PhoneNumberFormat.E164)
                profile = UserProfile.objects.filter(whatsapp_number=incoming_e164).select_related("user").first()
            except phonenumbers.NumberParseException:
                pass

        if not profile or not profile.user:
            # Last resort: try matching by phone_number (registration number)
            clean_phone = incoming_phone.lstrip('+').lstrip('0')
            # Try last 10 digits match for Indian numbers
            if len(clean_phone) >= 10:
                last10 = clean_phone[-10:]
                profile = UserProfile.objects.filter(phone_number__endswith=last10).select_related("user").first()
            
            if not profile or not profile.user:
                return JsonResponse({
                    "status":  "error",
                    "message": f"❌ Account not linked.\n\nApna WhatsApp link karne ke liye:\n1️⃣ Type karo: *link <apna registered mobile number>*\n   Example: *link 919876543210*\n\n📱 Agar account nahi hai, toh pehle register karo: https://ajay160380-paisa-mitra.hf.space/register/"
                })
        target_user = profile.user
    budget = float(getattr(target_user.profile, 'monthly_budget', 20000))
    today = date.today()
    first_day = today.replace(day=1)
    spent = Expense.objects.filter(user=target_user, date__gte=first_day).aggregate(Sum('amount'))['amount__sum'] or 0
    recent_qs = Expense.objects.filter(user=target_user).order_by('-date')[:5]
    recent_str = ", ".join([f"{e.category}: ₹{e.amount}" for e in recent_qs]) or "No recent expenses"
    
    category_breakdown = Expense.objects.filter(user=target_user, date__gte=first_day).values('category').annotate(total=Sum('amount')).order_by('-total')
    cat_str = ", ".join([f"{c['category'].title()}: ₹{c['total']}" for c in category_breakdown]) if category_breakdown else "No expenses this month."
    
    user_name = target_user.first_name.title() if target_user.first_name else target_user.username.title()
    
    user_context = {
        "name": user_name,
        "budget": budget,
        "spent": float(spent),
        "remaining": max(0, budget - float(spent)),
        "recent_expenses": recent_str,
        "category_breakdown": cat_str
    }

    # ── AI Conversations & Expense Routing ────────────────────────────────────
    try:
        normalized_text = normalize_hinglish_numbers(spoken_text)

        # ──────────────────────────────────────────────────────────────────────
        # FAST PATH (Bypass slow AI for standard "[Amount] [Description]" format)
        # ──────────────────────────────────────────────────────────────────────
        fast_match = re.match(r'^(\d+(?:\.\d+)?)\s+(.+)$', normalized_text.strip())
        if fast_match:
            amount_raw = fast_match.group(1)
            desc_raw = fast_match.group(2).strip()
            amount = Decimal(amount_raw)
            if amount > 0:
                category = _keyword_category_fallback(desc_raw)
                
                expense = Expense.objects.create(
                    user=target_user,
                    amount=amount,
                    category=category,
                    date=today,
                    description=desc_raw[:100],
                )

                icon = CAT_ICONS.get(category, "📦")
                new_spent = float(spent) + float(amount)
                new_rem = max(0, budget - new_spent)
                
                month_name = today.strftime("%B")
                msg_lines = [
                    f"✅ *Hi {user_name}, Expense Logged (⚡ Instant)*",
                    f"━━━━━━━━━━━━━━━━━━",
                    f"{icon} *Amount:* ₹{amount:,}",
                    f"🏷️ *Category:* {category.title()}",
                    f"📝 *Note:* {expense.description or 'None'}",
                    f"━━━━━━━━━━━━━━━━━━",
                    f"💰 *Total Spent ({month_name}):* ₹{new_spent:,.0f}",
                    f"🎯 *Remaining Budget:* ₹{new_rem:,.0f}"
                ]
                
                if new_rem == 0:
                    msg_lines.append("⚠️ *Warning:* You have exceeded your monthly budget! 🛑")

                # 🔔 Smart Spending Alert
                smart_alert = check_and_generate_alert(target_user, expense)
                if smart_alert:
                    msg_lines.append("")
                    msg_lines.append(smart_alert)
                    
                final_message = "\n".join(msg_lines)
                
                return JsonResponse({
                    "status": "success",
                    "message": final_message,
                    "expense_id": expense.pk,
                })

        # ──────────────────────────────────────────────────────────────────────
        # FAST PATH 2 (Bypass AI entirely for Summary & Queries)
        # ──────────────────────────────────────────────────────────────────────
        query_keywords = ["summary", "kitna", "kharcha", "khrcha", "karcha", "batao", "batvo", "kaha", "bacha", "hisab", "report", "stats", "balance", "expense", "expenses", "expance"]
        past_keywords = ["pichle", "pichli", "pichla", "purana", "purane", "last", "previous", "old", "past"]
        export_keywords = ["export", "download", "csv", "excel", "pdf", "sheet", "statement", "file"]
        
        months_map = {
            "january": 1, "jan": 1,
            "february": 2, "feb": 2,
            "march": 3, "mar": 3,
            "april": 4, "apr": 4,
            "may": 5,
            "june": 6, "jun": 6,
            "july": 7, "jul": 7,
            "august": 8, "aug": 8,
            "september": 9, "sep": 9, "sept": 9,
            "october": 10, "oct": 10,
            "november": 11, "nov": 11,
            "december": 12, "dec": 12
        }

        lower_text = normalized_text.lower()
        target_month = None
        target_year = today.year
        
        for m_name, m_num in months_map.items():
            if re.search(rf'\b{m_name}\b', lower_text):
                target_month = m_num
                if target_month > today.month:
                    target_year -= 1
                break

        is_past_query = any(kw in lower_text for kw in past_keywords)
        is_export_query = any(kw in lower_text for kw in export_keywords)
        is_query = any(kw in lower_text for kw in query_keywords) or lower_text.strip() in ["?", "help"] or target_month is not None or is_export_query

        if is_query or is_past_query or target_month is not None:
            if target_month is not None:
                import calendar
                first_day_target = date(target_year, target_month, 1)
                last_day_target = date(target_year, target_month, calendar.monthrange(target_year, target_month)[1])
                
                spent_val = Expense.objects.filter(user=target_user, date__range=(first_day_target, last_day_target)).aggregate(Sum('amount'))['amount__sum'] or 0
                rem_val = max(0, budget - float(spent_val))
                cat_qs = Expense.objects.filter(user=target_user, date__range=(first_day_target, last_day_target))
                
                month_name_str = first_day_target.strftime("%B %Y")
                title = f"📊 *{user_name}'s {month_name_str} Expense Report*"
                
            elif is_past_query:
                from datetime import timedelta
                last_day_prev = first_day - timedelta(days=1)
                first_day_prev = last_day_prev.replace(day=1)
                
                spent_val = Expense.objects.filter(user=target_user, date__range=(first_day_prev, last_day_prev)).aggregate(Sum('amount'))['amount__sum'] or 0
                rem_val = max(0, budget - float(spent_val))
                cat_qs = Expense.objects.filter(user=target_user, date__range=(first_day_prev, last_day_prev))
                
                month_name_str = last_day_prev.strftime("%B %Y")
                title = f"📊 *{user_name}'s {month_name_str} Expense Report (Past)*"
            else:
                spent_val = float(spent)
                rem_val = max(0, budget - float(spent))
                cat_qs = Expense.objects.filter(user=target_user, date__gte=first_day)
                
                month_name_str = today.strftime("%B %Y")
                title = f"📊 *{user_name}'s {month_name_str} Expense Report (⚡ Instant)*"
                
            category_breakdown = list(cat_qs.values('category').annotate(total=Sum('amount')).order_by('-total'))
            
            if category_breakdown:
                cat_lines = []
                for c in category_breakdown:
                    cat_name = c['category'].title()
                    cat_total = c['total']
                    cat_icon = CAT_ICONS.get(c['category'], "📦")
                    cat_lines.append(f"• {cat_icon} {cat_name}: ₹{cat_total:,.0f}")
                cat_formatted = "\n".join(cat_lines)
            else:
                just_month = month_name_str.split(' ')[0]
                cat_formatted = f"No expenses found for {just_month}."
                
            msg_lines = [
                title,
                f"━━━━━━━━━━━━━━━━━━",
                f"💰 *Total Spent:* ₹{float(spent_val):,.0f}",
                f"🎯 *Monthly Budget:* ₹{budget:,.0f}",
                f"💸 *Remaining:* ₹{rem_val:,.0f}",
                f"━━━━━━━━━━━━━━━━━━",
                f"🧾 *Category-wise Breakdown:*",
                cat_formatted
            ]
            
            if target_month is None and not is_past_query and rem_val <= 0:
                msg_lines.append("\n⚠️ *Warning:* Budget Exceeded! 🛑")
                
            if is_export_query:
                import csv, io, base64
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerow(['Date', 'Category', 'Description', 'Amount'])
                expenses = cat_qs.order_by('-date')
                total_export = 0
                for exp in expenses:
                    writer.writerow([exp.date.strftime('%Y-%m-%d'), exp.category.title(), exp.description or '', f"{exp.amount}"])
                    total_export += exp.amount
                writer.writerow([])
                writer.writerow(['', '', 'Total', f"{total_export}"])
                csv_content = output.getvalue()
                base64_csv = base64.b64encode(csv_content.encode('utf-8')).decode('utf-8')
                just_month = month_name_str.replace(" ", "_")
                
                return JsonResponse({
                    "status": "success",
                    "message": f"📄 *{user_name}*, here is your detailed expense report for {month_name_str}.\n\n(Tip: Open this file in Excel or Google Sheets!)",
                    "media": {
                        "mimetype": "text/csv",
                        "filename": f"PaisaMitra_{just_month}_Report.csv",
                        "base64": base64_csv
                    }
                })

            return JsonResponse({
                "status": "success",
                "message": "\n".join(msg_lines)
            })

        # ──────────────────────────────────────────────────────────────────────
        # AI PATH (Fallback for chatting and unknown questions)
        # ──────────────────────────────────────────────────────────────────────
        system_prompt = build_conversational_ai_prompt(today, user_context)
        
        chat_key = f"whatsapp_chat_history_{target_user.id}"
        chat_history = cache.get(chat_key, [])

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(chat_history)
        messages.append({"role": "user", "content": normalized_text})

        response = _groq_client().chat.completions.create(
            messages=messages,
            model="llama-3.1-8b-instant",
            temperature=0.2,
            max_tokens=200,
        )
        raw_response = response.choices[0].message.content.strip()
        print(f"DEBUG AI raw response: {raw_response!r}")

        start_idx = raw_response.find('{')
        end_idx = raw_response.rfind('}')
        if start_idx == -1 or end_idx == -1:
            raise ValueError("No JSON found in AI response")

        json_str = raw_response[start_idx:end_idx+1]
        
        # Save history back to cache
        chat_history.append({"role": "user", "content": normalized_text})
        chat_history.append({"role": "assistant", "content": json_str})
        cache.set(chat_key, chat_history[-10:], timeout=86400) # Keep last 10 messages for 24h
        
        try:
            ai_data = json.loads(json_str, strict=False)
        except json.JSONDecodeError:
            # Fallback for unescaped newlines and common issues
            clean_str = json_str.replace('\n', '\\n').replace('\r', '')
            ai_data = json.loads(clean_str, strict=False)
            
        action = ai_data.get("action", "chat")

        if action == "log_expense":
            expense_details = ai_data.get("expense_details", {})
            amount_raw = expense_details.get("amount", 0)
            if isinstance(amount_raw, str):
                amount_raw = re.sub(r'[^0-9.]', '', amount_raw)
            amount = Decimal(str(amount_raw))

            if amount <= 0:
                return JsonResponse({"status": "error", "message": "Could not understand the amount. Try: '500 petrol' ⛽"})

            category = str(expense_details.get("category", "other")).strip().lower()
            if category not in VALID_CATEGORIES:
                category = _keyword_category_fallback(spoken_text)

            expense = Expense.objects.create(
                user=target_user,
                amount=amount,
                category=category,
                date=today,
                description=str(expense_details.get("description", "")).strip()[:100],
            )

            icon = CAT_ICONS.get(category, "📦")
            new_spent = float(spent) + float(amount)
            new_rem = max(0, budget - new_spent)
            
            month_name = today.strftime("%B")
            msg_lines = [
                f"✅ *Hi {user_name}, Expense Logged Successfully!*",
                f"━━━━━━━━━━━━━━━━━━",
                f"{icon} *Amount:* ₹{amount:,}",
                f"🏷️ *Category:* {category.title()}",
                f"📝 *Note:* {expense.description or 'None'}",
                f"━━━━━━━━━━━━━━━━━━",
                f"💰 *Total Spent ({month_name}):* ₹{new_spent:,.0f}",
                f"🎯 *Remaining Budget:* ₹{new_rem:,.0f}"
            ]
            
            if new_rem == 0:
                msg_lines.append("⚠️ *Warning:* You have exceeded your monthly budget! 🛑")

            # 🔔 Smart Spending Alert
            smart_alert = check_and_generate_alert(target_user, expense)
            if smart_alert:
                msg_lines.append("")
                msg_lines.append(smart_alert)
                
            final_message = "\n".join(msg_lines)
            
            return JsonResponse({
                "status": "success",
                "message": final_message,
                "expense_id": expense.pk,
            })
        else:
            chat_response = ai_data.get("chat_response", "Mujhe samajh nahi aaya, bhai.")
            return JsonResponse({
                "status": "success",
                "message": chat_response
            })

    except json.JSONDecodeError as e:
        logger.error("Voice expense JSON parse error: %s", e)
        return JsonResponse({"status": "error", "message": "AI ka jawab samajh nahi aaya. Ek baar phir try karo! 🔄"})
    except Exception as e:
        user_id = target_user.id if target_user else "unknown"
        logger.error("Voice expense error uid=%s error=%s", user_id, e, exc_info=True)
        return JsonResponse({"status": "error", "message": "😅 Server mein thodi gadbad hui. Thoda baad mein try karo!"})


def _keyword_category_fallback(text: str) -> str:
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
# AI CHAT
# ══════════════════════════════════════════════════════════════════════════════

@api_login_required
@ai_rate_limited
@json_required
def ai_chat(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    body     = getattr(request, "_json_body", {})
    user_msg = body.get("message", "").strip()
    history  = body.get("history", [])

    if not user_msg:
        return JsonResponse({"error": "Message is empty."}, status=400)

    if len(user_msg) > 500:
        return JsonResponse({"error": "Message is too long."}, status=400)

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
Analyze the user's language. If they speak in Hinglish (Hindi written in English alphabet), reply in warm, conversational Hinglish. If they speak in English, reply in natural, practical English. Be sometimes sarcastic, but always practical and helpful.

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
{cat_lines or '  (No data available yet)'}

══ YOUR RULES ══
1. Always respond in the same language as the user (English or Hinglish).
2. Keep responses concise — max 100 words.
3. If user asks for calculations, do them correctly.
4. Never make up numbers you don't have.
5. If budget is exceeded, be extra honest about it."""

    messages_payload = [{"role": "system", "content": system}]

    safe_history = []
    for turn in history[-6:]:
        if (isinstance(turn, dict) and
                turn.get("role") in ("user", "assistant") and
                isinstance(turn.get("content"), str)):
            safe_history.append({"role": turn["role"], "content": turn["content"][:400]})
    messages_payload.extend(safe_history)
    messages_payload.append({"role": "user", "content": user_msg})

    try:
        resp = _groq_client().chat.completions.create(
            messages=messages_payload,
            model="llama-3.1-8b-instant",
            temperature=0.7,
            max_tokens=200,
        )
        reply = resp.choices[0].message.content.strip()
        logger.info("AI chat uid=%s msg_len=%d", request.user.id, len(user_msg))
        return JsonResponse({"reply": reply, "status": "success"})

    except Exception as e:
        logger.error("AI chat uid=%s error=%s", request.user.id, e)
        return JsonResponse({
            "reply":  "Oops! Network issue. Please retry. 😅",
            "status": "error",
        })


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY INSIGHT API
# ══════════════════════════════════════════════════════════════════════════════

@api_login_required
def api_category_insight(request: HttpRequest) -> JsonResponse:
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

    qs_dates      = cat_qs.values("date").distinct().count()
    cat_daily_avg = cat_total / max(qs_dates, 1)

    recent = [
        {
            "date":     r["date"].isoformat(),
            "amount":   float(r["amount"]),
            "day_name": r["date"].strftime("%A"),
        }
        for r in cat_qs.values("date", "amount").order_by("-date")[:5]
    ]

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

    tip = get_category_ai_tip(
        user_id=request.user.id,
        category=category,
        cat_total=cat_total,
        share_pct=share_pct,
        avg_txn=_safe_float(agg["avg"]),
        period=period,
    )

    return JsonResponse({
        "category":  category,
        "period":    period,
        "icon":      CAT_ICONS.get(category, "📦"),
        "color":     CAT_COLORS.get(category, "#888"),
        "total":     cat_total,
        "share_pct": share_pct,
        "count":     agg["count"] or 0,
        "avg":       round(_safe_float(agg["avg"]), 2),
        "highest":   _safe_float(agg["highest"]),
        "lowest":    _safe_float(agg["lowest"]),
        "daily_avg": round(cat_daily_avg, 2),
        "recent":    recent,
        "weekly":    weekly,
        "ai_tip":    tip,
    })


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS API
# ══════════════════════════════════════════════════════════════════════════════

@api_login_required
def api_analytics(request: HttpRequest) -> JsonResponse:
    period = request.GET.get("period", "month")
    if period not in VALID_PERIODS:
        period = "month"

    budget  = get_user_budget(request)
    today   = date.today()
    ck      = f"analytics_{request.user.id}_{period}_{today.isoformat()}"
    cached  = cache.get(ck)
    if cached:
        return JsonResponse(cached)

    period_qs = get_period_expenses(request.user, period)
    stats     = calculate_stats(period_qs, budget)
    cats      = build_category_breakdown(period_qs, stats["total_spent"])
    trend     = build_monthly_trend(request.user, months=CHART_MONTHS)
    anomalies = detect_anomalies(request.user, budget)

    day_agg = (period_qs.values("date")
               .annotate(total=Sum("amount"))
               .order_by("-total").first())
    top_day = ({"date": day_agg["date"].isoformat(),
                "total": _safe_float(day_agg["total"])} if day_agg else None)

    month_data = {
        "total":      stats["total_spent"],
        "budget":     budget,
        "count":      stats["transaction_count"],
        "categories": cats,
        "month_key":  today.strftime("%Y-%m"),
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


@api_login_required
def api_heatmap(request: HttpRequest) -> JsonResponse:
    ck     = f"heatmap_{request.user.id}_{date.today().isoformat()}"
    cached = cache.get(ck)
    if cached:
        return JsonResponse(cached)

    heatmap = build_spending_heatmap(request.user)
    cache.set(ck, heatmap, HEATMAP_TIMEOUT)
    return JsonResponse(heatmap)


@api_login_required
def api_anomalies(request: HttpRequest) -> JsonResponse:
    budget = get_user_budget(request)
    alerts = detect_anomalies(request.user, budget)
    return JsonResponse({"alerts": alerts, "count": len(alerts)})


@api_login_required
def api_summary_stats(request: HttpRequest) -> JsonResponse:
    budget   = get_user_budget(request)
    month_qs = get_filtered_expenses(request.user, "month")
    stats    = calculate_stats(month_qs, budget)
    today    = date.today()

    recent_qs = month_qs.values('id', 'title', 'category', 'amount', 'date', 'icon', 'description')[:10] if hasattr(Expense, 'title') else month_qs.values('id', 'category', 'amount', 'date', 'icon', 'description')[:10]
    
    return JsonResponse({
        "budget":            budget,
        "total_spent":       round(stats["total_spent"], 2),
        "remaining":         round(stats["remaining_budget"], 2),
        "budget_percent":    round(stats["budget_percent"], 1),
        "transaction_count": stats["transaction_count"],
        "avg_per_day":       round(stats["avg_per_day"], 2),
        "savings_rate":      round(stats["savings_rate"], 1),
        "overspent":         stats["overspent"],
        "month":             today.strftime("%B %Y"),
        "recent_expenses":   list(recent_qs),
        "user_phone":        request.user.profile.phone_number if hasattr(request.user, 'profile') else "",
        "days_left": (
            (today.replace(day=1) + timedelta(days=32)).replace(day=1) - today
        ).days,
    })


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION MANAGEMENT
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@require_POST
def add_subscription(request: HttpRequest) -> HttpResponse:
    form = SubscriptionForm(request.POST)
    if form.is_valid():
        sub      = form.save(commit=False)
        sub.user = request.user
        sub.save()
        logger.info("Subscription added uid=%s id=%s", request.user.id, sub.pk)
        messages.success(request, f"📅 '{sub.category}' subscription add ho gayi! ₹{sub.amount}/month")
    else:
        messages.error(request, f"Please check the details: {form.errors}")
    return redirect("dashboard")


@login_required(login_url="login")
@require_POST
def delete_subscription(request: HttpRequest, pk: int) -> HttpResponse:
    sub = get_object_or_404(Subscription, pk=pk, user=request.user)
    sub.delete()
    logger.info("Subscription deleted uid=%s id=%s", request.user.id, pk)
    messages.success(request, "✂️ Subscription cancel ho gayi!")
    return redirect("dashboard")


@api_login_required
def api_subscriptions(request: HttpRequest) -> JsonResponse:
    subs  = Subscription.objects.filter(user=request.user).order_by("next_billing_date")
    today = date.today()
    data  = []
    for s in subs:
        days_until = (s.next_billing_date - today).days
        data.append({
            "id":           s.pk,
            "category":     s.category,
            "icon":         CAT_ICONS.get(s.category, "📦"),
            "color":        CAT_COLORS.get(s.category, "#888"),
            "amount":       float(s.amount),
            "next_billing": s.next_billing_date.isoformat(),
            "days_until":   days_until,
            "due_soon":     days_until <= 3,
            "yearly_cost":  float(s.amount) * 12,
        })

    total_monthly = sum(d["amount"] for d in data)
    return JsonResponse({
        "subscriptions": data,
        "count":         len(data),
        "total_monthly": total_monthly,
        "total_yearly":  total_monthly * 12,
    })


# ══════════════════════════════════════════════════════════════════════════════
# EXPORT
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def export_expenses(request: HttpRequest) -> HttpResponse:
    export_format = request.GET.get("format", "csv")
    filter_type   = request.GET.get("filter", "all")
    qs = get_filtered_expenses(request.user, filter_type)

    start_str = request.GET.get("start", "")
    end_str   = request.GET.get("end",   "")
    try:
        if start_str:
            qs = qs.filter(date__gte=date.fromisoformat(start_str))
        if end_str:
            qs = qs.filter(date__lte=date.fromisoformat(end_str))
    except ValueError:
        pass

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
        return resp

    resp = HttpResponse(content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="expenses_{date.today()}.csv"'
    resp.write("\ufeff")

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

    return resp


# ══════════════════════════════════════════════════════════════════════════════
# SAVINGS GOALS
# ══════════════════════════════════════════════════════════════════════════════

@api_login_required
def api_savings_projection(request: HttpRequest) -> JsonResponse:
    try:
        goal = float(request.GET.get("goal", 0))
        if goal <= 0:
            return JsonResponse({"error": "Valid goal amount required"}, status=400)
    except (ValueError, TypeError):
        return JsonResponse({"error": "Invalid goal"}, status=400)

    budget          = get_user_budget(request)
    month_qs        = get_filtered_expenses(request.user, "month")
    stats           = calculate_stats(month_qs, budget)
    monthly_savings = max(budget - stats["total_spent"], 0)

    if monthly_savings <= 0:
        return JsonResponse({
            "goal":            goal,
            "monthly_savings": 0,
            "months_needed":   None,
            "achievable":      False,
            "message":         "No savings yet — reduce spending first! 📉",
        })

    months_needed = math_ceil(goal / monthly_savings)
    target_date   = date.today().replace(day=1)
    for _ in range(months_needed):
        target_date = _next_month_date(target_date)

    return JsonResponse({
        "goal":            goal,
        "monthly_savings": round(monthly_savings, 2),
        "months_needed":   months_needed,
        "target_date":     target_date.strftime("%B %Y"),
        "achievable":      True,
        "message":         f"₹{goal:,.0f} bachane mein ~{months_needed} mahine lagenge. Target: {target_date.strftime('%B %Y')} 🎯",
    })


def math_ceil(x: float) -> int:
    return int(x) + (1 if x != int(x) else 0)


# ══════════════════════════════════════════════════════════════════════════════
# UTILITY / HEALTH CHECK
# ══════════════════════════════════════════════════════════════════════════════

def health_check(request: HttpRequest) -> JsonResponse:
    return JsonResponse({
        "status":    "ok",
        "service":   "PaisaMitra",
        "version":   "3.2.0",
        "timestamp": datetime.now().isoformat(),
    })


@api_login_required
@json_required
def api_user_profile(request: HttpRequest) -> JsonResponse:
    user    = request.user

    if request.method == "POST":
        body = getattr(request, "_json_body", {})
        if "budget" in body:
            try:
                nb = float(body["budget"])
                if nb <= 0:
                    raise ValueError
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.monthly_budget = nb
                profile.save()
                return JsonResponse({"status": "success", "message": "Budget updated successfully"})
            except ValueError:
                return JsonResponse({"error": "Invalid budget value"}, status=400)

    all_time = Expense.objects.filter(user=user)
    all_agg  = all_time.aggregate(
        total=Sum("amount"),
        count=Count("id"),
        first_date=Min("date"),
        last_date=Max("date"),
    )

    return JsonResponse({
        "username":       user.username,
        "joined":         user.date_joined.strftime("%d %B %Y"),
        "lifetime_spent": round(_safe_float(all_agg["total"]), 2),
        "total_txns":     all_agg["count"] or 0,
        "first_expense":  all_agg["first_date"].isoformat() if all_agg["first_date"] else None,
        "last_expense":   all_agg["last_date"].isoformat()  if all_agg["last_date"]  else None,
        "budget":         get_user_budget(request),
        "member_days":    (date.today() - user.date_joined.date()).days,
    })


@api_login_required
def api_quick_add(request: HttpRequest) -> JsonResponse:
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


@api_login_required
def api_edit_expense(request: HttpRequest, pk: int) -> JsonResponse:
    """JSON API for editing an expense from Mobile/PWA."""
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if "amount" in data:
        try:
            amount = Decimal(str(data["amount"]))
            if amount > 0:
                expense.amount = amount
        except (InvalidOperation, TypeError):
            pass

    if "category" in data:
        category = str(data["category"]).strip().lower()
        if category in VALID_CATEGORIES:
            expense.category = category

    if "date" in data:
        try:
            exp_date = date.fromisoformat(str(data["date"]))
            if exp_date <= date.today():
                expense.date = exp_date
        except ValueError:
            pass

    expense.save()

    return JsonResponse({
        "status": "success",
        "message": "Expense updated successfully!",
        "expense_id": expense.pk,
        "amount": float(expense.amount),
        "category": expense.category,
        "date": expense.date.isoformat(),
    })


@api_login_required
def api_delete_expense(request: HttpRequest, pk: int) -> JsonResponse:
    """JSON API for deleting an expense from Mobile/PWA."""
    if request.method not in ["POST", "DELETE"]:
        return JsonResponse({"error": "POST or DELETE only"}, status=405)
        
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    expense.delete()
    return JsonResponse({"status": "success", "message": "Expense deleted."})


@login_required
def check_updates(request):
    latest_expense = Expense.objects.filter(user=request.user).order_by('-id').first()
    latest_id = latest_expense.id if latest_expense else 0
    return JsonResponse({'latest_id': latest_id})


# ══════════════════════════════════════════════════════════════════════════════
# SMART HABIT PREDICTION & WARNINGS 🧠
# ══════════════════════════════════════════════════════════════════════════════

@csrf_exempt
def habit_warnings(request):
    target_user = User.objects.filter(username='ajayvishwakarma').first()
    if not target_user:
        target_user = User.objects.first()

    two_weeks_ago = date.today() - timedelta(days=14)
    expenses = Expense.objects.filter(user=target_user, date__gte=two_weeks_ago).order_by('date')

    if expenses.count() < 3:
        return JsonResponse({
            "warning": "Not enough data yet. Track more expenses for at least a few days so I can analyze your habits! 📉"
        })

    data_str = "\n".join([f"{e.date.strftime('%A')} ({e.category}): ₹{e.amount}" for e in expenses])

    prompt = f"""
    You are 'PaisaMitra', a brutally honest, highly intelligent Indian financial AI coach.
    Here is the user's daily spending data for the last 14 days:
    {data_str}

    Task:
    1. Analyze the exact numbers and find a HIDDEN PATTERN or BAD HABIT (e.g., "spending too much on transport regularly", "huge food expenses on weekends").
    2. Predict what will happen to his budget if he continues this exact habit.
    3. Give a strict, funny, and highly personalized warning message to send via WhatsApp. Detect the user's natural language and reply in the same language (English or Hinglish).
    
    Rules:
    - Only give the final message text. No intro, no quotes, no markdown.
    - Keep it under 4 lines.
    - Be sarcastic but logical based ON THE DATA provided.
    """

    try:
        response = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.8,
            max_tokens=150,
        )
        warning_msg = response.choices[0].message.content.strip()
        return JsonResponse({"warning": warning_msg})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def whatsapp_summary(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            phone = data.get("phone", "").strip()
            
            # WhatsApp format fix (919876543210 -> 9876543210)
            clean_phone = phone[-10:] if len(phone) >= 10 else phone
            profile = UserProfile.objects.filter(phone_number__icontains=clean_phone).first()
            
            if not profile:
                return JsonResponse({"status": "error", "message": "Bhai, pehle website par register karke apna WhatsApp number save karo! 🚫"})
            
            user = profile.user
            today = timezone.now().date()
            budget = getattr(profile, 'monthly_budget', 20000)
            
            # 1. 🚨 AABI TAK KA POORA DATA (Lifetime)
            all_expenses = Expense.objects.filter(user=user)
            lifetime_spent = all_expenses.aggregate(Sum('amount'))['amount__sum'] or 0
            
            # 2. IS MAHINE KA DATA
            this_month_expenses = all_expenses.filter(date__year=today.year, date__month=today.month)
            month_spent = this_month_expenses.aggregate(Sum('amount'))['amount__sum'] or 0
            remaining = max(budget - month_spent, 0)
            
            # 3. TOP 3 CATEGORIES (Kahan sabse zyada paisa gaya hai aaj tak)
            top_cats = all_expenses.values('category').annotate(cat_total=Sum('amount')).order_by('-cat_total')[:3]
            cat_breakdown = "\n".join([f"  🔸 {c['category'].title()}: ₹{c['cat_total']:,.0f}" for c in top_cats])
            
            if not cat_breakdown:
                cat_breakdown = "  Koi kharcha nahi hai abhi tak!"
            
            # 4. WHATSAPP REPORT MESSAGE
            report_msg = f"📊 *PaisaMitra Lifetime Report*\n\n"
            report_msg += f"💸 *Aabi Tak Ka Total Kharcha:* ₹{lifetime_spent:,.0f}\n"
            report_msg += f"📅 *Is Mahine Ka Kharcha:* ₹{month_spent:,.0f} (Budget: ₹{budget:,.0f})\n"
            report_msg += f"✅ *Bacha Hua Budget:* ₹{remaining:,.0f}\n\n"
            report_msg += f"🔥 *Top 3 Kharcho Ki Jagah (Lifetime):*\n{cat_breakdown}\n\n"
            
            # 5. AI SUGGESTION (Groq API call)
            try:
                # Tumhara helper function AI insight lene ke liye
                ai_suggestion = get_ai_insight(user.id, all_expenses, budget, lifetime_spent)
            except Exception as e:
                print(f"AI Insight fail hua: {e}")
                ai_suggestion = "Bhai, AI server thoda busy hai, par apne top kharcho par thoda control rakho! 💸"

            report_msg += f"🤖 *AI Analysis:*\n_{ai_suggestion}_"
            
            return JsonResponse({"status": "success", "message": report_msg})
            
        except Exception as e:
            print(f"WhatsApp Summary Error: {e}")
            return JsonResponse({"status": "error", "message": f"Server mein gadbad hai: {str(e)}"})
            
    return JsonResponse({"status": "error", "message": "Only POST requests allowed"}, status=405)

@login_required(login_url="login")
def get_latest_update_time(request: HttpRequest) -> JsonResponse:
    latest = Expense.objects.filter(user=request.user).order_by('-id').first()
    if latest:
        return JsonResponse({"latest_id": latest.id})
    return JsonResponse({"latest_id": 0})

# ── Static Pages ─────────────────────────────────────────────────────────

def landing_view(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect('dashboard')
    return render(request, "tracker/landing.html")

def about_view(request: HttpRequest) -> HttpResponse:
    return render(request, "tracker/about.html")

def features_view(request: HttpRequest) -> HttpResponse:
    return render(request, "tracker/features.html")

def privacy_view(request: HttpRequest) -> HttpResponse:
    return render(request, "tracker/privacy.html")

def terms_view(request: HttpRequest) -> HttpResponse:
    return render(request, "tracker/terms.html")

def contact_view(request: HttpRequest) -> HttpResponse:
    return render(request, "tracker/contact.html")

@login_required(login_url="login")
def wa_link_status(request: HttpRequest) -> JsonResponse:
    try:
        profile = request.user.profile
        return JsonResponse({
            "linked": profile.whatsapp_linked,
            "whatsapp_number": profile.whatsapp_number
        })
    except Exception:
        return JsonResponse({"linked": False, "whatsapp_number": None})


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 1: MONTHLY COMPARISON REPORT 📊
# ══════════════════════════════════════════════════════════════════════════════

def build_monthly_comparison(user) -> dict:
    """Compare current month vs previous month spending."""
    today = date.today()
    cur_year, cur_month = today.year, today.month

    # Previous month
    if cur_month == 1:
        prev_year, prev_month = cur_year - 1, 12
    else:
        prev_year, prev_month = cur_year, cur_month - 1

    cur_qs = Expense.objects.filter(user=user, date__year=cur_year, date__month=cur_month)
    prev_qs = Expense.objects.filter(user=user, date__year=prev_year, date__month=prev_month)

    cur_total = _safe_float(cur_qs.aggregate(t=Sum("amount"))["t"])
    prev_total = _safe_float(prev_qs.aggregate(t=Sum("amount"))["t"])

    cur_count = cur_qs.count()
    prev_count = prev_qs.count()

    # Days elapsed calculation for fair comparison
    days_elapsed = today.day
    prev_days = calendar.monthrange(prev_year, prev_month)[1]

    cur_daily_avg = cur_total / max(days_elapsed, 1)
    prev_daily_avg = prev_total / max(prev_days, 1)

    # Change percentage
    if prev_total > 0:
        total_change_pct = ((cur_total - prev_total) / prev_total) * 100
    else:
        total_change_pct = 100 if cur_total > 0 else 0

    if prev_daily_avg > 0:
        daily_avg_change_pct = ((cur_daily_avg - prev_daily_avg) / prev_daily_avg) * 100
    else:
        daily_avg_change_pct = 100 if cur_daily_avg > 0 else 0

    # Category comparison
    cur_cats = {c["category"]: _safe_float(c["total"]) for c in
                cur_qs.values("category").annotate(total=Sum("amount")).order_by("-total")}
    prev_cats = {c["category"]: _safe_float(c["total"]) for c in
                 prev_qs.values("category").annotate(total=Sum("amount")).order_by("-total")}

    all_cats = set(list(cur_cats.keys()) + list(prev_cats.keys()))
    category_comparison = []
    for cat in all_cats:
        cur_val = cur_cats.get(cat, 0)
        prev_val = prev_cats.get(cat, 0)
        if prev_val > 0:
            change = ((cur_val - prev_val) / prev_val) * 100
        else:
            change = 100 if cur_val > 0 else 0
        category_comparison.append({
            "name": cat,
            "title": cat.title(),
            "icon": CAT_ICONS.get(cat, "📦"),
            "color": CAT_COLORS.get(cat, "#888"),
            "current": cur_val,
            "previous": prev_val,
            "change_pct": round(change, 1),
            "direction": "up" if cur_val > prev_val else ("down" if cur_val < prev_val else "same"),
        })
    category_comparison.sort(key=lambda x: abs(x["change_pct"]), reverse=True)

    # Verdict
    if total_change_pct < -10:
        verdict = "excellent"
        verdict_msg = "Bahut badhiya! Spending kam hui hai! 🎉"
    elif total_change_pct < 5:
        verdict = "good"
        verdict_msg = "Stable spending — keep it up! 👍"
    elif total_change_pct < 25:
        verdict = "warning"
        verdict_msg = "Spending badh rahi hai — watch out! ⚠️"
    else:
        verdict = "danger"
        verdict_msg = "Alert! Spending bahut zyada badh gayi! 🚨"

    prev_month_name = MONTH_NAMES[prev_month - 1]

    return {
        "cur_total": cur_total,
        "prev_total": prev_total,
        "total_change_pct": round(total_change_pct, 1),
        "cur_daily_avg": round(cur_daily_avg, 0),
        "prev_daily_avg": round(prev_daily_avg, 0),
        "daily_avg_change_pct": round(daily_avg_change_pct, 1),
        "cur_count": cur_count,
        "prev_count": prev_count,
        "categories": category_comparison[:6],
        "verdict": verdict,
        "verdict_msg": verdict_msg,
        "prev_month_name": prev_month_name,
        "has_prev_data": prev_total > 0,
    }


@api_login_required
def api_monthly_comparison(request: HttpRequest) -> JsonResponse:
    comparison = build_monthly_comparison(request.user)
    return JsonResponse(comparison)


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 2: SAVINGS GOALS TRACKER 🎯
# ══════════════════════════════════════════════════════════════════════════════

@api_login_required
def api_savings_goals(request: HttpRequest) -> JsonResponse:
    goals = SavingsGoal.objects.filter(user=request.user)
    data = []
    for g in goals:
        # Estimate months to complete
        budget = float(getattr(request.user.profile, 'monthly_budget', 20000))
        month_qs = Expense.objects.filter(
            user=request.user,
            date__year=date.today().year,
            date__month=date.today().month
        )
        month_spent = _safe_float(month_qs.aggregate(t=Sum("amount"))["t"])
        monthly_savings = max(budget - month_spent, 0)
        remaining = max(float(g.target_amount) - float(g.saved_amount), 0)

        if monthly_savings > 0 and remaining > 0:
            months_needed = math_ceil(remaining / monthly_savings)
        else:
            months_needed = None

        data.append({
            "id": g.pk,
            "name": g.name,
            "icon": g.icon,
            "target_amount": float(g.target_amount),
            "saved_amount": float(g.saved_amount),
            "progress_percent": round(g.progress_percent, 1),
            "deadline": g.deadline.isoformat() if g.deadline else None,
            "is_completed": g.is_completed,
            "months_needed": months_needed,
            "created_at": g.created_at.isoformat(),
        })
    return JsonResponse({"goals": data, "count": len(data)})


@api_login_required
@json_required
def api_add_goal(request: HttpRequest) -> JsonResponse:
    body = getattr(request, "_json_body", {})
    name = str(body.get("name", "")).strip()
    target = body.get("target_amount", 0)
    icon = str(body.get("icon", "🎯")).strip()
    deadline_str = body.get("deadline", "")

    if not name or len(name) > 100:
        return JsonResponse({"error": "Valid goal name required (max 100 chars)"}, status=400)

    try:
        target = Decimal(str(target))
        if target <= 0:
            raise ValueError
    except (InvalidOperation, ValueError, TypeError):
        return JsonResponse({"error": "Valid target amount required"}, status=400)

    # Max 5 active goals
    active_count = SavingsGoal.objects.filter(user=request.user, is_completed=False).count()
    if active_count >= 5:
        return JsonResponse({"error": "Maximum 5 active goals allowed!"}, status=400)

    deadline = None
    if deadline_str:
        try:
            deadline = date.fromisoformat(str(deadline_str))
        except ValueError:
            pass

    goal = SavingsGoal.objects.create(
        user=request.user,
        name=name,
        target_amount=target,
        icon=icon,
        deadline=deadline,
    )
    return JsonResponse({
        "status": "success",
        "message": f"🎯 Goal '{name}' created! Target: ₹{target:,}",
        "goal_id": goal.pk,
    }, status=201)


@api_login_required
@json_required
def api_update_goal(request: HttpRequest, pk: int) -> JsonResponse:
    goal = get_object_or_404(SavingsGoal, pk=pk, user=request.user)
    body = getattr(request, "_json_body", {})

    add_amount = body.get("add_amount", 0)
    try:
        add_amount = Decimal(str(add_amount))
        if add_amount <= 0:
            raise ValueError
    except (InvalidOperation, ValueError, TypeError):
        return JsonResponse({"error": "Valid amount required"}, status=400)

    goal.saved_amount = min(goal.saved_amount + add_amount, goal.target_amount)
    if goal.saved_amount >= goal.target_amount:
        goal.is_completed = True
    goal.save()

    return JsonResponse({
        "status": "success",
        "message": f"💰 ₹{add_amount:,} added to '{goal.name}'!" + (
            " 🎉 Goal completed!" if goal.is_completed else ""),
        "saved_amount": float(goal.saved_amount),
        "progress_percent": round(goal.progress_percent, 1),
        "is_completed": goal.is_completed,
    })


@api_login_required
def api_delete_goal(request: HttpRequest, pk: int) -> JsonResponse:
    goal = get_object_or_404(SavingsGoal, pk=pk, user=request.user)
    name = goal.name
    goal.delete()
    return JsonResponse({"status": "success", "message": f"🗑️ Goal '{name}' deleted."})


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 3: DAILY MONEY TIP 💡
# ══════════════════════════════════════════════════════════════════════════════

def generate_daily_tip(user) -> str:
    """Generate a personalized AI money tip based on user's spending patterns."""
    today = date.today()
    week_ago = today - timedelta(days=7)

    week_expenses = Expense.objects.filter(user=user, date__gte=week_ago)
    week_total = _safe_float(week_expenses.aggregate(t=Sum("amount"))["t"])

    top_cat = (week_expenses.values("category")
               .annotate(total=Sum("amount"))
               .order_by("-total").first())

    budget = float(getattr(user.profile, 'monthly_budget', 20000))
    month_qs = Expense.objects.filter(user=user, date__year=today.year, date__month=today.month)
    month_spent = _safe_float(month_qs.aggregate(t=Sum("amount"))["t"])
    budget_pct = (month_spent / budget * 100) if budget > 0 else 0

    cat_name = top_cat["category"].title() if top_cat else "General"
    cat_total = _safe_float(top_cat["total"]) if top_cat else 0

    day_of_week = today.strftime("%A")

    try:
        prompt = (
            f"You are PaisaMitra, a witty Indian financial coach.\n"
            f"Today is {day_of_week}.\n"
            f"User's weekly spending: ₹{week_total:,.0f}\n"
            f"Top category this week: {cat_name} (₹{cat_total:,.0f})\n"
            f"Monthly budget used: {budget_pct:.0f}%\n"
            f"Monthly spent: ₹{month_spent:,.0f} / ₹{budget:,.0f}\n\n"
            f"Write ONE short, actionable English money-saving tip (under 30 words) that is:\n"
            f"- Specific to this {day_of_week}\n"
            f"- Relevant to the user's top category ({cat_name})\n"
            f"- Funny, relatable, and practical\n"
            f"- Includes 1-2 emojis\n"
            f"ONLY return the tip text."
        )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.85,
            max_tokens=80,
        )
        return r.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Daily tip generation error: %s", e)
        tips_fallback = [
            f"💡 {day_of_week} tip: Skip ordering out today and cook something simple. Your wallet will thank you! 🍳",
            f"💡 {day_of_week} tip: Before buying anything, wait 24 hours. If you still want it tomorrow, go ahead! ⏰",
            f"💡 {day_of_week} tip: Check your subscriptions — cancel anything you haven't used in 30 days! 🔍",
        ]
        import random
        return random.choice(tips_fallback)


@api_login_required
def api_daily_tip(request: HttpRequest) -> JsonResponse:
    """Get today's personalized money tip."""
    ck = f"daily_tip_{request.user.id}_{date.today().isoformat()}"
    cached = cache.get(ck)
    if cached:
        return JsonResponse({"tip": cached, "cached": True})

    tip = generate_daily_tip(request.user)
    cache.set(ck, tip, 86400)  # Cache for 24 hours
    return JsonResponse({"tip": tip, "cached": False})


@csrf_exempt
def api_trigger_daily_tips(request: HttpRequest) -> JsonResponse:
    """Cron endpoint — bot calls this to get tips for all linked users."""
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    # Simple secret key auth
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        body = {}

    secret = body.get("secret", "")
    expected_secret = getattr(settings, 'DAILY_TIP_SECRET', 'paisamitra-daily-2025')
    if secret != expected_secret:
        return JsonResponse({"error": "Unauthorized"}, status=403)

    tip_type = body.get("type", "morning")
    
    linked_profiles = UserProfile.objects.filter(
        whatsapp_linked=True
    ).exclude(
        whatsapp_number__isnull=True
    ).exclude(
        whatsapp_number=''
    ).select_related('user')

    seen_numbers = set()
    tips = []
    
    for profile in linked_profiles:
        number = profile.whatsapp_number
        if number in seen_numbers:
            continue
        seen_numbers.add(number)
        
        ck = f"{tip_type}_tip_sent_{profile.user.id}_{date.today().isoformat()}"
        if cache.get(ck):
            continue  # Already sent today

        tip = generate_daily_tip(profile.user)
        user_name = profile.user.first_name.title() if profile.user.first_name else profile.user.username.title()

        if tip_type == "night":
            msg = (
                f"🌙 *Good Night, {user_name}!* ✨\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"🦉 *PaisaMitra Night Tip*\n\n"
                f"_{tip}_\n\n"
                f"🌟 _Rest well! Tomorrow is a new day to save._ 💤"
            )
        else:
            msg = (
                f"🌅 *Good Morning, {user_name}!* ☀️\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"💎 *PaisaMitra Daily Tip*\n\n"
                f"_{tip}_\n\n"
                f"🚀 _Have a fantastic day! Track your expenses wisely._ 📈"
            )

        tips.append({
            "whatsapp_number": profile.whatsapp_number,
            "message": msg,
            "user_id": profile.user.id,
        })
        cache.set(ck, True, 86400)  # Mark as sent for 24 hours

    return JsonResponse({"tips": tips, "count": len(tips)})


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 4: SMART SPENDING ALERTS 🔔
# ══════════════════════════════════════════════════════════════════════════════

def check_and_generate_alert(user, expense) -> str:
    """Check if the new expense triggers any smart alert. Returns alert msg or empty string."""
    alerts = []
    today = date.today()
    budget = float(getattr(user.profile, 'monthly_budget', 20000))

    # 1. Check daily spending spike
    month_qs = Expense.objects.filter(user=user, date__year=today.year, date__month=today.month)
    month_total = _safe_float(month_qs.aggregate(t=Sum("amount"))["t"])
    active_days = max(month_qs.values("date").distinct().count(), 1)
    avg_daily = month_total / active_days

    today_total = _safe_float(
        month_qs.filter(date=today).aggregate(t=Sum("amount"))["t"]
    )

    if avg_daily > 0 and today_total > avg_daily * 2:
        alerts.append(
            f"🚨 *Spending Alert!* Today you've spent ₹{today_total:,.0f} — "
            f"that's {today_total/avg_daily:.1f}x your daily average!"
        )

    # 2. Check budget threshold
    budget_pct = (month_total / budget * 100) if budget > 0 else 0
    if budget_pct >= 90 and budget_pct < 100:
        alerts.append(
            f"⚠️ *Budget Warning!* You've used {budget_pct:.0f}% of your ₹{budget:,.0f} budget. "
            f"Only ₹{max(budget - month_total, 0):,.0f} remaining!"
        )
    elif budget_pct >= 100:
        alerts.append(
            f"🛑 *Budget Exceeded!* You've spent ₹{month_total:,.0f} against ₹{budget:,.0f} budget. "
            f"Overspent by ₹{month_total - budget:,.0f}!"
        )

    # 3. Check category repetition (3+ times same category today)
    cat = expense.category
    today_cat_count = month_qs.filter(date=today, category=cat).count()
    if today_cat_count >= 3:
        today_cat_total = _safe_float(
            month_qs.filter(date=today, category=cat).aggregate(t=Sum("amount"))["t"]
        )
        alerts.append(
            f"🔄 *Pattern Detected!* You've spent on {cat.title()} {today_cat_count} times today "
            f"(₹{today_cat_total:,.0f} total). Need to cut back?"
        )

    if alerts:
        return "\n\n".join(alerts)
    return ""


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE 5: EXPENSE SPLIT 📱
# ══════════════════════════════════════════════════════════════════════════════

@api_login_required
def api_split_groups(request: HttpRequest) -> JsonResponse:
    groups = SplitGroup.objects.filter(creator=request.user)
    data = []
    for g in groups:
        members = list(g.members.values_list('name', flat=True))
        total = _safe_float(g.expenses.aggregate(t=Sum("amount"))["t"])
        expense_count = g.expenses.count()
        per_person = total / max(len(members), 1)

        data.append({
            "id": g.pk,
            "name": g.name,
            "members": members,
            "member_count": len(members),
            "total": total,
            "per_person": round(per_person, 2),
            "expense_count": expense_count,
            "is_settled": g.is_settled,
            "created_at": g.created_at.isoformat(),
        })
    return JsonResponse({"groups": data, "count": len(data)})


@api_login_required
@json_required
def api_create_split(request: HttpRequest) -> JsonResponse:
    body = getattr(request, "_json_body", {})
    name = str(body.get("name", "")).strip()
    members = body.get("members", [])

    if not name:
        return JsonResponse({"error": "Group name required"}, status=400)
    if not isinstance(members, list) or len(members) < 2:
        return JsonResponse({"error": "At least 2 members required"}, status=400)
    if len(members) > 20:
        return JsonResponse({"error": "Maximum 20 members allowed"}, status=400)

    group = SplitGroup.objects.create(creator=request.user, name=name)

    for m in members:
        m_name = str(m.get("name", "") if isinstance(m, dict) else m).strip()
        m_phone = str(m.get("phone", "") if isinstance(m, dict) else "").strip()
        if m_name:
            SplitMember.objects.create(group=group, name=m_name, phone=m_phone or None)

    return JsonResponse({
        "status": "success",
        "message": f"👥 Split group '{name}' created with {group.members.count()} members!",
        "group_id": group.pk,
    }, status=201)


@api_login_required
@json_required
def api_add_split_expense(request: HttpRequest, pk: int) -> JsonResponse:
    group = get_object_or_404(SplitGroup, pk=pk, creator=request.user)

    if group.is_settled:
        return JsonResponse({"error": "This group is already settled!"}, status=400)

    body = getattr(request, "_json_body", {})
    paid_by = str(body.get("paid_by", "")).strip()
    description = str(body.get("description", "")).strip()
    amount = body.get("amount", 0)

    if not paid_by:
        return JsonResponse({"error": "'paid_by' name required"}, status=400)
    if not description:
        return JsonResponse({"error": "Description required"}, status=400)

    # Verify paid_by is a member
    if not group.members.filter(name=paid_by).exists():
        return JsonResponse({"error": f"'{paid_by}' is not a member of this group"}, status=400)

    try:
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValueError
    except (InvalidOperation, ValueError, TypeError):
        return JsonResponse({"error": "Valid amount required"}, status=400)

    exp_date_str = body.get("date", "")
    try:
        exp_date = date.fromisoformat(str(exp_date_str)) if exp_date_str else date.today()
    except ValueError:
        exp_date = date.today()

    expense = SplitExpense.objects.create(
        group=group,
        paid_by=paid_by,
        description=description,
        amount=amount,
        date=exp_date,
    )

    total = _safe_float(group.expenses.aggregate(t=Sum("amount"))["t"])
    per_person = total / max(group.members.count(), 1)

    return JsonResponse({
        "status": "success",
        "message": f"💸 ₹{amount:,} added to '{group.name}' (paid by {paid_by})",
        "expense_id": expense.pk,
        "group_total": total,
        "per_person": round(per_person, 2),
    }, status=201)


@api_login_required
def api_split_summary(request: HttpRequest, pk: int) -> JsonResponse:
    """Calculate who owes whom — minimized transactions."""
    group = get_object_or_404(SplitGroup, pk=pk, creator=request.user)
    members = list(group.members.values_list('name', flat=True))
    expenses = group.expenses.all()

    total = _safe_float(expenses.aggregate(t=Sum("amount"))["t"])
    per_person = total / max(len(members), 1)

    # Calculate balances (positive = owed money, negative = owes money)
    balances = {m: 0.0 for m in members}
    for exp in expenses:
        if exp.paid_by in balances:
            balances[exp.paid_by] += float(exp.amount)

    # Each person's net = paid - share
    net = {m: balances[m] - per_person for m in members}

    # Minimize transactions
    settlements = []
    debtors = [(m, -amt) for m, amt in net.items() if amt < -0.01]  # owes money
    creditors = [(m, amt) for m, amt in net.items() if amt > 0.01]  # owed money

    debtors.sort(key=lambda x: x[1], reverse=True)
    creditors.sort(key=lambda x: x[1], reverse=True)

    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor, debt = debtors[i]
        creditor, credit = creditors[j]
        transfer = min(debt, credit)

        if transfer > 0.01:
            settlements.append({
                "from": debtor,
                "to": creditor,
                "amount": round(transfer, 2),
            })

        debtors[i] = (debtor, debt - transfer)
        creditors[j] = (creditor, credit - transfer)

        if debtors[i][1] < 0.01:
            i += 1
        if creditors[j][1] < 0.01:
            j += 1

    # Per-member breakdown
    member_breakdown = []
    for m in members:
        paid = balances[m]
        share = per_person
        member_breakdown.append({
            "name": m,
            "paid": round(paid, 2),
            "share": round(share, 2),
            "net": round(net[m], 2),
            "status": "gets_back" if net[m] > 0.01 else ("owes" if net[m] < -0.01 else "settled"),
        })

    # Build WhatsApp share message
    settle_lines = [f"• {s['from']} ➡️ {s['to']}: ₹{s['amount']:,.0f}" for s in settlements]
    wa_msg = (
        f"📱 *{group.name} — Split Summary*\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"💰 Total: ₹{total:,.0f}\n"
        f"👥 Per Person: ₹{per_person:,.0f}\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"🔄 *Settlements:*\n" + "\n".join(settle_lines or ["All settled! ✅"])
    )

    return JsonResponse({
        "group_name": group.name,
        "total": total,
        "per_person": round(per_person, 2),
        "member_count": len(members),
        "members": member_breakdown,
        "settlements": settlements,
        "is_settled": group.is_settled,
        "whatsapp_message": wa_msg,
    })


@api_login_required
def api_settle_split(request: HttpRequest, pk: int) -> JsonResponse:
    group = get_object_or_404(SplitGroup, pk=pk, creator=request.user)
    group.is_settled = True
    group.save(update_fields=["is_settled"])
    return JsonResponse({"status": "success", "message": f"✅ '{group.name}' settled!"})


@api_login_required
def api_delete_split(request: HttpRequest, pk: int) -> JsonResponse:
    group = get_object_or_404(SplitGroup, pk=pk, creator=request.user)
    name = group.name
    group.delete()
    return JsonResponse({"status": "success", "message": f"🗑️ Split group '{name}' deleted."})


# ══════════════════════════════════════════════════════════════════════════════
# MOBILE API AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════════════
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user_id': user.pk,
            'email': user.email,
            'username': user.username
        })