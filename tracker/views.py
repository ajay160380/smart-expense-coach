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

from django.conf import settings
from .models import Expense, Subscription, UserProfile
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

AI_RATE_LIMIT_CALLS  = 15
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


def build_voice_ai_prompt(spoken_text, today):
    return f"""
    You are a strict data extractor bot. Extract the EXACT number from the text.
    Input: "{spoken_text}"
    Today: {today}

    Rules:
    - If user says "700 ka transport", amount is 700.
    - NEVER guess a number. Use ONLY what is in the text.
    - If no number is found, amount is 0.
    - Pick category ONLY from: food, transport, shopping, health, entertainment, education, utilities, other.
    
    Response MUST be strict JSON ONLY:
    {{
        "amount": <number>,
        "category": "<string>",
        "date": "{today}",
        "description": "<string>",
        "confidence": <float>
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
                "message": "Registration done! Ab apna WhatsApp number se kharcha track karo."
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def register(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = CustomRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            logger.info("New user registered uid=%s username=%s", user.id, user.username)
            messages.success(request, "Account created! Ab WhatsApp par message karein 🎉")
            return redirect("dashboard")
        else:
            print("FORM ERRORS:", form.errors)
            messages.error(request, "Kuch detail galat hai, dubara check karein.")
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
            messages.error(request, "Valid budget daalo (positive number).")
        return redirect("dashboard")

    # Fallback default agar profile mein budget na ho
    budget = getattr(profile, 'monthly_budget', 20000) 
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
        insight = "<strong>Get started!</strong> Add your first expense to receive AI guidance. 🚀"
    else:
        raw     = get_ai_insight(user.id, expenses_qs, budget, stats["total_spent"])
        insight = f"<strong>AI Coach:</strong> {raw}"

    monthly_trend = build_monthly_trend(user, months=CHART_MONTHS)

    context = {
        "budget":               budget,
        "insight":              insight,
        "anomaly_alerts":       anomaly_alerts,
        "category_data_list":   category_data_list,
        "chart_data":           chart_data,
        "monthly_trend":        monthly_trend,
        
        # Ab expenses mein page object nahi, direct queryset jayega JS ke liye
        "expenses":             expenses_qs, 
        
        "current_filter":       filter_type,
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
        messages.error(request, "Valid amount daalo yaar (e.g., 150 or 1500.50).")
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

@csrf_exempt
@ai_rate_limited
@json_required
def voice_expense(request: HttpRequest) -> JsonResponse:
    """
    Dual-mode voice expense endpoint:
    - Browser mode: No phone needed — uses logged-in session user directly.
    - WhatsApp mode: Phone number se UserProfile dhoondo, uska user lo.
    """
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Only POST allowed."}, status=405)

    # ── Parse body ────────────────────────────────────────────────────────────
    body = getattr(request, "_json_body", None)
    if body is None:
        try:
            body = json.loads(request.body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"status": "error", "message": "Invalid JSON."}, status=400)

    incoming_phone = str(body.get("phone", "")).strip()
    spoken_text    = str(body.get("text", "")).strip()

    print(f"DEBUG voice_expense | phone={incoming_phone!r} | text={spoken_text!r}")

    if not spoken_text:
        return JsonResponse({"status": "error", "message": "No text received."}, status=400)

    # ── Dual-mode user resolution ─────────────────────────────────────────────
    target_user = None

    if not incoming_phone:
        # ── MODE 1: Browser — logged-in session user ──────────────────────────
        if request.user.is_authenticated:
            target_user = request.user
            logger.info("Voice expense via browser uid=%s", target_user.id)
        else:
            return JsonResponse({
                "status":  "error",
                "message": "Login karein ya WhatsApp number bhejein. 🔐"
            }, status=401)

    else:
        # ── MODE 2: WhatsApp — phone number se user dhoondo ───────────────────
        # Sirf digits rakho, leading zeros hatao
        normalized_phone = re.sub(r'[^0-9]', '', incoming_phone).lstrip("0")

        # Try both: with and without "91" country code
        if normalized_phone.startswith("91") and len(normalized_phone) > 10:
            phone_without_cc = normalized_phone[2:]   # "919876543210" → "9876543210"
            phone_with_cc    = normalized_phone        # "919876543210"
        else:
            phone_without_cc = normalized_phone        # "9876543210"
            phone_with_cc    = "91" + normalized_phone # "919876543210"

        print(f"DEBUG: Trying phone formats → {phone_with_cc!r} or {phone_without_cc!r}")

        profile = UserProfile.objects.filter(
            Q(phone_number=phone_with_cc) | Q(phone_number=phone_without_cc)
        ).select_related("user").first()

        if not profile or not profile.user:
            logger.warning(
                "Voice expense failed: unknown phone %s (tried: %s, %s)",
                incoming_phone, phone_with_cc, phone_without_cc
            )
            return JsonResponse({
                "status":  "error",
                "message": "Bhai, pehle website par register karke apna WhatsApp number save karo! 🚫"
            }, status=404)

        target_user = profile.user
        logger.info("Voice expense via WhatsApp uid=%s phone=%s", target_user.id, incoming_phone)

    # ── AI se expense data extract karo ──────────────────────────────────────
    try:
        today           = date.today()
        normalized_text = normalize_hinglish_numbers(spoken_text)
        prompt          = build_voice_ai_prompt(normalized_text, today)

        response = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.0,
            max_tokens=150,
        )
        raw_response = response.choices[0].message.content.strip()
        print(f"DEBUG AI raw response: {raw_response!r}")

        json_match = re.search(r'\{[^{}]+\}', raw_response, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON found in AI response")

        ai_data    = json.loads(json_match.group(0))
        amount_raw = ai_data.get("amount", 0)

        if isinstance(amount_raw, str):
            amount_raw = re.sub(r'[^0-9.]', '', amount_raw)

        amount = Decimal(str(amount_raw))

        if amount <= 0:
            return JsonResponse({
                "status":  "error",
                "message": "Amount samajh nahi aaya. Try karo: '500 petrol' ⛽"
            }, status=400)

        category = str(ai_data.get("category", "other")).strip().lower()
        if category not in VALID_CATEGORIES:
            category = _keyword_category_fallback(spoken_text)

        expense = Expense.objects.create(
            user=target_user,
            amount=amount,
            category=category,
            date=today,
            description=str(ai_data.get("description", "")).strip()[:100],
        )

        icon = CAT_ICONS.get(category, "📦")
        logger.info("Voice expense saved uid=%s id=%s amount=%s cat=%s",
                    target_user.id, expense.pk, amount, category)

        return JsonResponse({
            "status":     "success",
            "message":    f"{icon} ₹{amount:,} — {category.title()} saved! ✅",
            "expense_id": expense.pk,
        })

    except json.JSONDecodeError as e:
        logger.error("Voice expense JSON parse error: %s", e)
        return JsonResponse({"status": "error", "message": "AI response parse nahi hua."}, status=500)

    except Exception as e:
        logger.error("Voice expense error uid=%s error=%s", target_user.id if target_user else "unknown", e)
        print(f"CRITICAL ERROR in voice_expense: {e}")
        return JsonResponse({"status": "error", "message": "Kuch galat hua bhai. 😅"}, status=500)


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

@login_required(login_url="login")
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
Speak in Hinglish (Roman script). Be warm, sometimes sarcastic, always practical and helpful.

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
1. Always respond in Hinglish naturally.
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
            "reply":  "Oops! Network issue. Please retry. 😅",
            "status": "error",
        })


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY INSIGHT API
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@ai_rate_limited
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

@login_required(login_url="login")
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


@login_required(login_url="login")
def api_heatmap(request: HttpRequest) -> JsonResponse:
    ck     = f"heatmap_{request.user.id}_{date.today().isoformat()}"
    cached = cache.get(ck)
    if cached:
        return JsonResponse(cached)

    heatmap = build_spending_heatmap(request.user)
    cache.set(ck, heatmap, HEATMAP_TIMEOUT)
    return JsonResponse(heatmap)


@login_required(login_url="login")
def api_anomalies(request: HttpRequest) -> JsonResponse:
    budget = get_user_budget(request)
    alerts = detect_anomalies(request.user, budget)
    return JsonResponse({"alerts": alerts, "count": len(alerts)})


@login_required(login_url="login")
def api_summary_stats(request: HttpRequest) -> JsonResponse:
    budget   = get_user_budget(request)
    month_qs = get_filtered_expenses(request.user, "month")
    stats    = calculate_stats(month_qs, budget)
    today    = date.today()

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


@login_required(login_url="login")
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

@login_required(login_url="login")
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


@login_required(login_url="login")
def api_user_profile(request: HttpRequest) -> JsonResponse:
    user    = request.user
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


@login_required(login_url="login")
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
            "warning": "Bhai abhi data bohot kam hai habit samajhne ke liye. Thode aur kharche track kar! 📉"
        })

    data_str = "\n".join([f"{e.date.strftime('%A')} ({e.category}): ₹{e.amount}" for e in expenses])

    prompt = f"""
    You are 'PaisaMitra', a brutally honest, highly intelligent Indian financial AI coach.
    Here is the user's daily spending data for the last 14 days:
    {data_str}

    Task:
    1. Analyze the exact numbers and find a HIDDEN PATTERN or BAD HABIT (e.g., "spending too much on transport regularly", "huge food expenses on weekends").
    2. Predict what will happen to his budget if he continues this exact habit.
    3. Give a strict, funny, and highly personalized Hinglish warning message to send via WhatsApp.
    
    Rules:
    - Only give the final message text. No intro, no quotes, no markdown.
    - Keep it under 4 lines.
    - Be sarcastic but logical based ON THE DATA provided.
    """

    try:
        response = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.8,
            max_tokens=150,
        )
        warning_msg = response.choices[0].message.content.strip()
        return JsonResponse({"warning": warning_msg})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)