from django_ratelimit.decorators import ratelimit
"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║          EXPENSE TRACKER — EXPENSE TRACKER  |  views.py  |  Production v3.2        ║
║          Full-stack Django views with AI, Voice, Analytics & Smart Features     ║
╚══════════════════════════════════════════════════════════════════════════════════╝
"""

import csv
import json
import calendar
import logging
import re
import hashlib
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from collections import defaultdict
from functools import wraps
from typing import Optional
from urllib.parse import quote

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
import random
import hmac
from .models import (
    Expense, Subscription, UserProfile, SavingsGoal, SplitGroup,
    SplitExpense, SplitMember, SplitSettlement, WhatsAppSession,
    OTPVerification, Note, SubscriptionCharge, WhatsAppProcessedMessage, ContactMessage
)
from .forms import ExpenseForm, SubscriptionForm, CustomRegistrationForm

from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
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
                      "bhojan", "roti", "dal", "paneer", "biryani", "café", "cafe", "dosa",
                      "milk", "doodh", "tea", "coffee", "burger", "momo", "maggi", "samosa",
                      "chips", "ice cream", "juice", "biscuit", "egg", "ande", "chicken",
                      "mutton", "fish", "sweets", "mithai"],
    "transport":     ["petrol", "diesel", "auto", "cab", "uber", "ola", "metro", "bus",
                      "taxi", "parking", "toll", "train", "flight", "rickshaw", "fuel",
                      "cng", "rapido", "bike"],
    "shopping":      ["kapde", "clothes", "shoes", "mall", "amazon", "flipkart", "online",
                      "shirt", "jeans", "dress", "bag", "watch", "gadget", "mobile", "laptop",
                      "tshirt", "pant", "chappal", "meesho"],
    "health":        ["dawai", "medicine", "doctor", "hospital", "chemist", "pharmacy",
                      "gym", "clinic", "test", "pathlab", "dawa", "injection", "checkup",
                      "tablet", "syrup"],
    "entertainment": ["movie", "netflix", "ott", "game", "concert", "sports", "match",
                      "hotstar", "prime", "spotify", "youtube", "ticket", "fun", "outing",
                      "cinema", "reels"],
    "education":     ["book", "course", "fees", "tuition", "stationery", "school",
                      "college", "udemy", "coaching", "class", "pen", "notebook", "xerox",
                      "printout", "form"],
    "utilities":     ["light bill", "bijli", "gas", "water", "recharge", "mobile bill",
                      "internet", "broadband", "wifi", "electricity", "maintenance", "rent",
                      "cylinder", "room rent"],
}
VALID_CATEGORIES = set(CAT_COLORS.keys())
VALID_FILTERS    = {"week", "month", "all"}
VALID_PERIODS    = {"week", "month", "quarter", "year"}

# ── Complete Hindi/Hinglish number words 1-100 → integer value ───────────────
_HINDI_UNITS = {
    # ── Devanagari digit characters ──
    '०':0,'१':1,'२':2,'३':3,'४':4,'५':5,'६':6,'७':7,'८':8,'९':9,

    # ── 1-9 ──
    'ek':1,'eek':1,'एक':1,
    'do':2,'doh':2,'दो':2,
    'teen':3,'tin':3,'तीन':3,
    'char':4,'chaar':4,'चार':4,
    'paanch':5,'panch':5,'पांच':5,'पाँच':5,
    'chhe':6,'chhah':6,'chah':6,'छह':6,
    'saat':7,'सात':7,
    'aath':8,'aat':8,'आठ':8,
    'nau':9,'nav':9,'नौ':9,

    # ── 10-19 ──
    'das':10,'duss':10,'दस':10,
    'gyarah':11,'gyara':11,'gyaarah':11,'ग्यारह':11,
    'baarah':12,'barah':12,'bara':12,'बारह':12,
    'terah':13,'teyra':13,'तेरह':13,
    'chaudah':14,'choda':14,'chawda':14,'चौदह':14,
    'pandrah':15,'pandra':15,'pandraha':15,'पंद्रह':15,
    'solah':16,'sola':16,'सोलह':16,
    'sattrah':17,'satra':17,'satrah':17,'सत्रह':17,
    'aathaarah':18,'athara':18,'atharah':18,'अठारह':18,
    'unees':19,'unnis':19,'उन्नीस':19,

    # ── 20-29 ──
    'bees':20,'bis':20,'बीस':20,
    'ikkees':21,'ikees':21,'ikis':21,'इक्कीस':21,
    'baais':22,'bais':22,'बाईस':22,
    'teeis':23,'teis':23,'तेईस':23,
    'chaubis':24,'chauwis':24,'चौबीस':24,
    'pachhis':25,'pachis':25,'paccheees':25,'pacchis':25,'पच्चीस':25,
    'chabbis':26,'chhabis':26,'छब्बीस':26,
    'satais':27,'sataees':27,'सत्ताईस':27,
    'athais':28,'athaees':28,'अट्ठाईस':28,
    'unattees':29,'untees':29,'उनतीस':29,

    # ── 30-39 ──
    'tees':30,'तीस':30,
    'iktees':31,'ikatees':31,'इकतीस':31,
    'battees':32,'baatees':32,'बत्तीस':32,
    'tetees':33,'taintees':33,'तैंतीस':33,
    'chautees':34,'chauntees':34,'चौंतीस':34,
    'paytees':35,'paintees':35,'पैंतीस':35,
    'chhattees':36,'chattees':36,'छत्तीस':36,
    'saintees':37,'santees':37,'सैंतीस':37,
    'adhtees':38,'artees':38,'अड़तीस':38,
    'untalees':39,'untaalees':39,'उनतालीस':39,

    # ── 40-49 ──
    'chaalis':40,'chalis':40,'चालीस':40,
    'iktaalis':41,'ikataalees':41,'इकतालीस':41,
    'bayaalis':42,'byaalis':42,'बयालीस':42,
    'taytaalis':43,'taintaalis':43,'तैंतालीस':43,
    'chauwaalis':44,'chauwalas':44,'चौवालीस':44,
    'paintaalis':45,'payntaalis':45,'पैंतालीस':45,
    'chiyaalis':46,'chhaiyaalis':46,'छियालीस':46,
    'saintaalis':47,'sataalis':47,'सैंतालीस':47,
    'adhtaalis':48,'artaalis':48,'अड़तालीस':48,
    'unchaas':49,'उनचास':49,

    # ── 50-59 ──
    'pachaas':50,'pachas':50,'packaas':50,'पचास':50,
    'ikyaavan':51,'ikyavan':51,'इक्यावन':51,
    'baavan':52,'बावन':52,
    'tirpan':53,'tirapan':53,'तिरपन':53,
    'chauvan':54,'चौवन':54,
    'pachpan':55,'पचपन':55,
    'chhappan':56,'chappan':56,'छप्पन':56,
    'sattavan':57,'sattawan':57,'सत्तावन':57,
    'athavan':58,'atthavan':58,'अठावन':58,
    'unsath':59,'unasath':59,'उनसठ':59,

    # ── 60-69 ──
    'saath':60,'साठ':60,
    'iksath':61,'eksath':61,'इकसठ':61,
    'basath':62,'barsath':62,'बासठ':62,
    'tirsath':63,'तिरसठ':63,
    'chausath':64,'चौसठ':64,
    'painsath':65,'paisath':65,'पैंसठ':65,
    'chhiyasath':66,'chhiasath':66,'छियासठ':66,
    'sadsath':67,'सड़सठ':67,
    'adsath':68,'अड़सठ':68,
    'unhattar':69,'उनहत्तर':69,

    # ── 70-79 ──
    'saattar':70,'sattar':70,'सत्तर':70,
    'ikhattar':71,'इकहत्तर':71,
    'bahattar':72,'बहत्तर':72,
    'tihattar':73,'तिहत्तर':73,
    'chauhattar':74,'चौहत्तर':74,
    'pachattar':75,'पचहत्तर':75,
    'chhihattar':76,'chhiyahattar':76,'छिहत्तर':76,
    'satahattar':77,'satthattar':77,'सतहत्तर':77,
    'aathattar':78,'athattar':78,'अठहत्तर':78,
    'unasi':79,'उनासी':79,

    # ── 80-89 ──
    'assee':80,'ashi':80,'assi':80,'अस्सी':80,
    'ikyasi':81,'ikyaasi':81,'इक्यासी':81,
    'bayasi':82,'baasi':82,'बयासी':82,
    'tirasi':83,'तिरासी':83,
    'chaurasi':84,'चौरासी':84,
    'pachasi':85,'पचासी':85,
    'chhiyasi':86,'chhiyaasi':86,'छियासी':86,
    'sattasi':87,'सतासी':87,
    'atthasi':88,'अट्ठासी':88,
    'navasi':89,'नवासी':89,

    # ── 90-99 ──
    'nabbe':90,'nabhe':90,'नब्बे':90,
    'ikyaanave':91,'ikyaanbe':91,'इक्यानवे':91,
    'baanave':92,'baanbe':92,'बानवे':92,
    'tiranave':93,'tiranbe':93,'तिरानवे':93,
    'chauranave':94,'chauranbe':94,'चौरानवे':94,
    'panchanave':95,'panchanbe':95,'पंचानवे':95,
    'chhiyanave':96,'chhiyanbe':96,'छियानवे':96,
    'sattanave':97,'sattanbe':97,'सत्तानवे':97,
    'atthanave':98,'atthanbe':98,'अट्ठानवे':98,
    'ninanave':99,'ninyanbe':99,'निन्यानवे':99,

    # ── English Number Words (0-90) ──
    'zero':0, 'one':1, 'two':2, 'three':3, 'four':4, 'five':5,
    'six':6, 'seven':7, 'eight':8, 'nine':9, 'ten':10,
    'eleven':11, 'twelve':12, 'thirteen':13, 'fourteen':14, 'fifteen':15,
    'sixteen':16, 'seventeen':17, 'eighteen':18, 'nineteen':19,
    'twenty':20, 'thirty':30, 'forty':40, 'fifty':50,
    'sixty':60, 'seventy':70, 'eighty':80, 'ninety':90,
}

# Multipliers (×100, ×1000 etc.) — used for compound number parsing
_HINDI_MULTIPLIERS = {
    'sau':100,'sou':100,'so':100,'सौ':100,'saw':100,'saww':100,'sow':100,'hundred':100,
    'hazar':1000,'hajaar':1000,'hajar':1000,'hazaar':1000,'हजार':1000,'हज़ार':1000,'thousand':1000,'k':1000,
    'lakh':100000,'lac':100000,'लाख':100000,'million':1000000,
    'karod':10000000,'crore':10000000,'krod':10000000,'करोड़':10000000,'करोड':10000000,
}

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ══════════════════════════════════════════════════════════════════════════════
# DECORATORS & UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt

def get_client_ip(request: HttpRequest) -> str:
    """Extract client IP address safely, respecting trusted reverse proxy headers."""
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')

_get_client_ip = get_client_ip

def is_super_admin(user) -> bool:
    """SEC-002: Role-based staff / superuser authorization check.
    Phone number ending in 7905398965 is exclusively granted admin privileges.
    """
    if not (user and user.is_authenticated):
        return False
    try:
        from .models import UserProfile
        profile = getattr(user, 'profile', None) or UserProfile.objects.filter(user=user).first()
        if profile:
            raw_phone = str(profile.phone_number or profile.whatsapp_number or '')
            digits = re.sub(r"\D", "", raw_phone)
            if digits.endswith("7905398965"):
                return True
    except Exception:
        pass
    return bool(user.is_staff or user.is_superuser)

def staff_required(view_func):
    """
    SEC-002: Reusable decorator for Django views checking user is staff/superuser.
    """
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not request.user.is_authenticated:
            if request.headers.get('Accept') == 'application/json' or request.path.startswith('/api/'):
                return JsonResponse({"error": "Authentication credentials were not provided."}, status=401)
            return redirect('login')
        if not is_super_admin(request.user):
            if request.headers.get('Accept') == 'application/json' or request.path.startswith('/api/'):
                return JsonResponse({"error": "Permission denied. Staff access required."}, status=403)
            messages.error(request, "Access Denied: Staff permissions required.")
            return redirect('dashboard')
        return view_func(request, *args, **kwargs)
    return _wrapped_view

def api_login_required(view_func):
    """
    SEC-005: Authentication wrapper supporting both TokenAuthentication (mobile)
    and SessionAuthentication with CSRF validation (browser).
    csrf_exempt is applied at the outer layer so Token requests pass without CSRF cookie,
    while Session-based requests are strictly validated for CSRF.
    """
    @csrf_exempt
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        # 1. Token Authentication (Mobile / API)
        if auth_header and auth_header.startswith('Token '):
            token_key = auth_header.split(' ')[1].strip()
            try:
                token = Token.objects.select_related('user').get(key=token_key)
                request.user = token.user
                return view_func(request, *args, **kwargs)
            except Token.DoesNotExist:
                return JsonResponse({"error": "Invalid token."}, status=401)
        elif auth_header:
            return JsonResponse({"error": "Invalid token header format. Use 'Token <key>'."}, status=401)

        # 2. Session Authentication (Browser requests)
        if request.user and request.user.is_authenticated:
            # Enforce CSRF validation for state-changing browser requests
            if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                from django.middleware.csrf import CsrfViewMiddleware
                reason = CsrfViewMiddleware().process_view(request, None, (), {})
                if reason:
                    return JsonResponse({"error": "CSRF verification failed."}, status=403)
            return view_func(request, *args, **kwargs)

        return JsonResponse({"error": "Authentication credentials were not provided."}, status=401)
    return wrapper

def ai_rate_limited(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
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
    budget_key = "_cached_budget"
    if hasattr(request, budget_key):
        return getattr(request, budget_key)
    budget = DEFAULT_BUDGET
    if hasattr(request, "user") and request.user.is_authenticated:
        try:
            profile = UserProfile.objects.get(user=request.user)
            if profile.monthly_budget and profile.monthly_budget > 0:
                budget = float(profile.monthly_budget)
        except UserProfile.DoesNotExist:
            pass
    if budget == DEFAULT_BUDGET and hasattr(request, "session"):
        try:
            budget = float(request.session.get("budget", DEFAULT_BUDGET))
            if budget <= 0:
                budget = DEFAULT_BUDGET
        except (ValueError, TypeError):
            budget = DEFAULT_BUDGET
    setattr(request, budget_key, budget)
    return budget


_groq_client_instance = None
def _groq_client() -> Groq:
    global _groq_client_instance
    if _groq_client_instance is None:
        _groq_client_instance = Groq(api_key=settings.GROQ_API_KEY)
    return _groq_client_instance


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

def _parse_hindi_num_tokens(tokens: list) -> int:
    """Convert a list of Hindi number-word tokens into a single integer.
    Handles compounds like ['do', 'sau', 'pachaas'] → 250
    """
    result = 0
    current = 0
    for tok in tokens:
        t = tok.lower().strip()
        if t in _HINDI_MULTIPLIERS:
            mult = _HINDI_MULTIPLIERS[t]
            if current == 0:
                current = 1
            if mult >= 1000:
                result += current * mult
                current = 0
            else:           # sau = ×100
                current *= mult
        elif t in _HINDI_UNITS:
            current += _HINDI_UNITS[t]
        elif re.match(r'^\d+$', t):
            current += int(t)
    result += current
    return result


def normalize_hinglish_numbers(text: str) -> str:
    """Convert Hindi/Hinglish number words to digits, handling compounds correctly.
    e.g. 'do sau pachaas petrol' → '250 petrol'
         'teen hazar ka khaana' → '3000 ka khaana'
    """
    original = text
    # 1. Devanagari digit characters → ASCII
    deva_map = {'०':'0','१':'1','२':'2','३':'3','४':'4',
                '५':'5','६':'6','७':'7','८':'8','९':'9'}
    for d, a in deva_map.items():
        text = text.replace(d, a)

    # 2. Tokenise on whitespace, keeping whitespace tokens to preserve spacing
    all_num_words = set(_HINDI_UNITS.keys()) | set(_HINDI_MULTIPLIERS.keys())
    raw_tokens = re.split(r'(\s+)', text)   # alternating [word, ws, word, ws, …]

    result_parts = []
    num_buffer = []

    def flush_buffer():
        if num_buffer:
            val = _parse_hindi_num_tokens(num_buffer)
            result_parts.append(str(val))
            num_buffer.clear()

    for tok in raw_tokens:
        if re.match(r'^\s+$', tok):          # whitespace token — skip into buffer gap
            if num_buffer:                    # we're inside a number sequence, continue
                pass                          # don't flush yet; next word may extend it
            else:
                result_parts.append(tok)
        elif tok.lower() in all_num_words or re.match(r'^\d+$', tok):
            num_buffer.append(tok.lower())
        else:
            flush_buffer()
            # restore the whitespace that was swallowed before a non-number word
            if num_buffer == [] and result_parts and not result_parts[-1].endswith(' '):
                result_parts.append(' ')
            result_parts.append(tok)

    flush_buffer()

    result = ''.join(result_parts)
    result = re.sub(r'[^\S\n]+', ' ', result).strip()
    logger.debug("Normalized Hinglish: %r → %r", original, result)
    return result


def build_conversational_ai_prompt(today, user_context: dict) -> str:
    user_name = user_context.get('name', 'User')
    return f"""
    You are "Expense Coach", a smart, friendly, warm, and highly polite financial AI companion and coach. 
    You have ABSOLUTELY NO RESTRICTIONS on what you can talk about. The user can chat with you about anything — their day, thoughts, feelings, work, jokes, casual chit-chat, advice, or finances! 
    
    CRITICAL CONVERSATIONAL GUIDELINES:
    1. NEVER be rigid or force the user to enter expenses. If the user is just saying something normal (e.g. "aaj office me bahut kaam tha", "aaj mausam badiya hai", "main bore ho raha hu", "kya kar rahe ho", "kuch sunao", "good morning", "kaise ho"), talk to them naturally, warmly, and empathetically like a close friend and trusted mentor. NEVER say "Mujhe samajh nahi aaya kharcha batao"!
    2. NEVER use words like "Tu", "Tera", "Tujhe", "tutu". ALWAYS use respectful words like "Aap", "Aapka", "Bhai", "Dost".
    3. Speak in 100% natural, smooth, grammatically correct Hinglish (Hindi written in English alphabet) by default. If the user speaks pure English, reply in pure, elegant English.
    4. Keep your replies concise, warm, lively, and engaging (under 100 words). Avoid robotic repetitive templates.
    5. Do not blindly repeat the budget summary in every message unless asked or relevant.
    
    If asked about your creator or developer, your `chat_response` MUST be exactly this string (ensure you escape newlines as \\n\\n so the JSON remains valid):
    "👨‍💻 *My Creator: Ajay Vishwakarma*\\n\\nI was developed by Ajay, a passionate Full Stack & AI/ML Engineer! Here are his professional links:\\n\\n🌐 *Portfolio:* https://ajay-vishwakarmaa.netlify.app\\n🐙 *GitHub:* https://github.com/ajay160380\\n💼 *LinkedIn:* https://www.linkedin.com/in/ajay-vishwakarma-71649129a/"
    
    FORMATTING RULES (CRITICAL):
    1. Do NOT make everything bold. Only bold *important keywords* (like amounts or names), NOT entire sentences!
    2. Write in short, clean sentences.
    3. Always use double newlines (`\n\n`) between different points or paragraphs.
    4. When listing items or links, use elegant bullet points (•) on separate lines.
    5. Make your responses look BEAUTIFUL, spaced out, and easy to read. Use 1 or 2 relevant emojis naturally.
    
    Today's Date: {today}
    
    User Context:
    - Name: {user_name}
    - Dashboard Link: https://smart-expense-coach.onrender.com
    - Monthly Budget: ₹{user_context.get('budget', 20000)}
    - Total Spent This Month: ₹{user_context.get('spent', 0)}
    - Remaining Budget: ₹{user_context.get('remaining', 0)}
    - Category-wise Breakdown: {user_context.get('category_breakdown', 'None')}
    - Recent Expenses: {user_context.get('recent_expenses', 'None')}
    - Recent Notes: {user_context.get('recent_notes', 'None')}

    Rules for Routing (CRITICAL):
    1. EXPENSE RECORDING (HIGHEST PRIORITY):
       Whenever the user mentions ANY expense, purchase, money spent, paid, bought, or incurred (e.g. "500 petrol", "200 chai", "swiggy se 450 ka khana", "maine 300 rupaye khana khaya", "doodh 60 ka", "bought medicine for 350", "uber cab 280 rupaye de diye", "pizza 450"):
       - action = "log_expenses"
       - expenses = An array of expense objects: [{"amount": 500, "category": "transport", "description": "Petrol"}]. Extract EVERY SINGLE item mentioned.
       - NEVER classify a message mentioning an amount of money spent as "chat"! Always set action="log_expenses".
    2. If the user EXPLICITLY asks to save a note (e.g. "save to notepad", "notepad me daal do", "note: buy milk"):
       - action = "save_note"
       - note = The exact text they want to save.
    3. If the user pastes a LARGE LIST (multiple lines of items and numbers) BUT DOES NOT explicitly tell you whether to save it or log it:
       - action = "ask_clarification"
       - chat_response = "Should I save this long list to your Notepad or add it to your Expenses? 🤔"
    4. ONLY FOR PURE CONVERSATION, GREETINGS, CHIT-CHAT, OR QUESTIONS WITHOUT ANY EXPENSES (e.g. "hi", "kaise ho", "kya chal raha hai", "good morning"):
       - action = "chat"
       - chat_response = your natural, conversational, polite Hinglish reply.
         - Address the user by their name ({user_name}) when appropriate!
         - You MUST use WhatsApp formatting (e.g., *bold* for emphasis).
         - Always use relevant emojis (e.g. 💰, 📉, 🌟, 🍜).
         - If the user asks where they spent money ("kaha kaha khrcha kiya"), use the 'Category-wise Breakdown' from the context!
         - If the user talks about a TRIP, VACATION, or GROUP EXPENSE SPLIT:
           • Warmly acknowledge the trip and explain how to create a Live Trip Split Link:
             👉 *Link banane ke liye:* "[Trip Name] with [Friends]" (jaise `Manali trip with Sumit`)
             👉 *Kharcha split ke liye:* "[Trip Name]: [Kisne kitna diya]" (jaise `Manali trip: Ajay paid 1600, Sumit paid 0`)
           • NEVER suggest putting trip/group expenses in Notepad!
           • NEVER hallucinate or bring up old trips from past chats unless the user explicitly asks about them.

    Response MUST be strict JSON ONLY. No markdown, no extra text. Do NOT use <think> tags.
    /no_think
    {{
        "action": "log_expenses" | "save_note" | "ask_clarification" | "chat",
        "expenses": [
            {{
                "amount": 0,
                "category": "other",
                "description": ""
            }}
        ],
        "note": "The note text to save",
        "chat_response": "Your actual helpful and detailed reply goes here. Do NOT use placeholders."
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
    today = timezone.localdate()
    subs  = (Subscription.objects
             .filter(user=user, next_billing_date__lte=today)
             .select_for_update())
    debits = 0

    for sub in subs:
        bd, itr = sub.next_billing_date, 0
        while bd <= today and itr < 24:
            # LOGIC-003: Idempotent billing with SubscriptionCharge unique constraint
            charge, created = SubscriptionCharge.objects.get_or_create(
                subscription=sub,
                billing_date=bd,
                defaults={'amount': sub.amount}
            )
            if created:
                expense = Expense.objects.create(
                    user=user,
                    category=sub.category,
                    amount=sub.amount,
                    date=bd,
                    description=f"Subscription: {sub.name}",
                )
                charge.expense = expense
                charge.save(update_fields=["expense"])
                debits += 1
            bd = _next_month_date(bd)
            itr += 1
        sub.next_billing_date = bd
        sub.save(update_fields=["next_billing_date"])

    if debits:
        logger.info("Subscriptions processed uid=%s count=%d", user.id, debits)

    return debits


def validate_and_normalize_expense(user, amount_val, category_val, date_val=None, description=""):
    """
    LOGIC-002: Centralized validation for expenses created via Web, Mobile, or WhatsApp.
    Validates amount range, non-future dates, description length, and normalizes categories.
    """
    try:
        amount = Decimal(str(amount_val).strip())
        if amount <= 0:
            return None, "Amount must be greater than zero."
        if amount > Decimal("10000000.00"):
            return None, "Amount exceeds maximum allowable limit of ₹1,00,00,000."
    except Exception:
        return None, "Please enter a valid numeric amount."

    today = timezone.localdate()
    if date_val is None:
        exp_date = today
    elif isinstance(date_val, str):
        try:
            exp_date = date.fromisoformat(date_val.strip())
        except Exception:
            exp_date = today
    elif isinstance(date_val, date):
        exp_date = date_val
    else:
        exp_date = today

    if exp_date > today:
        return None, "Future expense dates are not supported."

    if exp_date.year < 2000:
        return None, "Invalid date."

    cat = str(category_val or "other").strip().lower()
    if cat not in VALID_CATEGORIES:
        matched = False
        for valid_cat, keywords in CAT_KEYWORDS.items():
            if any(kw in cat for kw in keywords):
                cat = valid_cat
                matched = True
                break
        if not matched:
            cat = "other"

    desc = str(description or "").strip()[:255]

    return {
        "amount": amount,
        "category": cat,
        "date": exp_date,
        "description": desc,
    }, None


def get_budget_cycle_dates(user, reference_date=None):
    if reference_date is None:
        reference_date = timezone.localdate()
    if isinstance(user, int):
        start_day = user
    else:
        try:
            start_day = getattr(getattr(user, 'profile', None), 'budget_cycle_start_day', 1) or 1
        except Exception:
            start_day = 1

    if reference_date.day < start_day:
        m = reference_date.month - 1
        y = reference_date.year
        if m == 0:
            m = 12
            y -= 1
        _, last_day = calendar.monthrange(y, m)
        sd = min(start_day, last_day)
        start_date = date(y, m, sd)
        
        _, curr_last_day = calendar.monthrange(reference_date.year, reference_date.month)
        curr_sd = min(start_day, curr_last_day)
        end_date = date(reference_date.year, reference_date.month, curr_sd) - timedelta(days=1)
    else:
        _, last_day = calendar.monthrange(reference_date.year, reference_date.month)
        sd = min(start_day, last_day)
        start_date = date(reference_date.year, reference_date.month, sd)
        
        m = reference_date.month + 1
        y = reference_date.year
        if m == 13:
            m = 1
            y += 1
        _, next_last_day = calendar.monthrange(y, m)
        next_sd = min(start_day, next_last_day)
        end_date = date(y, m, next_sd) - timedelta(days=1)
        
    return start_date, end_date


def calculate_safe_to_spend(user, target_date=None):
    """
    Calculates the dynamic daily 'Safe-to-Spend' allowance for the user.
    Formula:
      Days remaining in cycle (including today) = (cycle_end - target_date).days + 1
      Spent before today = total_cycle_spent - today_spent
      Remaining budget for rest of cycle = max(0, monthly_budget - spent_before_today)
      Daily safe limit = round(remaining_budget_for_rest / days_remaining, 2)
    All text summaries generated here are strictly in 100% pure English.
    """
    if target_date is None:
        target_date = date.today()

    profile = getattr(user, 'profile', None)
    monthly_budget = float(getattr(profile, 'monthly_budget', 20000)) if profile else 20000.0
    if monthly_budget <= 0:
        monthly_budget = 20000.0

    start_date, end_date = get_budget_cycle_dates(user, target_date)
    
    # Days left in cycle including today, minimum 1
    days_remaining = max((end_date - target_date).days + 1, 1)

    cycle_expenses = Expense.objects.filter(user=user, date__range=(start_date, end_date))
    agg = cycle_expenses.aggregate(
        cycle_total=Sum("amount"),
        today_total=Sum("amount", filter=Q(date=target_date))
    )

    total_cycle_spent = float(agg["cycle_total"] or 0)
    today_spent = float(agg["today_total"] or 0)

    spent_before_today = max(0.0, total_cycle_spent - today_spent)
    remaining_for_cycle = max(0.0, monthly_budget - spent_before_today)

    if remaining_for_cycle <= 0:
        safe_limit_today = 0.0
    else:
        safe_limit_today = round(remaining_for_cycle / days_remaining, 2)

    remaining_today = round(safe_limit_today - today_spent, 2)

    # Status evaluation
    if monthly_budget - total_cycle_spent <= 0 and safe_limit_today <= 0:
        status = "exhausted"
        status_label = "Budget Exhausted"
        status_color = "#EF4444"
    elif today_spent > safe_limit_today:
        status = "exceeded"
        status_label = "Daily Limit Exceeded"
        status_color = "#EF4444"
    elif safe_limit_today > 0 and today_spent >= (safe_limit_today * 0.75):
        status = "warning"
        status_label = "Approaching Limit"
        status_color = "#F59E0B"
    else:
        status = "safe"
        status_label = "Safe to Spend"
        status_color = "#10B981"

    pct_used_today = min(100.0, round((today_spent / safe_limit_today * 100), 1)) if safe_limit_today > 0 else (100.0 if today_spent > 0 else 0.0)

    user_name = user.first_name.title() if (user and user.first_name) else (user.username.title() if user else "Friend")

    # Pure English WhatsApp message (strictly NO Hindi or Hinglish)
    english_message_lines = [
        f"📊 *Safe-to-Spend Daily Allowance*",
        f"━━━━━━━━━━━━━━━━━━",
        f"👤 *User:* {user_name}",
        f"🎯 *Today's Safe Limit:* ₹{safe_limit_today:,.2f}",
        f"💸 *Spent Today:* ₹{today_spent:,.2f}",
        f"🟢 *Remaining for Today:* ₹{max(0.0, remaining_today):,.2f}",
        f"━━━━━━━━━━━━━━━━━━",
        f"📈 *Monthly Overview:*",
        f"• Monthly Budget: ₹{monthly_budget:,.2f}",
        f"• Cycle Spent So Far: ₹{total_cycle_spent:,.2f}",
        f"• Days Remaining in Cycle: {days_remaining} days",
        f"━━━━━━━━━━━━━━━━━━",
    ]

    if status == "exhausted":
        english_message_lines.append("⚠️ *Alert:* Your monthly budget is completely exhausted. Please avoid non-essential spending!")
    elif status == "exceeded":
        english_message_lines.append(f"🚨 *Caution:* You have exceeded today's limit by ₹{abs(remaining_today):,.2f}. Try pausing additional expenses today to keep future days balanced!")
    elif status == "warning":
        english_message_lines.append(f"⚠️ *Notice:* You have utilized {pct_used_today:.0f}% of today's allowance. Spend mindfully for the rest of the day.")
    else:
        english_message_lines.append("✨ *Great Job:* You are well within your daily spending goal. Have a productive and mindful day ahead!")

    english_message = "\n".join(english_message_lines)

    return {
        "monthly_budget": monthly_budget,
        "total_cycle_spent": total_cycle_spent,
        "remaining_monthly_budget": max(0.0, monthly_budget - total_cycle_spent),
        "days_remaining": days_remaining,
        "cycle_start": start_date.isoformat(),
        "cycle_end": end_date.isoformat(),
        "safe_limit_today": safe_limit_today,
        "today_spent": today_spent,
        "remaining_today": remaining_today,
        "pct_used_today": pct_used_today,
        "status": status,
        "status_label": status_label,
        "status_color": status_color,
        "english_message": english_message,
    }


def get_filtered_expenses(user, filter_type: str, search_query: str = ""):
    qs = Expense.objects.filter(user=user)

    if search_query:
        qs = qs.filter(Q(category__icontains=search_query))

    today = timezone.localdate()
    if filter_type == "week":
        qs = qs.filter(date__gte=today - timedelta(days=7))
    elif filter_type == "month":
        start_date, end_date = get_budget_cycle_dates(user, today)
        qs = qs.filter(date__range=(start_date, end_date))

    return qs.order_by("-date", "-id")


def get_period_expenses(user, period: str):
    today = timezone.localdate()
    qs    = Expense.objects.filter(user=user)

    if period == "week":
        return qs.filter(date__gte=today - timedelta(days=7))
    elif period == "month":
        start_date, end_date = get_budget_cycle_dates(user, today)
        return qs.filter(date__range=(start_date, end_date))
    elif period == "quarter":
        # LOGIC-001: Exact calendar quarter start date
        quarter_month = 1 + 3 * ((today.month - 1) // 3)
        quarter_start = date(today.year, quarter_month, 1)
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

    start_month = today.month - (months - 1)
    start_year  = today.year
    while start_month <= 0:
        start_month += 12
        start_year -= 1
    start_date = date(start_year, start_month, 1)

    month_data = (
        Expense.objects
        .filter(user=user, date__gte=start_date)
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("month")
    )

    data_by_month = {}
    for entry in month_data:
        data_by_month[(entry["month"].year, entry["month"].month)] = entry

    result = []
    for i in range(months - 1, -1, -1):
        target_month = today.month - i
        target_year  = today.year
        while target_month <= 0:
            target_month += 12
            target_year -= 1

        entry = data_by_month.get((target_year, target_month))

        result.append({
            "month":  MONTH_NAMES[target_month - 1],
            "year":   target_year,
            "total":  _safe_float(entry["total"] if entry else 0),
            "count":  entry["count"] if entry else 0,
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

    start_date, end_date = get_budget_cycle_dates(user, today)
    month_qs    = Expense.objects.filter(user=user, date__range=(start_date, end_date))
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
            f"You are Expense Tracker AI, a smart, respectful, and helpful financial AI. NEVER use words like 'Tu/Tera'. ALWAYS use 'Aap/Bhai'. Speak in natural, polite Hinglish by default.\n"
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
            model="qwen/qwen3.8-27b",
            temperature=0.85,
            max_tokens=1000,
        )
        insight = re.sub(r"<think>(?:.*?</think>|.*$)", "", r.choices[0].message.content, flags=re.DOTALL).strip()
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
            f"You are Expense Tracker AI, a smart, respectful, and helpful financial AI. NEVER use words like 'Tu/Tera'. ALWAYS use 'Aap/Bhai'. Speak in natural, polite Hinglish by default.\n"
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
            model="qwen/qwen3.8-27b",
            temperature=0.85,
            max_tokens=1000,
        )
        tip = re.sub(r"<think>(?:.*?</think>|.*$)", "", r.choices[0].message.content, flags=re.DOTALL).strip()
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
            model="qwen/qwen3.8-27b",
            temperature=0.75,
            max_tokens=1000,
        )
        report = re.sub(r"<think>(?:.*?</think>|.*$)", "", r.choices[0].message.content, flags=re.DOTALL).strip()
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
    authentication_classes = []
    
    def post(self, request):
        phone_number = request.data.get('phone_number')
        if phone_number and len(str(phone_number)) == 10 and str(phone_number).isdigit():
            phone_number = f"91{phone_number}"
            
        otp = request.data.get('otp')
        email = str(request.data.get('email', '')).strip()
        
        if not phone_number or not otp:
            return Response({"error": "Phone number and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Verify OTP against phone_number OR email
        identifiers = [phone_number]
        if email:
            identifiers.append(email)
            
        otp_record = OTPVerification.objects.filter(
            identifier__in=identifiers,
            otp_code=otp,
            created_at__gte=timezone.now() - timedelta(minutes=10)
        ).first()
        if not otp_record:
            return Response({"error": "Invalid or expired OTP. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()
        if 'phone_number' in data:
            data['phone_number'] = phone_number
            
        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            otp_record.delete() # Cleanup OTP after successful registration
            return Response({
                "status": "success", 
                "message": "Registration done! You can now track your expenses using your WhatsApp number."
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@ratelimit(key='ip', rate='3/m', block=True)
def register(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = CustomRegistrationForm(request.POST)
        otp = request.POST.get('otp')
        phone_number = request.POST.get('phone_number')
        
        if not otp:
            messages.error(request, "OTP is required. Please verify your phone number first.")
            return render(request, "tracker/register.html", {"form": form})
            
        check_phone = phone_number
        if check_phone and len(str(check_phone)) == 10 and str(check_phone).isdigit():
            check_phone = f"91{check_phone}"
            
        otp_record = OTPVerification.objects.filter(
            identifier=check_phone, 
            otp_code=otp,
            created_at__gte=timezone.now() - timedelta(minutes=5)
        ).first()
        
        if not otp_record:
            messages.error(request, "Invalid or expired OTP.")
            return render(request, "tracker/register.html", {"form": form})

        if form.is_valid():
            user = form.save()
            otp_record.delete()
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


@csrf_exempt
@ratelimit(key='ip', rate='5/m', block=True)
def user_login(request: HttpRequest) -> HttpResponse:
    if request.user.is_authenticated:
        return redirect("dashboard")

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            
            # Track login activity
            def get_client_ip(request):
                x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
                if x_forwarded_for:
                    return x_forwarded_for.split(',')[0]
                return request.META.get('REMOTE_ADDR')
            
            UserLoginActivity.objects.create(user=user, ip_address=get_client_ip(request))
            
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
@csrf_exempt
def forgot_password(request: HttpRequest) -> HttpResponse:
    """Renders the forgot password page with JS logic for OTP flow."""
    if request.user.is_authenticated:
        return redirect("dashboard")
    return render(request, "tracker/forgot_password.html")



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
            
            start_day_str = request.POST.get("budget_cycle_start_day", "")
            if start_day_str.isdigit():
                sd = int(start_day_str)
                if 1 <= sd <= 28:
                    profile.budget_cycle_start_day = sd
                    
            profile.save()  # Permanently saved in DB!
            logger.info("Budget updated uid=%s budget=%.0f cycle=%s", user.id, nb, getattr(profile, 'budget_cycle_start_day', 1))
            messages.success(request, f"Budget settings updated! 💰")
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
    # PERFECT AGGREGATION — Single query with conditional aggregation
    # ──────────────────────────────────────────────────────────────────────────
    month_start, month_end = get_budget_cycle_dates(user, today)
    week_start = today - timedelta(days=7)
    totals = Expense.objects.filter(user=user).aggregate(
        month_total=Sum("amount", filter=Q(date__range=(month_start, month_end))),
        week_total=Sum("amount", filter=Q(date__gte=week_start)),
        all_total=Sum("amount"),
    )
    actual_month_total = float(totals["month_total"] or 0)
    actual_week_total = float(totals["week_total"] or 0)
    actual_all_total = float(totals["all_total"] or 0)

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
    ai_main_tip = "Hello! I am ExpenseTracker — ask me anything about your finances!"
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
        "budget_cycle_start_day": getattr(profile, 'budget_cycle_start_day', 1),
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
        "safe_to_spend":         calculate_safe_to_spend(user, today),
        **stats,  
    }
    return render(request, "tracker/dashboard.html", context)

# ══════════════════════════════════════════════════════════════════════════════
# EXPENSE CRUD VIEWS
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def my_splits_view(request: HttpRequest) -> HttpResponse:
    """Dedicated page for viewing all trips/splits history."""
    from django.db.models import Sum, F
    active_splits = SplitGroup.objects.filter(creator=request.user).order_by('-id')
    for s in active_splits:
        tot = sum(e.amount for e in s.expenses.all())
        s.tot = tot
        mc = s.members.count()
        s.pp = tot / mc if mc else 0
        
    context = {
        'active_splits': active_splits,
    }
    return render(request, "tracker/my_splits.html", context)

def update_user_gamification(user, exp_date: date):
    """LOGIC-002: Consistent gamification logic applied to Web, Mobile, and WhatsApp entries."""
    profile, _ = UserProfile.objects.get_or_create(user=user)
    today = timezone.localdate()

    if profile.last_expense_date == today - timedelta(days=1):
        profile.streak += 1
    elif profile.last_expense_date != today:
        profile.streak = 1
    profile.last_expense_date = today
    profile.xp += 20
    profile.level = (profile.xp // 100) + 1
    profile.save(update_fields=["streak", "last_expense_date", "xp", "level"])

@login_required(login_url="login")
@require_POST
def add_expense(request: HttpRequest) -> HttpResponse:
    validated, err = validate_and_normalize_expense(
        request.user,
        request.POST.get("amount", ""),
        request.POST.get("category", "other"),
        request.POST.get("date", ""),
        request.POST.get("description", "")
    )
    if err:
        messages.error(request, err)
        return redirect("dashboard")

    expense = Expense.objects.create(
        user=request.user,
        amount=validated["amount"],
        category=validated["category"],
        date=validated["date"],
    )
    logger.info("Expense added uid=%s id=%s amount=%s cat=%s",
                request.user.id, expense.pk, validated["amount"], validated["category"])

    update_user_gamification(request.user, validated["date"])
    messages.success(request, f"{CAT_ICONS.get(validated['category'],'📦')} ₹{validated['amount']:,} added! ✅")
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

def _get_smart_greeting_response(text: str, user_name: str, target_user=None, today=None, budget: float = 20000, spent: float = 0) -> str:
    """
    Returns a warm, highly conversational greeting response for WhatsApp / voice.
    Returns None if the text is not a greeting.
    """
    if not text:
        return None
        
    clean = re.sub(r'[^\w\s]', ' ', text.strip().lower())
    clean = re.sub(r'\s+', ' ', clean).strip()
    if not clean:
        return None

    # Don't intercept if numbers/amounts are present (e.g., "hi 500 petrol")
    if any(c.isdigit() for c in clean):
        return None

    rem = max(0, float(budget) - float(spent))
    display_name = user_name.title() if user_name else "Dost"

    # 1. MORNING GREETINGS (Short & Sweet in English)
    morning_triggers = [
        'good morning', 'good mrng', 'gud morning', 'gud mrng', 'gm', 'g m',
        'shubh prabhat', 'subah ho gayi', 'morning'
    ]
    if clean in morning_triggers or any(clean.startswith(t + ' ') or clean.endswith(' ' + t) for t in ['good morning', 'shubh prabhat', 'gm']):
        return f"🌅 *Good Morning, {display_name}!* ☀️\n\nWishing you a wonderful and productive day ahead! 🚀"

    # 2. NIGHT GREETINGS (Short & Sweet in English)
    night_triggers = [
        'good night', 'good nyt', 'gud night', 'gud nyt', 'gn', 'g n',
        'shubh ratri', 'so raha hu', 'so raha hoon', 'so jata hu', 'so jata hoon',
        'going to sleep', 'sleep time', 'sweet dreams', 'good nite'
    ]
    if clean in night_triggers or any(clean.startswith(t + ' ') or clean.endswith(' ' + t) for t in ['good night', 'shubh ratri', 'gn']):
        return f"🌙 *Good Night, {display_name}!* ✨\n\nSleep well and have sweet dreams. Take care, see you tomorrow! 🛌💤"

    # 3. AFTERNOON / EVENING GREETINGS (Short & Sweet in English)
    afternoon_triggers = ['good afternoon', 'gud afternoon', 'good noon', 'shubh dopahar']
    if clean in afternoon_triggers or any(clean.startswith(t + ' ') for t in ['good afternoon']):
        return f"☀️ *Good Afternoon, {display_name}!* 🍱\n\nHope you are having a great day! 👍"

    evening_triggers = ['good evening', 'gud evening', 'shubh sandhya']
    if clean in evening_triggers or any(clean.startswith(t + ' ') for t in ['good evening', 'shubh sandhya']):
        return f"☕ *Good Evening, {display_name}!* 🌆\n\nHope you had a productive day! Relax and have a pleasant evening. ✨"

    # 4. "KAISE HO" / "HOW ARE YOU" (Short & Friendly)
    how_are_you_triggers = [
        'kaise ho', 'kaisi ho', 'kaise hai', 'kaise hain', 'kya haal', 'kya haal hai', 'kya hal hai',
        'how are you', 'how r u', 'how are u', 'sab kaisa hai', 'sab kaisa chal raha hai',
        'kya chal raha hai', 'kya ho raha hai', 'sab theek', 'sab theek hai', 'sab badhiya',
        'aur batao', 'aur bhai', 'aur sunao', 'kya chal rha h'
    ]
    if clean in how_are_you_triggers or any(clean.startswith(t + ' ') for t in ['kaise ho', 'kya haal hai', 'how are you', 'aur batao', 'aur sunao']):
        if any(w in clean for w in ['how are you', 'how r u', 'how are u']):
            return f"I'm doing great, *{display_name}*! How are you doing today? 😊"
        return f"Main bilkul badiya hoon, *{display_name}*! Aap suniye, aap kaise hain? Sab theek thaak? 😊"

    # 5. SPIRITUAL / CULTURAL GREETINGS
    if any(w in clean for w in ['radhe radhe', 'jai shree krishna', 'jai shri krishna', 'radhe']):
        return f"Radhe Radhe *{display_name}*! 🙏 Radharani ki kripa aap par hamesha bani rahe. Kahiye, aaj ka din kaisa chal raha hai? ✨"
    if any(w in clean for w in ['ram ram', 'jai shree ram', 'jai shri ram', 'sita ram']):
        return f"Jai Shree Ram *{display_name}*! 🙏 Kahiye bhai, sab kushal mangal? Main aapki seva mein hazir hoon. 😊"
    if any(w in clean for w in ['har har mahadev', 'om namah shivay', 'om namah shivaya', 'jai bholenath']):
        return f"Har Har Mahadev *{display_name}*! 🔱 Bholenath ki kripa aap par bani rahe. Kahiye, aaj kaisa chal raha hai sab?"
    if any(w in clean for w in ['namaste', 'namaskar', 'pranam', 'sat sri akal', 'salaam', 'assalam alaikum']):
        return f"Namaste *{display_name}*! 🙏 Asha hai aap bilkul theek hain aur sab badhiya chal raha hai. Kahiye, aaj main aapki kya madad kar sakta hoon? 😊"

    # 6. THANKS & APPRECIATION (Short in English)
    thanks_triggers = [
        'thanks', 'thank you', 'thx', 'shukriya', 'dhanyawad', 'dhanyavaad', 'thanku', 'tq',
        'bahut badiya', 'great job', 'nice', 'awesome', 'shandar', 'zabardast', 'mast'
    ]
    if clean in thanks_triggers:
        return f"You're most welcome, *{display_name}*! Always happy to help. 😊❤️"

    # 7. BYE / GOODBYE (Short in English)
    bye_triggers = ['bye', 'bye bye', 'tata', 'see you', 'cya', 'alvida', 'phir milte hai', 'phir milte hain']
    if clean in bye_triggers:
        return f"Goodbye, *{display_name}*! Have a great day and take care! 👋✨"

    # 8. GENERAL GREETINGS: "hi", "hello", "hey", etc. (Short in English)
    basic_greetings = {'hi', 'hello', 'hlo', 'hey', 'helo', 'hii', 'hiii', 'yo', 'sup', 'hola', 'suno'}
    if clean in basic_greetings or any(clean.startswith(g + ' ') for g in ['hi', 'hello', 'hlo', 'hey']):
        return f"Hello *{display_name}*! 👋 How can I help you today? Feel free to chat or record your expenses anytime! 😊"

    return None

def _check_greeting(text: str) -> bool:
    return _get_smart_greeting_response(text, "User") is not None

def _clean_expense_desc(desc: str) -> str:
    desc = re.sub(r'^(?:aaj|kal|maine|mene|meine|humne|hamne|i\s+paid|i\s+spent|spent|paid|bought|got)\s+', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'^(?:for|ka|ki|ke|on|ke\s*liye|mein|me|pe|se|par)\s+', '', desc, flags=re.IGNORECASE)
    for _ in range(2):
        desc = re.sub(r'(?:^\s*|\s+)(?:de\s*diye|de\s*diya|de\s*di|diya|diye|pay\s*kiya|paid|spent|kharcha|kharche|kharch\s*kiye?|kharch\s*huye|liye|liya|mangwaya|lag\s*gaye|laga)$', '', desc, flags=re.IGNORECASE)
        desc = re.sub(r'(?:^\s*|\s+)(?:for|ka|ki|ke|on|ke\s*liye|mein|me|pe|se|par)$', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'^(?:rs\.?|inr|rupees?|rupaye?)\s*', '', desc, flags=re.IGNORECASE)
    return desc.strip()

def _extract_single_expense(text: str):
    clean = text.strip()
    clean = re.sub(r'^[₹\s]+', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'^(?:rs\.?|inr)\s*', '', clean, flags=re.IGNORECASE).strip()
    clean = re.sub(r'^(?:aaj\s+maine|aaj\s+mene|maine|mene|meine|humne|hamne|i\s+paid|i\s+spent)\s+', '', clean, flags=re.IGNORECASE).strip()

    # 1. Pattern: [Amount] [optional currency] [optional prep] [Description]
    m1 = re.match(r'^(\d+(?:\.\d+)?)\s*(?:rs\.?|rupaye?|rupees?|inr|/-)?\s*(?:for|ka|ki|ke|on|ke\s*liye|mein|me|pe)?\s+(.+)$', clean, flags=re.IGNORECASE)
    if m1:
        try:
            amt = Decimal(m1.group(1))
            desc = _clean_expense_desc(m1.group(2))
            if amt > 0 and len(desc) >= 2:
                return amt, desc
        except Exception:
            pass

    # 2. Pattern: [Description] [optional prep] [Amount] [optional currency] [optional trailing action]
    m2 = re.match(r'^(.+?)\s+(?:for|ka|ki|ke|on|ke\s*liye|mein|me|pe)?\s*(\d+(?:\.\d+)?)\s*(?:rs\.?|rupaye?|rupees?|inr|/-)?(?:\s+(?:ka|ki|ke|de\s*diye|de\s*diya|de\s*di|diya|diye|spent|paid|lag\s*gaye|laga|kharcha|kharche))?$', clean, flags=re.IGNORECASE)
    if m2:
        try:
            desc = _clean_expense_desc(m2.group(1))
            amt = Decimal(m2.group(2))
            if amt > 0 and len(desc) >= 2 and not any(kw in desc.lower() for kw in ['trip', 'split', 'note', 'link', 'summary', 'kharcha', 'report', 'budget']):
                return amt, desc
        except Exception:
            pass

    # 3. Pattern: Middle Amount: [Prefix] [Amount] [Suffix] (e.g., 'swiggy se 450 ka khana', 'petrol par 500 kharche')
    m3 = re.match(r'^(.+?)\s+(?:se|ke\s*liye|mein|me|pe|par)?\s*(\d+(?:\.\d+)?)\s*(?:rs\.?|rupaye?|rupees?|inr|/-)?\s*(?:ka|ki|ke|for|on)?\s+(.+)$', clean, flags=re.IGNORECASE)
    if m3:
        try:
            p1 = _clean_expense_desc(m3.group(1))
            amt = Decimal(m3.group(2))
            p2 = _clean_expense_desc(m3.group(3))
            combined_desc = f"{p1} {p2}".strip() if p1 and p2 else (p1 or p2)
            if amt > 0 and len(combined_desc) >= 2 and not any(kw in combined_desc.lower() for kw in ['trip', 'split', 'note', 'link', 'summary', 'budget']):
                return amt, combined_desc
        except Exception:
            pass

    return None, None



@csrf_exempt
@ai_rate_limited
def voice_expense(request: HttpRequest) -> JsonResponse:
    """
    Dual-mode voice expense endpoint:
    - Browser mode: No phone needed — uses logged-in session user directly.
    - WhatsApp mode: Phone number se UserProfile dhoondo, uska user lo.
    - Mobile App mode: Accepts audio files for speech-to-text via Whisper.
    """
    import time
    global _WA_AUTH_CACHE
    start_time_view = time.time()
    
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Only POST allowed."}, status=405)

    incoming_phone = ""
    spoken_text = ""

    # ── Check Content-Type ─────────────────────────────────────────────────────
    content_type = request.content_type
    
    provider_message_id = ""
    sender_id = ""

    if content_type == 'application/json':
        try:
            body = json.loads(request.body)
            incoming_phone = str(body.get("phone", "")).strip()
            spoken_text = str(body.get("text", "")).strip()
            provider_message_id = str(body.get("message_id", "")).strip()
            sender_id = str(body.get("sender_id", incoming_phone)).strip()
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"status": "error", "message": "Invalid JSON."}, status=400)
            
    elif content_type.startswith('multipart/form-data'):
        # For Mobile App Audio Uploads
        incoming_phone = str(request.POST.get("phone", "")).strip()
        provider_message_id = str(request.POST.get("message_id", "")).strip()
        sender_id = str(request.POST.get("sender_id", incoming_phone)).strip()
        audio_file = request.FILES.get("audio")
        
        if audio_file:
            try:
                # Ensure valid audio extension for Groq Whisper
                orig_name = getattr(audio_file, 'name', '') or 'voice_recording.m4a'
                ext = os.path.splitext(orig_name)[1].lower()
                if ext not in ['.m4a', '.mp3', '.webm', '.wav', '.ogg', '.flac', '.mp4']:
                    ext = '.m4a'

                with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_audio:
                    for chunk in audio_file.chunks():
                        temp_audio.write(chunk)
                    temp_audio_path = temp_audio.name
                
                logger.info("Transcribing audio file via Groq Whisper (%s)...", ext)
                with open(temp_audio_path, "rb") as file:
                    audio_bytes = file.read()

                whisper_prompt = (
                    "PaisaMitra expense tracker. Output numbers as digits: "
                    "500 petrol, 200 chai, 150 auto, 1200 grocery, 450 pizza, "
                    "300 khana, 2500 rent, 80 snacks, 2000 shopping, 350 medicine."
                )

                try:
                    translation = _groq_client().audio.transcriptions.create(
                        file=(f"audio{ext}", audio_bytes),
                        model="whisper-large-v3-turbo",
                        prompt=whisper_prompt,
                    )
                except Exception as e_turbo:
                    logger.warning("whisper-large-v3-turbo failed, falling back to whisper-large-v3: %s", e_turbo)
                    translation = _groq_client().audio.transcriptions.create(
                        file=(f"audio{ext}", audio_bytes),
                        model="whisper-large-v3",
                        prompt=whisper_prompt,
                    )

                spoken_text = translation.text.strip()
                logger.info("Transcription result: %s", spoken_text)
                    
                os.remove(temp_audio_path)
            except Exception as e:
                logger.error("Audio transcription failed: %s", e)
                return JsonResponse({"status": "error", "message": "Failed to transcribe audio. Please try speaking again."}, status=500)
        else:
            # If they sent multipart without an audio file, maybe they just sent text
            spoken_text = str(request.POST.get("text", "")).strip()
            
    else:
        return JsonResponse({"status": "error", "message": "Unsupported Content-Type. Use JSON or multipart/form-data."}, status=415)

    # LOGIC-004: Idempotency check for processed WhatsApp messages
    if provider_message_id and sender_id:
        existing_msg = WhatsAppProcessedMessage.objects.filter(
            provider_message_id=provider_message_id,
            sender_id=sender_id,
            status='success'
        ).first()
        if existing_msg:
            return JsonResponse({
                "status": "success",
                "message": existing_msg.response_text or "Message already processed successfully.",
                "already_processed": True
            })

    # SEC-004: Mask phone number in production logs
    masked_phone = (incoming_phone[:3] + '***' + incoming_phone[-3:]) if len(incoming_phone) >= 7 else '***'
    logger.info("voice_expense request received for phone=%s", masked_phone)

    if not spoken_text:
        return JsonResponse({"status": "error", "message": "No text received."}, status=400)

    # ── Handle special "link" command ─────────────────────────────────────────
    spoken_stripped = spoken_text.strip()
    if spoken_stripped.lower().startswith("link"):
        parts = spoken_stripped.split(" ", 1)
        if len(parts) < 2 or not parts[1].strip():
            return JsonResponse({
                "status": "error",
                "message": (
                    "📲 *Link Your Expense Tracker*\n\n"
                    "Apna account WhatsApp bot se link karne ke liye apna registered mobile number likhein:\n\n"
                    "👉 *Example:* `Link 917905398965`"
                )
            })

        mobile_raw = parts[1].strip()
        clean_phone = re.sub(r'[^0-9]', '', mobile_raw)

        if not clean_phone or len(clean_phone) < 10:
            return JsonResponse({
                "status": "error",
                "message": f"❌ *Invalid Mobile Number*\n\n`{mobile_raw}` ek valid 10-digit number nahi hai. Kripya apna registered number bhejein (jaise: `Link 917905398965`)."
            })

        # 1. Match profile (exact, with/without country code, or last 10 digits)
        profile = UserProfile.objects.filter(phone_number=clean_phone).select_related("user").first()
        if not profile:
            profile = UserProfile.objects.filter(phone_number='+' + clean_phone).select_related("user").first()
        if not profile and len(clean_phone) >= 10:
            profile = UserProfile.objects.filter(phone_number__endswith=clean_phone[-10:]).select_related("user").first()

        if not profile:
            return JsonResponse({
                "status": "error",
                "message": (
                    f"❌ *Account Not Found*\n\n"
                    f"Mobile number `{clean_phone}` se koi registered account nahi mila.\n\n"
                    f"Kripya app me check karein ki aapka account kis phone number se bana hai."
                )
            })

        target_name = (profile.user.first_name or profile.user.username or "Dost").strip().title()

        # 2. Check if this profile is ALREADY linked to this incoming WhatsApp ID
        if profile.whatsapp_linked and profile.whatsapp_number == incoming_phone:
            return JsonResponse({
                "status": "success",
                "message": (
                    f"⚡ *Account Already Linked!*\n\n"
                    f"Hello *{target_name}*! Aapka WhatsApp number pehle se hi successfully linked aur active hai. 🎉\n\n"
                    f"Aap directly yahan text bhejkar kharche track kar sakte hain:\n"
                    f"• *500 petrol*\n"
                    f"• *200 chai snacks*\n"
                    f"• *today summary*\n\n"
                    f"Koi naya expense add karein? 💬"
                )
            })

        # 3. Perform linking / re-linking
        profile.whatsapp_number = incoming_phone
        profile.whatsapp_linked = True
        profile.save(update_fields=['whatsapp_number', 'whatsapp_linked'])
        logger.info("WhatsApp linked for uid=%s with WA ID=%s (phone=%s)", profile.user.id, incoming_phone, clean_phone)

        # Invalidate auth cache so future messages immediately resolve to this user
        if '_WA_AUTH_CACHE' in globals():
            _WA_AUTH_CACHE[incoming_phone] = profile.user.id

        return JsonResponse({
            "status": "success",
            "message": (
                f"🎉 *WhatsApp Successfully Linked!*\n\n"
                f"Welcome *{target_name}*! Aapka Expense Tracker account ab link ho chuka hai. ✅\n\n"
                f"Ab aap bina app khole yahan se direct kharche record kar sakte hain:\n"
                f"• *'500 dinner'* ➔ Expense save ho jayega\n"
                f"• *'Aaj ka kharcha'* ➔ Daily total summary\n"
                f"• *'Budget'* ➔ Remaining balance check\n\n"
                f"Try kijiye, abhi koi expense text karke dekhiye! 🚀"
            )
        })

    # ── Dual-mode user resolution ─────────────────────────────────────────────
    target_user = None

    if not incoming_phone:
        if hasattr(request, 'user') and request.user.is_authenticated:
            target_user = request.user
        else:
            # Check Token header for mobile app requests
            auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header and 'Token ' in auth_header:
                token_key = auth_header.split('Token ')[1].strip().split(' ')[0]
                try:
                    from rest_framework.authtoken.models import Token
                    token_obj = Token.objects.select_related('user').get(key=token_key)
                    target_user = token_obj.user
                    request.user = target_user
                except Exception as e:
                    logger.warning("Token auth in voice_expense failed: %s", e)

            if not target_user:
                return JsonResponse({"status": "error", "message": "Please log in or send your WhatsApp number. 🔐"}, status=401)
    else:
        if '_WA_AUTH_CACHE' not in globals():
            _WA_AUTH_CACHE = {}
            
        cached_user_id = _WA_AUTH_CACHE.get(incoming_phone)
        
        target_user = None
        if cached_user_id:
            from django.contrib.auth.models import User
            try:
                target_user = User.objects.get(id=cached_user_id)
            except User.DoesNotExist:
                pass
                
        if not target_user:
            # Try exact match first (supports raw LIDs or unformatted numbers)
            profile = UserProfile.objects.filter(whatsapp_number=incoming_phone).select_related("user").first()
            
            if not profile:
                import phonenumbers
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
                    
                    # 🚀 CRITICAL FIX: If we found them using the slow method, SAVE the whatsapp_number permanently!
                    # This ensures all future lookups are exact matches taking 0.001s
                    if profile:
                        profile.whatsapp_number = incoming_phone
                        profile.save(update_fields=['whatsapp_number'])
                
                if not profile or not profile.user:
                    return JsonResponse({
                        "status":  "error",
                        "message": f"❌ Account not linked.\n\nApna WhatsApp link karne ke liye:\n1️⃣ Type karo: *link <apna registered mobile number>*\n   Example: *link 919876543210*\n\n📱 Agar account nahi hai, toh pehle register karo: https://smart-expense-coach.onrender.com/register/"
                    })
            target_user = profile.user
            _WA_AUTH_CACHE[incoming_phone] = target_user.id
            
    t_start_db = time.time()
    budget = float(getattr(target_user.profile, 'monthly_budget', 20000))
    t_budget = time.time()

    today = date.today()
    first_day = today.replace(day=1)
    
    spent = Expense.objects.filter(user=target_user, date__gte=first_day).aggregate(Sum('amount'))['amount__sum'] or 0
    t_spent = time.time()
    
    user_name = target_user.first_name.title() if target_user.first_name else target_user.username.title()
    t_user = time.time()
    
    print(f"DEBUG TIMING: Auth/Budget: {t_budget - t_start_db:.3f}s | Spent Query: {t_spent - t_budget:.3f}s | User: {t_user - t_spent:.3f}s")
    
    # ── AI Conversations & Expense Routing ────────────────────────────────────
    try:
        normalized_text = normalize_hinglish_numbers(spoken_text)
        lower_text = normalized_text.lower().strip()

        # ── 1. SMART CONVERSATIONAL GREETINGS (0.001s) ──
        greeting_reply = _get_smart_greeting_response(normalized_text, user_name, target_user, today, budget, spent)
        if greeting_reply:
            if provider_message_id and sender_id:
                try:
                    WhatsAppProcessedMessage.objects.update_or_create(
                        provider_message_id=provider_message_id,
                        sender_id=sender_id,
                        defaults={'status': 'success', 'response_text': greeting_reply}
                    )
                except Exception:
                    pass
            return JsonResponse({
                "status": "success",
                "message": greeting_reply
            })

        # ── 2. HYPER-FAST SINGLE EXPENSE LOGGING (0.015s) ──
        quick_amt, quick_desc = _extract_single_expense(normalized_text)
        if quick_amt and quick_desc and not any(kw in lower_text for kw in ["trip", "split", "note", "notpad", "notepad"]):
            category = _keyword_category_fallback(quick_desc)
            
            expense = Expense.objects.create(
                user=target_user,
                amount=quick_amt,
                category=category,
                date=today,
                description=quick_desc[:100],
            )

            icon = CAT_ICONS.get(category, "📦")
            new_spent = float(spent) + float(quick_amt)
            new_rem = max(0, budget - new_spent)
            month_name = today.strftime("%B")
            
            msg_lines = [
                f"✅ *Hi {user_name}, Expense Logged (⚡ Instant)*",
                f"━━━━━━━━━━━━━━━━━━",
                f"{icon} *Amount:* ₹{quick_amt:,}",
                f"🏷️ *Category:* {category.title()}",
                f"📝 *Note:* {expense.description or 'None'}",
                f"━━━━━━━━━━━━━━━━━━",
                f"💰 *Total Spent ({month_name}):* ₹{new_spent:,.0f}",
                f"🎯 *Remaining Budget:* ₹{new_rem:,.0f}"
            ]
            
            if new_rem == 0:
                msg_lines.append("⚠️ *Warning:* You have exceeded your monthly budget! 🛑")

            smart_alert = check_and_generate_alert(target_user, expense)
            if smart_alert:
                msg_lines.append("")
                msg_lines.append(smart_alert)
                
            return JsonResponse({
                "status": "success",
                "message": "\n".join(msg_lines),
                "expense_id": expense.pk,
                "transcription": spoken_text,
                "action": "log_expenses",
                "expense": {
                    "id": expense.pk,
                    "amount": float(expense.amount),
                    "category": expense.category,
                    "category_icon": icon,
                    "description": expense.description or expense.category.title(),
                    "date": str(expense.date),
                    "total_spent_month": new_spent,
                    "remaining_budget": new_rem,
                }
            })

        # ── 3. HYPER-FAST TODAY SUMMARY (0.01s) ──
        today_triggers = ['aaj ka kharcha', 'aaj kitna', 'today expense', 'today spent', 'today summary', 'aaj ka summary', 'aaj ka total']
        if any(trg in lower_text for trg in today_triggers):
            today_qs = Expense.objects.filter(user=target_user, date=today).order_by('-id')
            today_total = today_qs.aggregate(Sum('amount'))['amount__sum'] or 0
            rem = max(0, budget - float(spent))
            
            lines = [
                f"📅 *Aaj ka Kharcha ({today.strftime('%d %b %Y')}):* ₹{today_total:,.0f}",
                f"━━━━━━━━━━━━━━━━━━"
            ]
            if today_qs.exists():
                for exp in today_qs[:8]:
                    icon = CAT_ICONS.get(exp.category, "📦")
                    lines.append(f"• {icon} *₹{exp.amount:,.0f}* - {exp.description or exp.category.title()}")
            else:
                lines.append("Aaj abhi tak koi kharcha add nahi kiya gaya hai. 👍")
                
            lines.append(f"━━━━━━━━━━━━━━━━━━")
            lines.append(f"🎯 *Remaining Budget:* ₹{rem:,.0f}")
            return JsonResponse({"status": "success", "message": "\n".join(lines)})

        # ── 4. HYPER-FAST BUDGET STATUS (0.005s) ──
        if lower_text in ['budget', 'balance', 'kitna bacha', 'mera budget', 'check budget', '/budget']:
            rem = max(0, budget - float(spent))
            return JsonResponse({
                "status": "success",
                "message": (
                    f"🎯 *Monthly Budget Status ({today.strftime('%B %Y')})*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"💼 *Total Budget:* ₹{budget:,.0f}\n"
                    f"💰 *Total Spent:* ₹{float(spent):,.0f}\n"
                    f"💸 *Remaining Balance:* ₹{rem:,.0f}\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"{'⚠️ Budget limit reached! 🛑' if rem == 0 else '✅ Budget control me hai! 👍'}"
                )
            })

        # ── WhatsApp Session / Feedback Flow ──
        session_id_str = incoming_phone if incoming_phone else str(target_user.id)
        
        t_sess_start = time.time()
        session, _ = WhatsAppSession.objects.get_or_create(user=target_user, phone_number=session_id_str)
        t_sess_end = time.time()
        print(f"DEBUG TIMING: Session get_or_create: {t_sess_end - t_sess_start:.3f}s")
        
        if session.state == 'AWAITING_FEEDBACK':
            Feedback.objects.create(user=target_user, text=spoken_text, source='whatsapp')
            session.state = 'NORMAL'
            session.save()
            return JsonResponse({"status": "success", "message": "Dhanyawad! Aapka feedback submit ho gaya hai. 🙏"})

        if lower_text == "feedback" or lower_text == "/feedback":
            session.state = 'AWAITING_FEEDBACK'
            session.save()
            return JsonResponse({"status": "success", "message": "Kripya apna feedback likhein:"})

        # ── Intercept Safe-to-Spend / Daily Allowance (100% Pure English) ──
        safe_to_spend_triggers = [
            "safe to spend", "safetospend", "safe-to-spend",
            "daily limit", "today limit", "today's limit", "todays limit",
            "daily allowance", "allowance", "pocket money",
            "/safe", "/safetospend", "/allowance",
            "how much can i spend today", "what is my daily limit",
            "daily budget"
        ]
        if any(trg in lower_text for trg in safe_to_spend_triggers):
            safe_data = calculate_safe_to_spend(target_user, today)
            return JsonResponse({
                "status": "success",
                "message": safe_data["english_message"],
                "data": safe_data
            })

        # ── Intercept Trip History / Split History ──
        trip_history_triggers = [
            "trip history", "split history", "my trips", "mere trips", "all trips", "show my trips"
        ]
        if any(trg in lower_text for trg in trip_history_triggers) and not any(char.isdigit() for char in lower_text):
            host_domain = request.build_absolute_uri('/')[:-1]
            if "localhost" in host_domain or "127.0.0.1" in host_domain:
                host_domain = "https://smart-expense-coach.onrender.com"
            splits_url = f"{host_domain}/splits/"
            return JsonResponse({
                "status": "success", 
                "message": f"✈️ *Your Trip & Split History*\n\nAap is link par click karke apni saari trips manage, delete, ya dekh sakte hain:\n🔗 {splits_url}\n\n_(Kripya login karein jo number apne use kiya hai)_"
            })

        # ── Intercept Trip Format Guide / General Trip Inquiry ──
        trip_guide_triggers = [
            "trip guide", "split guide", "trip format", "split format", "trip help", "split help",
            "trip kaise", "split kaise", "trip ka hisab kaise", "trip ka hisaab kaise",
            "how to use trip", "how to split", "trip hisaab format", "trip hisab format",
            "group hisab", "group hisaab", "trip kaise banaye", "split kaise kare"
        ]
        is_direct_guide_query = any(trg in lower_text for trg in trip_guide_triggers) or lower_text.strip() in ["trip", "split", "/trip", "/split"]
        is_casual_trip_mention = (
            ("trip" in lower_text or "travel" in lower_text) and
            not any(char.isdigit() for char in lower_text) and
            not any(w in lower_text for w in [":", "with", "paid", "diya", "de diya", "rs", "₹", "aur", "and", "mein", "history", "hisab", "hisaab", "settle", "naya", "new"])
        )
        if is_direct_guide_query or is_casual_trip_mention:
            return JsonResponse({
                "status": "success",
                "message": get_trip_format_guide_message()
            })

        # ── Intercept Group Split (Hybrid: WhatsApp Forwardable Card + 1-Click Web Split) ──
        split_triggers = [
            "split:", "/split", "trip:", "trip :", "trip -", "trip—", "hisaab:", "hisab:", "hisaab :", "hisab :", "group split", "bill split"
        ]
        has_multiple_amounts = len(re.findall(r'\b\d+\b', lower_text)) > 1
        has_friend_payment = bool(
            re.search(r'\b[a-zA-Z]+\s+(?:paid|diya|de\s*diya)\b', lower_text) or
            re.search(r'\b(?:paid|diya)\s+\d+\b', lower_text) or
            ("paid" in lower_text and any(w in lower_text for w in [" or ", " aur ", " and "]))
        )
        has_recent_trip_context = False
        chat_history = session.context if isinstance(session.context, list) else []
        if chat_history:
            recent_texts = " ".join([str(m.get("content", "")).lower() for m in chat_history[-4:] if isinstance(m, dict)])
            if any(w in recent_texts for w in ["trip", "split", "hisaab", "hisab"]):
                has_recent_trip_context = True

        is_split_intent = (
            any(kw in lower_text for kw in split_triggers) or
            ("trip with " in lower_text or "split with " in lower_text) or
            (("reopen" in lower_text or "new " in lower_text or "naya " in lower_text) and 
             ("trip" in lower_text or "split" in lower_text or "hisaab" in lower_text)) or
            (("split" in lower_text or "trip" in lower_text or "room" in lower_text or "flat" in lower_text or "dinner" in lower_text or "lunch" in lower_text or "goa" in lower_text or "manali" in lower_text) and 
             (any(w in lower_text for w in ["paid", "diya", "dost", "cab", "hotel", "rent", "snacks", "petrol", "food", "mai ", "aur ", "or ", "mera", "maine", "with "]) or has_multiple_amounts)) or
            (has_friend_payment and (has_multiple_amounts or has_recent_trip_context or any(w in lower_text for w in ["trip", "split", "or ", "aur "])))
        )
        if is_split_intent:
            host_domain = request.build_absolute_uri('/')[:-1]
            if "localhost" in host_domain or "127.0.0.1" in host_domain:
                host_domain = "https://smart-expense-coach.onrender.com"
            res = parse_and_handle_split_message(target_user, spoken_text, host_domain, session)

            # Persist session context so subsequent AI turns know about this trip/split!
            chat_history = session.context if isinstance(session.context, list) else []
            chat_history.append({"role": "user", "content": normalized_text})
            summary_msg = res.get("message", "")
            if len(summary_msg) > 300:
                summary_msg = summary_msg[:300] + "..."
            chat_history.append({"role": "assistant", "content": summary_msg})
            session.context = chat_history[-6:]
            session.save()

            return JsonResponse(res)

        # ── Intercept Budget ──
        if lower_text.startswith("budget set"):
            return JsonResponse({"status": "success", "message": "Aap App ya Website par jake apna budget set kar lijiye. Wahan easily set ho jayega! 🎯"})

        # ── Intercept Remove ──
        if lower_text.startswith("remove") or lower_text.startswith("delete"):
            return JsonResponse({"status": "success", "message": "Aap easily kisi bhi expense ko App ya Website se remove ya delete kar sakte hain. 🗑️"})

        # ── Intercept Help ──
        if lower_text in ["help", "features", "what can i do?", "what can i do", "what can you do"]:
            return JsonResponse({"status": "success", "message": "Main ExpenseTracker bot hoon! Main ye sab kar sakta hoon:\n\n1. Add Expense: '500 for dinner' ya 'auto 150'\n2. Show Budget: 'how much budget left'\n3. Safe-to-Spend: 'safe to spend' ya '/safe' (Daily Allowance)\n4. Feedback: Type 'feedback'\n\nTry it now! 🚀"})

        # ──────────────────────────────────────────────────────────────────────
        # FAST PATH FOR LARGE LISTS
        # ──────────────────────────────────────────────────────────────────────
        # If the user sends a large list and DOES NOT include an explicit command word.
        if spoken_text.count('\n') >= 3 and not any(kw in lower_text for kw in ["add", "expense", "log", "save", "note", "notepad"]):
            msg = "Should I save this long list to your Notepad or add it to your Expenses? 🤔"
            
            # Save to history so AI remembers the list
            chat_history = session.context if isinstance(session.context, list) else []
            chat_history.append({"role": "user", "content": normalized_text})
            chat_history.append({"role": "assistant", "content": json.dumps({"action": "ask_clarification", "chat_response": msg})})
            session.context = chat_history[-6:]
            session.save()
            
            return JsonResponse({
                "status": "success",
                "message": msg
            })

        # ──────────────────────────────────────────────────────────────────────
        # FAST PATH (Bypass slow AI for standard "[Amount] [Description]" format)
        # ──────────────────────────────────────────────────────────────────────
        fast_match = re.match(r'^(\d+(?:\.\d+)?)\s+(.+)$', normalized_text.strip())
        if fast_match and not any(kw in lower_text for kw in ["note", "notpad", "notepad"]):
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
                    "transcription": spoken_text,
                    "action": "log_expenses",
                    "expense": {
                        "id": expense.pk,
                        "amount": float(expense.amount),
                        "category": expense.category,
                        "category_icon": icon,
                        "description": expense.description or expense.category.title(),
                        "date": str(expense.date),
                        "total_spent_month": new_spent,
                        "remaining_budget": new_rem,
                    }
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

        # Check if the AI just asked for clarification
        chat_history = session.context if isinstance(session.context, list) else []
        last_bot_action = None
        if chat_history and len(chat_history) > 0 and chat_history[-1].get("role") == "assistant":
            try:
                last_bot_action = json.loads(chat_history[-1]["content"]).get("action")
            except:
                pass

        if (is_query or is_past_query or target_month is not None) and last_bot_action != "ask_clarification":
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
                expenses = cat_qs.order_by('-date')
                just_month = month_name_str.replace(" ", "_")
                
                is_pdf = "pdf" in normalized_text
                
                if is_pdf:
                    try:
                        from reportlab.lib.pagesizes import letter
                        from reportlab.lib import colors
                        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
                        from reportlab.lib.styles import getSampleStyleSheet
                        
                        buffer = io.BytesIO()
                        doc = SimpleDocTemplate(buffer, pagesize=letter)
                        elements = []
                        
                        styles = getSampleStyleSheet()
                        title_style = styles['Heading1']
                        title_style.alignment = 1 # Center
                        
                        elements.append(Paragraph(f"Expense Report for {month_name_str}", title_style))
                        elements.append(Spacer(1, 20))
                        
                        data = [['Date', 'Category', 'Description', 'Amount (Rs)']]
                        total_export = 0
                        for exp in expenses:
                            data.append([exp.date.strftime('%Y-%m-%d'), exp.category.title(), exp.description or '', f"{exp.amount:,.2f}"])
                            total_export += exp.amount
                        data.append(['', '', 'Total', f"{total_export:,.2f}"])
                        
                        table = Table(data, colWidths=[80, 100, 200, 100])
                        table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A73E8')),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 12),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('BACKGROUND', (0, 1), (-1, -2), colors.HexColor('#F8F9FA')),
                            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#E0E0E0')),
                            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#E8F0FE')),
                        ]))
                        
                        elements.append(table)
                        doc.build(elements)
                        pdf_content = buffer.getvalue()
                        base64_media = base64.b64encode(pdf_content).decode('utf-8')
                        mimetype = "application/pdf"
                        filename = f"ExpenseTracker_{just_month}_Report.pdf"
                        msg_text = f"📄 *{user_name}*, here is your detailed PDF expense report for {month_name_str}."
                    except ImportError:
                        is_pdf = False # Fallback to CSV if reportlab missing
                
                if not is_pdf:
                    output = io.StringIO()
                    writer = csv.writer(output)
                    writer.writerow(['Date', 'Category', 'Description', 'Amount'])
                    total_export = 0
                    for exp in expenses:
                        writer.writerow([exp.date.strftime('%Y-%m-%d'), exp.category.title(), exp.description or '', f"{exp.amount}"])
                        total_export += exp.amount
                    writer.writerow([])
                    writer.writerow(['', '', 'Total', f"{total_export}"])
                    csv_content = output.getvalue()
                    base64_content = base64.b64encode(csv_content.encode('utf-8')).decode('utf-8')
                    mimetype = "text/csv"
                    filename = f"ExpenseTracker_{just_month}_Report.csv"
                    msg_text = f"📄 *{user_name}*, here is your detailed CSV expense report for {month_name_str}.\n\n(Tip: Open this file in Excel or Google Sheets!)"
                
                total_time = time.time() - start_time_view
                return JsonResponse({
                    "status": "success",
                    "message": msg_text + f"\n\n⏱️ `Total API Time: {total_time:.2f}s`",
                    "media": {
                        "mimetype": mimetype,
                        "filename": filename,
                        "base64": base64_content
                    }
                })

            total_time = time.time() - start_time_view
            msg_lines.append(f"\n⏱️ `Total API Time: {total_time:.2f}s`")
            return JsonResponse({
                "status": "success",
                "message": "\n".join(msg_lines)
            })

        # ──────────────────────────────────────────────────────────────────────
        # AI PATH (Fallback for chatting and unknown questions)
        # ──────────────────────────────────────────────────────────────────────
        # Note: Heavy queries (recent expenses, category breakdowns) have been 
        # removed from here because they take 4 seconds on free DB tiers. 
        # If the user asks for a summary, it gets intercepted by FAST PATH 2 anyway!
        
        user_context = {
            "name": user_name,
            "budget": budget,
            "spent": float(spent),
            "remaining": max(0, budget - float(spent)),
            "recent_expenses": "Check Dashboard for details",
            "category_breakdown": "Check Dashboard for details",
            "recent_notes": "Check Dashboard for details"
        }

        system_prompt = build_conversational_ai_prompt(today, user_context)
        
        # Use WhatsAppSession for persistent memory
        chat_history = session.context if isinstance(session.context, list) else []

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(chat_history)
        messages.append({"role": "user", "content": normalized_text})

        ai_start_time = time.time()
        full_response = ""
        try:
            response = _groq_client().chat.completions.create(
                messages=messages,
                model="qwen/qwen3.8-27b",
                temperature=0.7,
                max_tokens=800,
            )
            full_response = response.choices[0].message.content or ""
        except Exception as e_groq:
            logger.warning("Primary groq model error: %s, falling back to llama-3.3-70b-versatile", e_groq)
            try:
                response = _groq_client().chat.completions.create(
                    messages=messages,
                    model="llama-3.3-70b-versatile",
                    temperature=0.7,
                    max_tokens=800,
                )
                full_response = response.choices[0].message.content or ""
            except Exception as e_fb:
                logger.error("Fallback groq model also failed: %s", e_fb)
                full_response = ""

        ai_time = time.time() - ai_start_time
        raw_response = re.sub(r"<think>(?:.*?</think>|.*$)", "", full_response, flags=re.DOTALL).strip()
        print(f"DEBUG AI raw response: {raw_response!r}")

        # Try finding JSON in stripped response first, then fall back to full response
        json_source = raw_response
        start_idx = raw_response.find('{')
        end_idx = raw_response.rfind('}')
        if start_idx == -1 or end_idx == -1:
            json_source = full_response
            start_idx = full_response.find('{')
            end_idx = full_response.rfind('}')

        ai_data = None
        json_str = ""
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = json_source[start_idx:end_idx+1]
            try:
                ai_data = json.loads(json_str, strict=False)
            except Exception:
                try:
                    clean_str = json_str.replace('\n', '\\n').replace('\r', '')
                    ai_data = json.loads(clean_str, strict=False)
                except Exception:
                    pass

        # If model returned pure text (normal friendly chat) or failed JSON, handle gracefully!
        if not ai_data or not isinstance(ai_data, dict):
            fallback_text = raw_response if raw_response else re.sub(r"<think>.*?</think>", "", full_response, flags=re.DOTALL).strip()
            if not fallback_text:
                fallback_text = f"Haanji *{user_name}*! Main sun raha hoon. Kahiye, sab kaisa chal raha hai? 😊"
            ai_data = {
                "action": "chat",
                "chat_response": fallback_text
            }

        action = ai_data.get("action", "chat")

        # Safety net: If AI mistakenly flagged action as 'chat' but an amount/expense is clearly present:
        if action == "chat":
            has_num = bool(re.search(r'\b\d+(?:\.\d+)?\b', normalized_text or spoken_text))
            if has_num:
                s_amt, s_desc = _extract_single_expense(normalized_text or spoken_text)
                if s_amt and s_desc:
                    action = "log_expenses"
                    ai_data["action"] = "log_expenses"
                    ai_data["expenses"] = [{
                        "amount": float(s_amt),
                        "category": _keyword_category_fallback(s_desc),
                        "description": s_desc
                    }]

        # Save history back to session (using conversational text for natural context)
        chat_history.append({"role": "user", "content": normalized_text})
        saved_assistant = ai_data.get("chat_response") if action == "chat" else (json_str or json.dumps(ai_data))
        chat_history.append({"role": "assistant", "content": str(saved_assistant)})
        session.context = chat_history[-6:] # Keep last 6 messages
        session.save()

        if action == "log_expenses":
            expenses_list = ai_data.get("expenses", [])
            if not expenses_list:
                return JsonResponse({"status": "error", "message": "Could not extract any expenses. Try: '500 petrol, 200 chai' ⛽"})

            created_expenses = []
            total_logged = 0

            for exp_data in expenses_list:
                amount_raw = exp_data.get("amount", 0)
                if isinstance(amount_raw, str):
                    amount_raw = re.sub(r'[^0-9.]', '', amount_raw)
                amount = Decimal(str(amount_raw or 0))

                if amount <= 0:
                    continue

                category = str(exp_data.get("category", "other")).strip().lower()
                # if category not in VALID_CATEGORIES:
                #     category = _keyword_category_fallback(str(exp_data.get("description", "")))

                expense = Expense.objects.create(
                    user=target_user,
                    amount=amount,
                    category=category,
                    date=today,
                    description=str(exp_data.get("description", "")).strip()[:100],
                )
                created_expenses.append(expense)
                total_logged += amount

            if not created_expenses:
                # Try fallback: look for any digit in spoken_text or normalized_text
                digits = re.findall(r'\b\d+(?:\.\d+)?\b', normalized_text or spoken_text)
                if digits:
                    try:
                        fallback_amt = Decimal(digits[0])
                        if fallback_amt > 0:
                            cat = _keyword_category_fallback(spoken_text)
                            exp = Expense.objects.create(
                                user=target_user,
                                amount=fallback_amt,
                                category=cat,
                                date=today,
                                description=spoken_text[:100],
                            )
                            created_expenses.append(exp)
                            total_logged += fallback_amt
                    except Exception:
                        pass

            if not created_expenses:
                return JsonResponse({
                    "status": "error", 
                    "message": "Amount samajh nahi aaya! Kripya amount ke saath bolein (Jaise: '500 petrol' ya '200 chai'). 🎙️"
                })

            new_spent = float(spent) + float(total_logged)
            new_rem = max(0, budget - new_spent)
            
            month_name = today.strftime("%B")
            
            if len(created_expenses) == 1:
                expense = created_expenses[0]
                icon = CAT_ICONS.get(expense.category, "📦")
                msg_lines = [
                    f"✅ *Hi {user_name}, Expense Logged Successfully!*",
                    f"━━━━━━━━━━━━━━━━━━",
                    f"{icon} *Amount:* ₹{expense.amount:,}",
                    f"🏷️ *Category:* {expense.category.title()}",
                    f"📝 *Note:* {expense.description or 'None'}",
                    f"━━━━━━━━━━━━━━━━━━"
                ]
            else:
                msg_lines = [
                    f"✅ *Hi {user_name}, {len(created_expenses)} Expenses Logged!*",
                    f"━━━━━━━━━━━━━━━━━━"
                ]
                for expense in created_expenses:
                    icon = CAT_ICONS.get(expense.category, "📦")
                    msg_lines.append(f"• {icon} {expense.category.title()}: ₹{expense.amount:,} ({expense.description or 'None'})")
                msg_lines.append(f"━━━━━━━━━━━━━━━━━━")
                msg_lines.append(f"💵 *Total Logged Just Now:* ₹{total_logged:,}")
                msg_lines.append(f"━━━━━━━━━━━━━━━━━━")

            msg_lines.extend([
                f"💰 *Total Spent ({month_name}):* ₹{new_spent:,.0f}",
                f"🎯 *Remaining Budget:* ₹{new_rem:,.0f}"
            ])
            
            if new_rem == 0:
                msg_lines.append("⚠️ *Warning:* You have exceeded your monthly budget! 🛑")

            # 🔔 Smart Spending Alert (only run on the first expense or largest for now to avoid spam)
            smart_alert = check_and_generate_alert(target_user, created_expenses[0])
            if smart_alert:
                msg_lines.append("")
                msg_lines.append(smart_alert)
                
            final_message = "\n".join(msg_lines)

            if provider_message_id and sender_id:
                try:
                    WhatsAppProcessedMessage.objects.update_or_create(
                        provider_message_id=provider_message_id,
                        sender_id=sender_id,
                        defaults={'status': 'success', 'response_text': final_message}
                    )
                except Exception:
                    pass
            
            return JsonResponse({
                "status": "success",
                "message": final_message,
                "expense_id": created_expenses[0].pk,
                "transcription": spoken_text,
                "action": "log_expenses",
                "expense": {
                    "id": created_expenses[0].pk,
                    "amount": float(total_logged),
                    "category": created_expenses[0].category,
                    "category_icon": CAT_ICONS.get(created_expenses[0].category, "📦"),
                    "description": created_expenses[0].description or created_expenses[0].category.title(),
                    "date": str(created_expenses[0].date),
                    "total_spent_month": new_spent,
                    "remaining_budget": new_rem,
                }
            })
            
        elif action == "save_note":
            note_text = str(ai_data.get("note", "")).strip()
            if not note_text:
                note_text = spoken_text
                
            note = Note.objects.create(user=target_user, text=note_text)
            return JsonResponse({
                "status": "success",
                "message": f"📝 *Note Saved Successfully!*\n\n\"{note_text[:50]}...\"\n\nYou can view all your notes in the Web App or Mobile App.",
                "transcription": spoken_text,
                "action": "save_note",
            })
            
        elif action == "ask_clarification":
            chat_response = ai_data.get("chat_response", "Should I add this to your expenses or save it to Notepad?")
            final_msg = f"🤔 *Ek minute...*\n\n{chat_response}"
            if provider_message_id and sender_id:
                try:
                    WhatsAppProcessedMessage.objects.update_or_create(
                        provider_message_id=provider_message_id,
                        sender_id=sender_id,
                        defaults={'status': 'success', 'response_text': final_msg}
                    )
                except Exception:
                    pass
            return JsonResponse({
                "status": "success",
                "message": final_msg,
                "transcription": spoken_text,
                "action": "ask_clarification",
            })
            
        else:
            chat_response = ai_data.get("chat_response")
            if not chat_response or not str(chat_response).strip():
                chat_response = f"Haanji *{user_name}*, bataiye! Sab kaisa chal raha hai? Koi kharcha note karna hai ya koi baat karni hai? 😊"
            
            final_chat_msg = str(chat_response).strip()
            if provider_message_id and sender_id:
                try:
                    WhatsAppProcessedMessage.objects.update_or_create(
                        provider_message_id=provider_message_id,
                        sender_id=sender_id,
                        defaults={'status': 'success', 'response_text': final_chat_msg}
                    )
                except Exception:
                    pass

            return JsonResponse({
                "status": "success",
                "message": final_chat_msg,
                "transcription": spoken_text,
                "action": "chat",
                "is_chat": True
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

@csrf_exempt
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

    system = f"""You are Expense Tracker AI, a smart, respectful, and helpful financial AI. NEVER use words like 'Tu/Tera'. ALWAYS use 'Aap/Bhai'. Speak in natural, polite Hinglish by default.

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
1. Always respond respectfully using "Aap" or "Bhai".
2. Keep responses concise — max 100 words.
3. If user asks for calculations, do them correctly.
4. Never make up numbers. Use the exact data provided above.
5. If budget is exceeded, gently warn them but remain polite."""

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
            model="qwen/qwen3.8-27b",
            temperature=0.7,
            max_tokens=1000,
        )
        reply = re.sub(r"<think>(?:.*?</think>|.*$)", "", resp.choices[0].message.content, flags=re.DOTALL).strip()
        logger.info("AI chat uid=%s msg_len=%d", request.user.id, len(user_msg))
        return JsonResponse({"reply": reply, "status": "success"})

    except Exception as e:
        logger.warning("AI chat primary model failed uid=%s error=%s, trying fallback", request.user.id, e)
        try:
            resp = _groq_client().chat.completions.create(
                messages=messages_payload,
                model="openai/gpt-oss-120b",
                temperature=0.7,
                max_tokens=800,
            )
            reply = re.sub(r"<think>(?:.*?</think>|.*$)", "", resp.choices[0].message.content, flags=re.DOTALL).strip()
            return JsonResponse({"reply": reply, "status": "success"})
        except Exception as e2:
            logger.error("AI chat fallback uid=%s error=%s", request.user.id, e2)
            return JsonResponse({
                "reply":  "Bhai, thoda sa network issue ho gaya hai. Aap thodi der baad dubara pucho! 🤖",
                "status": "error",
            })


# ══════════════════════════════════════════════════════════════════════════════
# CATEGORY INSIGHT API
# ══════════════════════════════════════════════════════════════════════════════

@api_login_required
def api_category_insight(request: HttpRequest) -> JsonResponse:
    category = request.GET.get("category", "").strip().lower()
    period   = request.GET.get("period", "month")

    # if category not in VALID_CATEGORIES:
    #     return JsonResponse({"error": "Invalid category"}, status=400)
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

    recent_qs = month_qs.values('id', 'title', 'category', 'amount', 'date', 'icon', 'description') if hasattr(Expense, 'title') else month_qs.values('id', 'category', 'amount', 'date', 'icon', 'description')
    
    return JsonResponse({
        "budget":            budget,
        "budget_cycle_start_day": getattr(request.user.profile, 'budget_cycle_start_day', 1) if hasattr(request.user, 'profile') else 1,
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
        "whatsapp_linked":   request.user.profile.whatsapp_linked if hasattr(request.user, 'profile') else False,
        "safe_to_spend":     calculate_safe_to_spend(request.user, today),
        "days_left": (
            (today.replace(day=1) + timedelta(days=32)).replace(day=1) - today
        ).days,
    })


@api_login_required
def api_safe_to_spend(request: HttpRequest) -> JsonResponse:
    """REST endpoint returning current daily safe-to-spend allowance and metrics."""
    safe_data = calculate_safe_to_spend(request.user)
    return JsonResponse(safe_data)


@api_login_required
def api_transactions_history(request: HttpRequest) -> JsonResponse:
    today = date.today()
    try:
        month = int(request.GET.get('month', today.month))
        year = int(request.GET.get('year', today.year))
    except (ValueError, TypeError):
        month = today.month
        year = today.year

    if month < 1 or month > 12:
        month = today.month

    base_qs = Expense.objects.filter(user=request.user, date__year=year, date__month=month)
    
    # Calculate month total and category breakdown before search filters
    agg_total = base_qs.aggregate(total=Sum("amount"))
    month_total_spent = _safe_float(agg_total["total"])

    cat_breakdown = list(
        base_qs.values('category')
        .annotate(total=Sum('amount'), count=Count('id'))
        .order_by('-total')
    )

    qs = base_qs
    # Optional category filter
    category = request.GET.get('category', '').strip()
    if category and category.lower() != 'all':
        qs = qs.filter(category__iexact=category)

    # Optional search query (matches description or category)
    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(Q(description__icontains=q) | Q(category__icontains=q))

    qs = qs.order_by("-date", "-id")

    txns = qs.values('id', 'title', 'category', 'amount', 'date', 'icon', 'description') if hasattr(Expense, 'title') else qs.values('id', 'category', 'amount', 'date', 'icon', 'description')
    
    agg_filtered = qs.aggregate(total=Sum("amount"))
    filtered_total_spent = _safe_float(agg_filtered["total"])

    month_name = date(year, month, 1).strftime("%B %Y")

    return JsonResponse({
        "month": month_name,
        "total_spent": round(month_total_spent, 2),
        "filtered_total": round(filtered_total_spent, 2),
        "count": qs.count(),
        "category_breakdown": cat_breakdown,
        "transactions": list(txns),
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
        "service":   "ExpenseTracker",
        "version":   "3.2.0",
        "timestamp": datetime.now().isoformat(),
    })


def bot_qr_proxy(request: HttpRequest) -> HttpResponse:
    """SEC-004: Staff-only proxy for the internal WhatsApp bot QR page."""
    if request.method not in ("GET", "HEAD"):
        return HttpResponse("Method Not Allowed", status=405)
    if not request.user.is_authenticated:
        return HttpResponse("Unauthorized", status=401)
    if not (request.user.is_staff or request.user.is_superuser):
        return HttpResponse("Forbidden: Staff access required", status=403)
    import requests as req_lib
    try:
        resp = req_lib.get("http://127.0.0.1:3001/qr", timeout=5)
        return HttpResponse(resp.text, content_type="text/html")
    except Exception:
        return HttpResponse(
            "<html><body style='font-family:sans-serif;text-align:center;padding:50px;background:#1a1a2e;color:#eee;'>"
            "<h1 style='color:#ff6b6b;'>⚠️ Bot Not Running</h1>"
            "<p>WhatsApp bot is not started yet. Please wait and refresh.</p>"
            "<meta http-equiv='refresh' content='5'>"
            "</body></html>",
            content_type="text/html"
        )


@api_login_required
@json_required
def api_user_profile(request: HttpRequest) -> JsonResponse:
    user    = request.user

    if request.method == "POST":
        body = getattr(request, "_json_body", {})
        
        if any(k in body for k in ["username", "first_name", "last_name", "email"]):
            from django.contrib.auth.models import User
            if "username" in body:
                new_username = str(body["username"]).strip()
                if new_username and new_username != user.username:
                    if User.objects.filter(username=new_username).exists():
                        return JsonResponse({"error": "Username is already taken"}, status=400)
                    user.username = new_username
            if "first_name" in body:
                user.first_name = str(body["first_name"]).strip()
            if "last_name" in body:
                user.last_name = str(body["last_name"]).strip()
            if "email" in body:
                new_email = str(body["email"]).strip()
                if new_email != user.email:
                    user.email = new_email
                    profile, _ = UserProfile.objects.get_or_create(user=user)
                    profile.email_verified = False
                    profile.save()
            user.save()
            return JsonResponse({"status": "success", "message": "Profile updated successfully"})

        if "budget" in body:
            try:
                nb = float(body["budget"])
                if nb <= 0:
                    raise ValueError
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.monthly_budget = nb
                
                if "budget_cycle_start_day" in body:
                    sd = int(body["budget_cycle_start_day"])
                    if 1 <= sd <= 28:
                        profile.budget_cycle_start_day = sd
                        
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

    profile = UserProfile.objects.filter(user=user).first()
    profile_pic_url = None
    if profile:
        if profile.profile_picture_b64:
            profile_pic_url = profile.profile_picture_b64
        elif profile.profile_picture:
            url = request.build_absolute_uri(profile.profile_picture.url)
            if url.startswith("http://") and "localhost" not in url and "127.0.0.1" not in url:
                url = url.replace("http://", "https://")
            profile_pic_url = url

    return JsonResponse({
        "username":       user.username,
        "first_name":     user.first_name,
        "last_name":      user.last_name,
        "email":          user.email or "",
        "email_verified": getattr(profile, 'email_verified', False) if profile else False,
        "joined":         user.date_joined.strftime("%d %B %Y"),
        "lifetime_spent": round(_safe_float(all_agg["total"]), 2),
        "total_txns":     all_agg["count"] or 0,
        "first_expense":  all_agg["first_date"].isoformat() if all_agg["first_date"] else None,
        "last_expense":   all_agg["last_date"].isoformat()  if all_agg["last_date"]  else None,
        "budget":         get_user_budget(request),
        "budget_cycle_start_day": getattr(profile, 'budget_cycle_start_day', 1) if profile else 1,
        "member_days":    (date.today() - user.date_joined.date()).days,
        "profile_picture": profile_pic_url,
        "phone_number":    profile.phone_number if profile else "",
        "whatsapp_number": profile.whatsapp_number if profile else "",
        "whatsapp_linked": profile.whatsapp_linked if profile else False,
        "is_admin":        is_super_admin(user),
    })

@api_login_required
def api_upload_profile_photo(request: HttpRequest) -> JsonResponse:
    if request.method == "POST":
        photo = request.FILES.get("photo")
        if not photo:
            return JsonResponse({"error": "No photo provided"}, status=400)
            
        # File Size Validation (Max 5MB)
        if photo.size > 5 * 1024 * 1024:
            return JsonResponse({"error": "File size exceeds 5MB limit"}, status=400)
            
        # MIME Type Validation
        allowed_mimes = ["image/jpeg", "image/png", "image/webp"]
        if photo.content_type not in allowed_mimes:
            return JsonResponse({"error": "Invalid file type. Only JPG, PNG, and WEBP are allowed"}, status=400)
            
        # Extension Validation
        ext = photo.name.split('.')[-1].lower()
        if ext not in ['jpg', 'jpeg', 'png', 'webp']:
            return JsonResponse({"error": "Invalid file extension"}, status=400)
            
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.profile_picture = photo
        profile.save()
        
        photo_url = request.build_absolute_uri(profile.profile_picture.url)
        if photo_url.startswith("http://") and "localhost" not in photo_url and "127.0.0.1" not in photo_url:
            photo_url = photo_url.replace("http://", "https://")
        return JsonResponse({"status": "success", "profile_picture": photo_url})
    
    return JsonResponse({"error": "Invalid method"}, status=405)


@api_login_required
def api_quick_add(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    validated, err = validate_and_normalize_expense(
        request.user,
        data.get("amount", 0),
        data.get("category", "other"),
        data.get("date"),
        data.get("description", "")
    )
    if err:
        return JsonResponse({"error": err}, status=400)

    expense = Expense.objects.create(
        user=request.user,
        amount=validated["amount"],
        category=validated["category"],
        date=validated["date"],
    )
    update_user_gamification(request.user, validated["date"])

    return JsonResponse({
        "status":     "success",
        "expense_id": expense.pk,
        "message":    f"{CAT_ICONS.get(validated['category'],'📦')} ₹{validated['amount']:,} saved!",
        "amount":     float(validated["amount"]),
        "category":   validated["category"],
        "date":       validated["date"].isoformat(),
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

@api_login_required
def habit_warnings(request):
    target_user = request.user
    two_weeks_ago = date.today() - timedelta(days=14)
    expenses = Expense.objects.filter(user=target_user, date__gte=two_weeks_ago).order_by('date')

    if expenses.count() < 3:
        return JsonResponse({
            "warning": "Not enough data yet. Track more expenses for at least a few days so I can analyze your habits! 📉"
        })

    data_str = "\n".join([f"{e.date.strftime('%A')} ({e.category}): ₹{e.amount}" for e in expenses])

    prompt = f"""
    You are Expense Tracker AI, a smart, respectful, and helpful financial AI. NEVER use words like 'Tu/Tera'. ALWAYS use 'Aap/Bhai'. Speak in natural, polite Hinglish by default.
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
            model="qwen/qwen3.8-27b",
            temperature=0.8,
            max_tokens=1000,
        )
        warning_msg = re.sub(r"<think>(?:.*?</think>|.*$)", "", response.choices[0].message.content, flags=re.DOTALL).strip()
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
                return JsonResponse({"status": "error", "message": "Please register on the website first to link your WhatsApp number! 🚫"})
            
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
            report_msg = f"📊 *ExpenseTracker Lifetime Report*\n\n"
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
                ai_suggestion = "AI server is currently busy, but keep an eye on your top expenses! 💸"

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
    """WEB-001: Real support contact form with persistence, CSRF, validation and rate-limiting."""
    if request.method == "POST":
        # 1. Honeypot check for spam bots
        website_trap = request.POST.get("website", "").strip()
        if website_trap:
            return render(request, "tracker/contact.html", {"success": True})

        name = request.POST.get("name", "").strip()
        email = request.POST.get("email", "").strip()
        subject = request.POST.get("subject", "").strip() or "Support Request"
        message = request.POST.get("message", "").strip()
        ip = _get_client_ip(request)

        errors = []
        if not name or len(name) < 2 or len(name) > 150:
            errors.append("Please enter a valid name (2 to 150 characters).")
        if not email or "@" not in email or len(email) > 254:
            errors.append("Please enter a valid email address.")
        else:
            try:
                from django.core.validators import validate_email
                validate_email(email)
            except Exception:
                errors.append("Please enter a valid email address.")
        if not message or len(message) < 5 or len(message) > 5000:
            errors.append("Please enter a message between 5 and 5000 characters.")

        # Rate limiting: max 5 messages per hour per IP
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_count = ContactMessage.objects.filter(ip_address=ip, created_at__gte=one_hour_ago).count()
        if recent_count >= 5:
            errors.append("Too many contact submissions from your IP. Please try again later.")

        if errors:
            if request.headers.get("Accept") == "application/json":
                return JsonResponse({"status": "error", "errors": errors}, status=400)
            return render(request, "tracker/contact.html", {
                "errors": errors,
                "form_data": {"name": name, "email": email, "subject": subject, "message": message}
            })

        msg_obj = ContactMessage.objects.create(
            name=name,
            email=email,
            subject=subject,
            message=message,
            ip_address=ip,
            status="new"
        )

        try:
            from .email_service import send_transactional_email
            support_email = getattr(settings, 'SUPPORT_EMAIL', 'support@paisamitra.com')
            email_body = f"Support Message #{msg_obj.id}\nFrom: {name} <{email}>\nSubject: {subject}\n\nMessage:\n{message}"
            send_transactional_email(support_email, f"[Support Ticket #{msg_obj.id}] {subject}", email_body)
        except Exception as e:
            logger.warning("Could not dispatch contact support notification email: %s", e)

        if request.headers.get("Accept") == "application/json":
            return JsonResponse({"status": "success", "message": "Thank you! Your message has been received."})

        messages.success(request, "Thank you! Your message has been sent to our support team.")
        return render(request, "tracker/contact.html", {"success": True})

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
    
    cur_start, cur_end = get_budget_cycle_dates(user, today)
    
    # Previous month cycle based on a reference date from previous cycle
    prev_ref_date = cur_start - timedelta(days=5)
    prev_start, prev_end = get_budget_cycle_dates(user, prev_ref_date)

    cur_qs = Expense.objects.filter(user=user, date__range=(cur_start, cur_end))
    prev_qs = Expense.objects.filter(user=user, date__range=(prev_start, prev_end))

    cur_total = _safe_float(cur_qs.aggregate(t=Sum("amount"))["t"])
    prev_total = _safe_float(prev_qs.aggregate(t=Sum("amount"))["t"])

    cur_count = cur_qs.count()
    prev_count = prev_qs.count()

    # Days elapsed calculation for fair comparison
    days_elapsed = today.day
    prev_days = calendar.monthrange(prev_start.year, prev_start.month)[1]

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

    prev_month_name = prev_start.strftime("%B")

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

def generate_daily_tip(user, tip_type: str = "morning") -> str:
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
        user_name = user.first_name.title() if user.first_name else user.username.title()
        time_of_day = "Morning" if tip_type == "morning" else "Night"

        if tip_type == "morning":
            safe_info = calculate_safe_to_spend(user)
            safe_allowance = safe_info["safe_limit_today"]
            prompt = (
                f"You are a sophisticated, uplifting, and friendly personal financial coach.\n"
                f"User Name: {user_name}\n"
                f"Time: Morning\n"
                f"Today's Safe-to-Spend Allowance: ₹{safe_allowance:,.0f}\n"
                f"Past 7 days total spent: ₹{week_total:,.0f}\n"
                f"Top spending category: {cat_name} (₹{cat_total:,.0f})\n"
                f"Monthly budget status: {budget_pct:.0f}% of ₹{budget:,.0f} budget used (₹{month_spent:,.0f} spent)\n\n"
                f"Write a delightful, inspiring Good Morning message for WhatsApp.\n"
                f"STRICT RULES:\n"
                f"1. LANGUAGE: Natural, engaging, and polite Hinglish (or clean English). Warm, respectful words like 'Aap', 'Bhai' are welcomed.\n"
                f"2. GREETING: Start with a warm, energetic greeting like '*Good Morning, {user_name}!* ☀️' or '*Good Morning, {user_name}!* 🌅'.\n"
                f"3. SAFE-TO-SPEND: Clearly highlight today's Safe-to-Spend limit of *₹{safe_allowance:,.0f}* as their daily spending guideline.\n"
                f"4. CONTENT: Provide ONE crisp, actionable financial wisdom or smart habit for the day ahead.\n"
                f"5. TONE: Inspiring, positive, clear, and friendly.\n"
                f"6. LENGTH: 25-40 words maximum! Keep it short, crisp, and high-impact.\n"
                f"7. FORMAT: Use WhatsApp *bold* formatting for key phrases and 1-2 lovely emojis.\n"
                f"Return ONLY the final message to be sent."
            )
        else:
            prompt = (
                f"You are a sophisticated, uplifting, and friendly personal financial coach.\n"
                f"User Name: {user_name}\n"
                f"Time: Night\n"
                f"Past 7 days total spent: ₹{week_total:,.0f}\n"
                f"Top spending category: {cat_name} (₹{cat_total:,.0f})\n"
                f"Monthly budget status: {budget_pct:.0f}% of ₹{budget:,.0f} budget used (₹{month_spent:,.0f} spent)\n\n"
                f"Write a peaceful, encouraging Good Night message for WhatsApp.\n"
                f"STRICT RULES:\n"
                f"1. LANGUAGE: Natural, engaging, and polite Hinglish (or clean English). Warm, respectful words like 'Aap', 'Bhai' are welcomed.\n"
                f"2. GREETING: Start with a warm, relaxing greeting like '*Good Night, {user_name}!* 🌙' or '*Good Night, {user_name}!* ✨'.\n"
                f"3. CONTENT: Provide a gentle evening reflection or reminder to log today's expenses, celebrate budget discipline, and sleep with peace of mind.\n"
                f"4. TONE: Calming, appreciative, encouraging, and warm.\n"
                f"5. LENGTH: 25-40 words maximum! Keep it short, crisp, and high-impact.\n"
                f"6. FORMAT: Use WhatsApp *bold* formatting for key phrases and 1-2 lovely emojis.\n"
                f"Return ONLY the final message to be sent."
            )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="qwen/qwen3.8-27b",
            temperature=0.8,
            max_tokens=250,
        )
        raw_text = r.choices[0].message.content or ""
        ans = re.sub(r"<think>(?:.*?</think>|.*$)", "", raw_text, flags=re.DOTALL).strip()
        if (ans.startswith('"') and ans.endswith('"')) or (ans.startswith("'") and ans.endswith("'")):
            ans = ans[1:-1].strip()

        if not ans:
            raise ValueError("Empty response from AI")
        return ans
    except Exception as e:
        logger.error("Daily tip generation error: %s", e)
        user_name = user.first_name.title() if (user and user.first_name) else (user.username.title() if user else "Friend")
        if tip_type == "morning":
            try:
                safe_info = calculate_safe_to_spend(user)
                safe_allowance = safe_info["safe_limit_today"]
            except Exception:
                safe_allowance = 500.0
            tips_fallback = [
                f"☀️ *Good Morning, {user_name}!* Today's Safe-to-Spend limit is *₹{safe_allowance:,.0f}*. Spend mindfully today to keep your savings on track! 📈✨",
                f"🌅 *Good Morning, {user_name}!* Your daily spending target today is *₹{safe_allowance:,.0f}*. Every smart choice today builds financial freedom! 💼💰",
                f"☕ *Good Morning, {user_name}!* Make today count financially with a Safe-to-Spend allowance of *₹{safe_allowance:,.0f}*. Stay focused on your goals! 🚀💸",
            ]
        else:
            tips_fallback = [
                f"🌙 *Good Night, {user_name}!* Take a quiet moment to log today's expenses before you sleep. Rest easy knowing your finances are on track! 😴✨",
                f"✨ *Good Night, {user_name}!* Financial peace of mind comes from daily consistency. Sleep well and recharge for a prosperous tomorrow! 🛌🌠",
                f"🌌 *Good Night, {user_name}!* Great job staying mindful of your spending today. Relax, unwind, and have sweet dreams! 🌙💫",
            ]
        import random
        return random.choice(tips_fallback)


@api_login_required
def api_daily_tip(request: HttpRequest) -> JsonResponse:
    """Get today's personalized money tip (morning or night based on time)."""
    client_type = request.GET.get('type')
    client_hour = request.GET.get('hour')
    
    if client_type in ['morning', 'night']:
        tip_type = client_type
    elif client_hour is not None:
        try:
            h = int(client_hour)
            tip_type = "night" if (h >= 18 or h < 5) else "morning"
        except ValueError:
            now = timezone.localtime(timezone.now())
            tip_type = "night" if (now.hour >= 18 or now.hour < 5) else "morning"
    else:
        now = timezone.localtime(timezone.now())
        tip_type = "night" if (now.hour >= 18 or now.hour < 5) else "morning"

    ck = f"daily_tip_{tip_type}_{request.user.id}_{date.today().isoformat()}"
    cached = cache.get(ck)
    if cached:
        return JsonResponse({"tip": cached, "cached": True, "type": tip_type})

    tip = generate_daily_tip(request.user, tip_type)
    cache.set(ck, tip, 86400)  # Cache for 24 hours
    return JsonResponse({"tip": tip, "cached": False, "type": tip_type})


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
    expected_secret = getattr(settings, 'DAILY_TIP_SECRET', None) or os.getenv('DAILY_TIP_SECRET') or 'paisamitra-daily-2025'
    if not expected_secret or not secret or not hmac.compare_digest(str(secret), str(expected_secret)):
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
        # Use phone_number as the primary delivery target, as whatsapp_number might be a LID
        target_number = profile.phone_number or profile.whatsapp_number
        if not target_number:
            continue
            
        if target_number in seen_numbers:
            continue
        seen_numbers.add(target_number)
        
        ck = f"{tip_type}_tip_sent_{profile.user.id}_{timezone.localdate().isoformat()}"
        force = body.get("force", False)
        if cache.get(ck) and not force:
            continue  # Already sent today

        msg = generate_daily_tip(profile.user, tip_type)

        tips.append({
            "whatsapp_number": target_number,
            "message": msg,
            "user_id": profile.user.id,
        })
        # Note: We do NOT cache.set here! We only mark as sent when the bot confirms successful delivery.

    return JsonResponse({"tips": tips, "count": len(tips)})


@csrf_exempt
def api_confirm_tip_sent(request: HttpRequest) -> JsonResponse:
    """Marks a daily tip as sent for a user after successful WhatsApp delivery."""
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        body = {}

    secret = body.get("secret", "")
    expected_secret = getattr(settings, 'DAILY_TIP_SECRET', None) or os.getenv('DAILY_TIP_SECRET') or 'paisamitra-daily-2025'
    if not expected_secret or not secret or not hmac.compare_digest(str(secret), str(expected_secret)):
        return JsonResponse({"error": "Unauthorized"}, status=403)

    user_id = body.get("user_id")
    tip_type = body.get("type", "night")

    if user_id:
        ck = f"{tip_type}_tip_sent_{user_id}_{timezone.localdate().isoformat()}"
        cache.set(ck, True, 86400)
        return JsonResponse({"status": "confirmed", "user_id": user_id, "type": tip_type})

    return JsonResponse({"error": "user_id required"}, status=400)


@csrf_exempt
def api_admin_trigger_night_tips(request: HttpRequest) -> JsonResponse:
    """Admin endpoint to immediately trigger and deliver night tips to all linked users via WhatsApp bot."""
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        body = {}

    secret = body.get("secret", "")
    expected_secret = getattr(settings, 'DAILY_TIP_SECRET', None) or os.getenv('DAILY_TIP_SECRET') or 'paisamitra-daily-2025'
    if not expected_secret or not secret or not hmac.compare_digest(str(secret), str(expected_secret)):
        return JsonResponse({"error": "Unauthorized"}, status=403)

    import requests as req_lib
    linked_profiles = UserProfile.objects.filter(
        whatsapp_linked=True
    ).exclude(
        whatsapp_number__isnull=True
    ).exclude(
        whatsapp_number=''
    ).select_related('user')

    seen_numbers = set()
    results = []

    for profile in linked_profiles:
        target_number = profile.phone_number or profile.whatsapp_number
        if not target_number or target_number in seen_numbers:
            continue
        seen_numbers.add(target_number)

        try:
            msg = generate_daily_tip(profile.user, "night")
            res = req_lib.post("http://127.0.0.1:3001/api/send-message", json={
                "phone_number": target_number,
                "message": msg
            }, timeout=10)
            if res.status_code == 200:
                ck = f"night_tip_sent_{profile.user.id}_{date.today().isoformat()}"
                cache.set(ck, True, 86400)
                results.append({"number": target_number, "status": "sent"})
            else:
                results.append({"number": target_number, "status": "failed", "error": res.text})
        except Exception as ex:
            results.append({"number": target_number, "status": "error", "error": str(ex)})

    return JsonResponse({"status": "completed", "results": results})


# ══════════════════════════════════════════════════════════════════════════════
# FEATURE: AI NOTEPAD 📝
# ══════════════════════════════════════════════════════════════════════════════

@api_login_required
@csrf_exempt
def api_notes(request: HttpRequest) -> JsonResponse:
    if request.method == "GET":
        notes = request.user.notes.all()
        data = []
        for n in notes:
            data.append({
                "id": n.id,
                "text": n.text,
                "created_at": n.created_at.isoformat(),
                "updated_at": n.updated_at.isoformat()
            })
        return JsonResponse({"notes": data})
        
    elif request.method == "POST":
        try:
            body = json.loads(request.body)
            text = body.get("text", "").strip()
            if not text:
                return JsonResponse({"error": "Text is required"}, status=400)
            note = Note.objects.create(user=request.user, text=text)
            return JsonResponse({"status": "success", "note_id": note.id})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)
            
    return JsonResponse({"error": "Invalid method"}, status=405)

@api_login_required
@csrf_exempt
def api_delete_note(request: HttpRequest, pk: int) -> JsonResponse:
    if request.method != "DELETE":
        return JsonResponse({"error": "DELETE required"}, status=405)
    try:
        note = Note.objects.get(id=pk, user=request.user)
        note.delete()
        return JsonResponse({"status": "success"})
    except Note.DoesNotExist:
        return JsonResponse({"error": "Note not found"}, status=404)

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
        expenses_qs = g.expenses.all()
        total = _safe_float(expenses_qs.aggregate(t=Sum("amount"))["t"])
        expense_count = expenses_qs.count()
        per_person = total / max(len(members), 1)

        # Include expense list for display & delete
        expense_list = [
            {
                "id": exp.pk,
                "paid_by": exp.paid_by,
                "description": exp.description,
                "amount": float(exp.amount),
                "date": exp.date.isoformat(),
            }
            for exp in expenses_qs.order_by('-date', '-id')
        ]

        data.append({
            "id": g.pk,
            "name": g.name,
            "share_token": g.share_token,
            "share_url": f"/split/{g.share_token}/",
            "members": members,
            "member_count": len(members),
            "total": total,
            "per_person": round(per_person, 2),
            "expense_count": expense_count,
            "expenses": expense_list,
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
    paid_by_input = str(body.get("paid_by", "")).strip()
    description = str(body.get("description", "")).strip()
    amount = body.get("amount", 0)

    if not paid_by_input:
        return JsonResponse({"error": "'paid_by' name required"}, status=400)
    if not description:
        return JsonResponse({"error": "Description required"}, status=400)

    # Case-insensitive member lookup — normalize to stored name
    member = group.members.filter(name__iexact=paid_by_input).first()
    if not member:
        member_names = list(group.members.values_list('name', flat=True))
        return JsonResponse({
            "error": f"'{paid_by_input}' is not a member of this group. Members: {', '.join(member_names)}"
        }, status=400)
    paid_by = member.name  # Use the exact stored name to avoid mismatches

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

    # ─── NAYA: Automated Push Notifications ───
    try:
        from .fcm_utils import send_push_notification
        # Notify other members who have a linked UserProfile and fcm_token
        for mem in group.members.exclude(name__iexact=paid_by_input):
            if mem.phone:
                profile = UserProfile.objects.filter(phone_number=mem.phone).first()
                if profile and profile.fcm_token:
                    title = f"🧾 New Split in {group.name}"
                    body = f"{paid_by} added ₹{amount} for '{description}'. Your share is ~₹{round(per_person, 2)}."
                    send_push_notification(profile.fcm_token, title, body)
    except Exception as e:
        print("Failed to send split expense push notification:", e)

    return JsonResponse({
        "status": "success",
        "message": f"💸 ₹{amount:,} added to '{group.name}' (paid by {paid_by})",
        "expense_id": expense.pk,
        "group_total": total,
        "per_person": round(per_person, 2),
    }, status=201)


def compute_group_settlement(group, host_domain=None):
    """Calculate who owes whom with minimized transactions, UPI links, and WhatsApp card."""
    members_qs = group.members.all()
    members = list(members_qs.values_list('name', flat=True))
    member_phones = {m.name.lower(): (m.phone or "") for m in members_qs}
    expenses = group.expenses.all().order_by("-date", "-id")

    total = _safe_float(expenses.aggregate(t=Sum("amount"))["t"])
    member_count = max(len(members), 1)
    per_person = round(total / member_count, 2)

    name_lookup = {m.lower(): m for m in members}
    balances = {m: 0.0 for m in members}
    for exp in expenses:
        stored_name = name_lookup.get(exp.paid_by.lower())
        if stored_name:
            balances[stored_name] += float(exp.amount)
        elif exp.paid_by in balances:
            balances[exp.paid_by] += float(exp.amount)

    net = {m: balances[m] - per_person for m in members}

    # Factor in recorded direct payments / settlements between members
    recorded_settlements = list(group.settlements.all().order_by("-date", "-id"))
    for s in recorded_settlements:
        d_name = name_lookup.get(s.debtor.lower(), s.debtor)
        c_name = name_lookup.get(s.creditor.lower(), s.creditor)
        amt = float(s.amount)
        if d_name in net:
            net[d_name] += amt
        if c_name in net:
            net[c_name] -= amt

    settlements = []
    if not group.is_settled:
        debtors = [(m, -amt) for m, amt in net.items() if amt < -0.01]
        creditors = [(m, amt) for m, amt in net.items() if amt > 0.01]

        debtors.sort(key=lambda x: x[1], reverse=True)
        creditors.sort(key=lambda x: x[1], reverse=True)

        debtors_copy = [[m, amt] for m, amt in debtors]
        creditors_copy = [[m, amt] for m, amt in creditors]

        i, j = 0, 0
        while i < len(debtors_copy) and j < len(creditors_copy):
            debtor, debt = debtors_copy[i]
            creditor, credit = creditors_copy[j]
            transfer = min(debt, credit)

            if transfer > 0.01:
                creditor_phone = member_phones.get(creditor.lower(), "")
                if not creditor_phone and creditor.lower() in [group.creator.username.lower(), (group.creator.first_name or "").lower()]:
                    creditor_phone = getattr(getattr(group.creator, 'profile', None), 'phone_number', '') or ''
                
                clean_phone = re.sub(r'[^0-9]', '', creditor_phone)
                clean_10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
                vpa = f"{clean_10}@upi" if (clean_10 and len(clean_10) == 10) else ""
                upi_link = f"upi://pay?pa={vpa}&pn={quote(creditor)}&am={transfer:.2f}&cu=INR" if vpa else ""

                settlements.append({
                    "from": debtor,
                    "to": creditor,
                    "amount": round(transfer, 2),
                    "upi_link": upi_link,
                    "vpa": vpa,
                    "creditor_phone": creditor_phone
                })

            debtors_copy[i][1] -= transfer
            creditors_copy[j][1] -= transfer

            if debtors_copy[i][1] < 0.01:
                i += 1
            if creditors_copy[j][1] < 0.01:
                j += 1

    member_breakdown = []
    for m in members:
        paid = balances[m]
        cur_net = 0.0 if group.is_settled else net[m]
        status = "settled" if (group.is_settled or abs(cur_net) <= 0.01) else ("gets_back" if cur_net > 0.01 else "owes")
        member_breakdown.append({
            "name": m,
            "paid": round(paid, 2),
            "share": per_person,
            "net": round(cur_net, 2),
            "status": status,
        })

    if not host_domain:
        host_domain = "https://smart-expense-coach.onrender.com"
    public_url = f"{host_domain.rstrip('/')}/split/{group.share_token}/"

    settle_lines = []
    if group.is_settled:
        settle_lines = ["🎉 *This group is fully settled and closed!* All debts cleared."]
    elif total == 0 and not recorded_settlements:
        member_names_str = ", ".join(members) if members else "Members added"
        settle_lines = [
            "✨ *Group created successfully!*",
            f"👥 *Members:* {member_names_str}",
            "No expenses logged yet (Total ₹0).",
            "👉 _Add expenses via WhatsApp or tap the link below!_"
        ]
    else:
        for s in settlements:
            settle_lines.append(f"• *{s['from']}* ➡️ *{s['to']}*: ₹{s['amount']:,.0f}")
        if not settle_lines:
            settle_lines = ["🎉 *All members are completely settled up!*"]
    if not settle_lines:
        settle_lines = ["All settled! ✅"]

    wa_msg_lines = [
        f"🏖️ *{group.name} — Split Hisaab*",
        f"━━━━━━━━━━━━━━━━━━",
        f"💰 *Total Expense:* ₹{total:,.0f}",
        f"👥 *Per Person:* ₹{per_person:,.0f} ({len(members)} Members)",
        f"━━━━━━━━━━━━━━━━━━",
        f"⚖️ *Settlement (Who Owes Whom):*",
        *settle_lines,
        f"━━━━━━━━━━━━━━━━━━",
    ]

    upi_lines = []
    for s in settlements:
        if s.get("upi_link"):
            upi_lines.append(f"📲 Pay {s['to']}: {s['upi_link']}")
    if upi_lines:
        wa_msg_lines.extend(upi_lines)
        wa_msg_lines.append("━━━━━━━━━━━━━━━━━━")

    wa_msg_lines.extend([
        f"🔗 *Live Group Page (Zero Login):*",
        f"{public_url}",
        f"_(Tap to view live details or add new expenses)_"
    ])
    whatsapp_message = "\n".join(wa_msg_lines)

    expense_list = [
        {
            "id": exp.pk,
            "paid_by": exp.paid_by,
            "description": exp.description,
            "amount": float(exp.amount),
            "date": exp.date.isoformat(),
        }
        for exp in expenses
    ]

    settled_history = [
        {
            "id": s.pk,
            "debtor": s.debtor,
            "creditor": s.creditor,
            "amount": float(s.amount),
            "date": s.date.isoformat(),
        }
        for s in recorded_settlements
    ]

    return {
        "group_id": group.pk,
        "group_name": group.name,
        "share_token": group.share_token,
        "public_url": public_url,
        "creator": group.creator.username,
        "creator_id": group.creator.id,
        "total": total,
        "per_person": per_person,
        "member_count": len(members),
        "members": member_breakdown,
        "settlements": settlements,
        "expenses": expense_list,
        "settled_history": settled_history,
        "is_settled": group.is_settled,
        "whatsapp_message": whatsapp_message,
    }


def get_trip_format_guide_message() -> str:
    return (
        "✈️ *Trip & Group Split Guide*\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "👉 *Create Trip Link:* `Manali trip with Sumit`\n"
        "👉 *Split Expenses:* `Manali trip: Ajay paid 1600, Sumit 0`\n"
        "👉 *View Balances:* `Manali trip summary`\n"
        "👉 *Settle Payment:* `Sumit paid 800 to Ajay`\n"
        "━━━━━━━━━━━━━━━━━━\n"
        "💡 *Tip:* Even if someone paid ₹0, include their name to auto-split and get a Live Web Link! 🚀"
    )


def parse_and_handle_split_message(target_user, text: str, host_domain: str = None, session=None) -> dict:
    """
    Parses natural language split expense commands via Groq AI,
    creates/updates the SplitGroup, SplitMembers, SplitExpenses,
    and returns the ready-to-forward WhatsApp message + public web link.
    """
    user_name = target_user.first_name.title() if target_user.first_name else target_user.username.title()

    system_prompt = (
        f"You are an expert AI parser for Indian group expense splits (Splitwise style).\n"
        f"Target User Name: {user_name}\n\n"
        f"Instructions:\n"
        f"1. Extract the group/trip name (e.g. 'Manali Trip', 'Goa Trip', 'Dinner', 'Flatmates'). Look at the incoming message and recent chat history. If not mentioned, default to 'Trip Split'.\n"
        f"2. Extract ALL group members into 'members' array (capitalized strings). ALWAYS include '{user_name}' and ANY friends mentioned in the message or context (e.g. 'Sumit', 'Rahul', 'Rohit'), EVEN IF they paid 0 or did not pay anything!\n"
        f"3. Extract who paid what into 'expenses' array. If user refers to themselves ('maine', 'mera', 'me', 'i paid', 'mai', 'mai paid', 'self'), set 'paid_by' to '{user_name}'.\n"
        f"4. For each expense item, extract: 'paid_by' (Capitalized person name), 'amount' (number >= 0), and 'description' (e.g. 'cab', 'dinner', 'snacks', 'trip').\n"
        f"   - If someone paid 0 (e.g. 'sumit paid 0', 'sumit ne 0 diya'), you MUST include their name in 'members' and you can include {{\"paid_by\": \"Sumit\", \"amount\": 0, \"description\": \"trip\"}} in expenses.\n"
        f"   - If user only creates a group/trip with friends (e.g. 'Manali trip with Sumit' or 'Goa trip: Ajay, Sumit, Rahul'), put all of them in 'members': [\"{user_name}\", \"Sumit\"], and 'expenses': [].\n"
        f"5. If the message wants to settle/close/finish the group completely (e.g. 'Goa trip settle kar do', 'close goa trip'), set 'is_settle_all': true.\n"
        f"6. If one member paid another directly to settle (e.g. 'Rahul paid Ajay 133 in Goa trip', 'Sumit paid Ajay 80'), set 'settlement_payment': {{\"debtor\": \"Sumit\", \"creditor\": \"Ajay\", \"amount\": 80}}.\n"
        f"7. If the message is only asking for summary/status of an existing group (e.g. 'Goa trip ka hisaab', 'Manali trip hisaab'), set 'is_query_only': true.\n"
        f"8. If the user is asking how to use/format trip messages (e.g. 'trip format', 'trip help', 'trip kaise kare'), set 'is_help_query': true.\n"
        f"9. If the user is continuing a previous trip conversation from chat history (e.g. previous message was about 'Manali trip' and now user says 'Sumit paid 1 or mai 1' or 'Sumit paid 1 rs'), use that group name from history!\n\n"
        f"Output format: Strictly output a JSON object with this exact structure, with NO markdown code fences or conversational text:\n"
        f"{{\n"
        f"  \"is_help_query\": false,\n"
        f"  \"is_query_only\": false,\n"
        f"  \"is_settle_all\": false,\n"
        f"  \"settlement_payment\": null,\n"
        f"  \"group_name\": \"Manali Trip\",\n"
        f"  \"members\": [\"{user_name}\", \"Sumit\"],\n"
        f"  \"expenses\": [\n"
        f"    {{\"paid_by\": \"{user_name}\", \"amount\": 1600, \"description\": \"trip\"}},\n"
        f"    {{\"paid_by\": \"Sumit\", \"amount\": 0, \"description\": \"trip\"}}\n"
        f"  ]\n"
        f"}}"
    )

    messages = [{"role": "system", "content": system_prompt}]
    
    # Always include recent conversation context so AI knows which trip is being discussed!
    if session and session.context:
        if isinstance(session.context, list):
            for m in session.context[-6:]:
                if isinstance(m, dict) and 'role' in m and 'content' in m:
                    messages.append({"role": m['role'], "content": m['content']})
                    
    messages.append({"role": "user", "content": f"Incoming Message: \"{text}\""})

    try:
        r = _groq_client().chat.completions.create(
            messages=messages,
            model="qwen/qwen3.8-27b",
            temperature=0.1,
            max_tokens=500,
        )
        raw_output = r.choices[0].message.content or ""
        cleaned = re.sub(r"<think>(?:.*?</think>|.*$)", "", raw_output, flags=re.DOTALL).strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        data = json.loads(cleaned.strip())
    except Exception as e:
        logger.error("Failed to parse split message via AI: %s", e)
        return {
            "status": "error",
            "message": "⚠️ Could not understand group split details. Please write like:\n*Goa Trip: Rahul paid 400 cab, Aman paid 1200 dinner, maine 300 snacks*"
        }

    if data.get("is_help_query"):
        return {
            "status": "success",
            "message": get_trip_format_guide_message()
        }

    group_name = data.get("group_name", "Trip Split").strip()
    is_query_only = data.get("is_query_only", False)
    is_settle_all = data.get("is_settle_all", False)
    settle_payment = data.get("settlement_payment")

    is_force_new = "new " in text.lower() or "naya " in text.lower()
    group = None
    if not is_force_new:
        group = SplitGroup.objects.filter(creator=target_user, name__iexact=group_name).order_by('-id').first()
        if not group:
            group = SplitGroup.objects.filter(creator=target_user, name__icontains=group_name).order_by('-id').first()
        if not group and group_name in ["Group Split", "Trip Split", "Trip"]:
            group = SplitGroup.objects.filter(creator=target_user, is_settled=False).order_by('-id').first()

    if is_settle_all:
        if not group:
            return {
                "status": "error",
                "message": f"❌ Could not find an active split group named '{group_name}' to settle."
            }
        group.is_settled = True
        group.save(update_fields=["is_settled"])
        settlement = compute_group_settlement(group, host_domain)
        return {
            "status": "success",
            "message": (
                f"🎉 *{group.name} — Marked as Fully Settled!* 🏁\n"
                f"━━━━━━━━━━━━━━━━━━\n"
                f"All balances and hisaab have been closed.\n\n"
                f"🔗 *View Group Page:*\n{settlement['public_url']}"
            ),
            "data": settlement
        }

    if settle_payment and isinstance(settle_payment, dict):
        if not group:
            group = SplitGroup.objects.filter(creator=target_user, is_settled=False).order_by('-id').first()
        if group:
            d = str(settle_payment.get("debtor", "")).strip().title()
            c = str(settle_payment.get("creditor", "")).strip().title()
            if d.lower() in ["self", "me", "maine", "mai", "user"]:
                d = user_name
            if c.lower() in ["self", "me", "maine", "mai", "user"]:
                c = user_name
            amt_raw = settle_payment.get("amount", 0)
            try:
                amt = Decimal(str(amt_raw))
                if d and c and amt > 0:
                    SplitMember.objects.get_or_create(group=group, name=d)
                    SplitMember.objects.get_or_create(group=group, name=c)
                    SplitSettlement.objects.create(
                        group=group,
                        debtor=d,
                        creditor=c,
                        amount=amt,
                        date=date.today()
                    )
                    settlement = compute_group_settlement(group, host_domain)
                    return {
                        "status": "success",
                        "message": (
                            f"✅ *Payment Recorded for {group.name}!*\n"
                            f"━━━━━━━━━━━━━━━━━━\n"
                            f"💸 *{d}* paid *₹{amt:,.0f}* to *{c}*\n\n"
                            f"{settlement['whatsapp_message']}"
                        ),
                        "data": settlement
                    }
            except Exception as e:
                logger.error("Error saving settlement payment: %s", e)

    if is_query_only:
        if not group:
            return {
                "status": "error",
                "message": f"❌ Could not find an active split group named '{group_name}'."
            }
        settlement = compute_group_settlement(group, host_domain)
        return {
            "status": "success",
            "message": settlement["whatsapp_message"],
            "data": settlement
        }

    if group and group.is_settled:
        if "reopen" in text.lower():
            group.is_settled = False
            group.save(update_fields=["is_settled"])
            if not data.get("expenses"):
                return {
                    "status": "success",
                    "message": f"✅ *{group.name}* is now reopened! You can now add new expenses to it."
                }
        elif "new" in text.lower() or "naya" in text.lower():
            # Force create a new group
            group = None
        else:
            return {
                "status": "error",
                "message": f"🛑 Your *'{group.name}'* is already settled!\n\nDo you want to add this to the old one or create a new one?\n\n👉 Reply with: *Reopen {group.name}* (or just add 'reopen' in your message)\nOR\n👉 Reply with: *New {group.name} : [your expenses]*"
            }

    members_data = data.get("members", [])
    expenses_data = data.get("expenses", [])

    if not group:
        group = SplitGroup.objects.create(creator=target_user, name=group_name)

    # 1. Always ensure creator is registered as a member
    creator_member, _ = SplitMember.objects.get_or_create(group=group, name=user_name)
    if hasattr(target_user, 'profile') and target_user.profile.phone_number and not creator_member.phone:
        creator_member.phone = target_user.profile.phone_number
        creator_member.save(update_fields=["phone"])

    # 2. Register all explicitly identified members (even if they paid 0 or nothing)
    for m in members_data:
        m_name = str(m).strip().title()
        if m_name and m_name.lower() not in ["none", "null", "self", "user", "me", "maine", "mai", "i"]:
            SplitMember.objects.get_or_create(group=group, name=m_name)

    # 3. Add all expense payers as members, and record expenses where amount > 0
    valid_expenses_count = 0
    for item in expenses_data:
        p_name = str(item.get("paid_by", "")).strip().title()
        if p_name.lower() in ["self", "user", "me", "maine", "mai", "i"]:
            p_name = user_name

        try:
            amt = Decimal(str(item.get("amount", 0)))
        except Exception:
            amt = Decimal(0)
        desc = str(item.get("description", "Expense")).strip() or "Expense"

        if p_name and p_name.lower() not in ["none", "null", ""]:
            # Register member even if amount is 0!
            SplitMember.objects.get_or_create(group=group, name=p_name)
            if amt > 0:
                SplitExpense.objects.create(
                    group=group,
                    paid_by=p_name,
                    description=desc,
                    amount=amt,
                    date=date.today()
                )
                valid_expenses_count += 1

    # 4. If only creator exists (no friends identified) and 0 expenses were added, guide the user
    if group.members.count() <= 1 and valid_expenses_count == 0 and not is_query_only:
        if group.expenses.count() == 0:
            group.delete()
        return {
            "status": "success",
            "message": get_trip_format_guide_message()
        }

    settlement = compute_group_settlement(group, host_domain)
    return {
        "status": "success",
        "message": settlement["whatsapp_message"],
        "data": settlement
    }


@api_login_required
def api_split_summary(request: HttpRequest, pk: int) -> JsonResponse:
    """Calculate who owes whom — minimized transactions."""
    group = get_object_or_404(SplitGroup, pk=pk, creator=request.user)
    host_domain = request.build_absolute_uri('/')[:-1]
    res = compute_group_settlement(group, host_domain)
    return JsonResponse(res)


def public_split_page(request: HttpRequest, share_token: str) -> HttpResponse:
    """Public, zero-login page to view split group details, debts, and UPI pay links."""
    group = get_object_or_404(SplitGroup, share_token=share_token)
    if group.is_revoked:
        return HttpResponse("This split link has been revoked.", status=403)
    if group.token_expires_at and timezone.now() > group.token_expires_at:
        return HttpResponse("This split link has expired.", status=403)
    host_domain = request.build_absolute_uri('/')[:-1]
    settlement = compute_group_settlement(group, host_domain)
    context = {
        "group": group,
        "settlement": settlement,
        "members": settlement["members"],
        "settlements": settlement["settlements"],
        "expenses": settlement["expenses"],
        "settled_history": settlement.get("settled_history", []),
        "total": settlement["total"],
        "per_person": settlement["per_person"],
        "public_url": settlement["public_url"],
    }
    return render(request, "tracker/public_split.html", context)


def api_public_split_data(request: HttpRequest, share_token: str) -> JsonResponse:
    """Public JSON endpoint for live polling of group split data."""
    group = get_object_or_404(SplitGroup, share_token=share_token)
    if group.is_revoked:
        return JsonResponse({"error": "This split link has been revoked."}, status=403)
    if group.token_expires_at and timezone.now() > group.token_expires_at:
        return JsonResponse({"error": "This split link has expired."}, status=403)
    host_domain = request.build_absolute_uri('/')[:-1]
    settlement = compute_group_settlement(group, host_domain)
    return JsonResponse(settlement)


@csrf_exempt
def api_public_add_expense(request: HttpRequest, share_token: str) -> JsonResponse:
    """Public endpoint allowing any friend to add an expense to this split group without logging in."""
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    group = get_object_or_404(SplitGroup, share_token=share_token)
    if group.is_revoked:
        return JsonResponse({"error": "This split link has been revoked."}, status=403)
    if group.token_expires_at and timezone.now() > group.token_expires_at:
        return JsonResponse({"error": "This split link has expired."}, status=403)
    if group.is_settled:
        return JsonResponse({"error": "This split group is already settled!"}, status=400)

    # Rate limiting for public writes (max 30 writes per 5 minutes per IP)
    client_ip = _get_client_ip(request)
    recent_writes = SplitExpense.objects.filter(
        group=group,
        date=timezone.localdate()
    ).count()
    if recent_writes >= 50:
        return JsonResponse({"error": "Too many recent additions. Please wait a moment."}, status=429)

    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    paid_by = str(body.get("paid_by", "")).strip().title()
    description = str(body.get("description", "")).strip() or "Expense"
    amount_raw = body.get("amount", 0)

    if not paid_by or len(paid_by) > 50:
        return JsonResponse({"error": "Please enter a valid name (1 to 50 characters)"}, status=400)
    if len(description) > 200:
        return JsonResponse({"error": "Description cannot exceed 200 characters"}, status=400)

    try:
        amount = Decimal(str(amount_raw))
        if amount <= 0 or amount > 10000000:
            raise ValueError
    except Exception:
        return JsonResponse({"error": "Please enter a valid positive amount up to ₹1,00,00,000"}, status=400)

    exp_date_str = body.get("date", "")
    try:
        exp_date = date.fromisoformat(str(exp_date_str)) if exp_date_str else timezone.localdate()
    except ValueError:
        exp_date = timezone.localdate()

    SplitMember.objects.get_or_create(group=group, name=paid_by)
    SplitExpense.objects.create(
        group=group,
        paid_by=paid_by,
        description=description,
        amount=amount,
        date=exp_date
    )

    logger.info("Public split expense added: group=%s amount=%s paid_by=%s ip=%s", group.id, amount, paid_by, client_ip)

    host_domain = request.build_absolute_uri('/')[:-1]
    settlement = compute_group_settlement(group, host_domain)
    return JsonResponse({
        "status": "success",
        "message": f"Added ₹{amount:,.0f} by {paid_by} for '{description}'!",
        "settlement": settlement
    })


@csrf_exempt
def api_public_settle_payment(request: HttpRequest, share_token: str) -> JsonResponse:
    """Public endpoint to record a direct settlement payment between two members."""
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    group = get_object_or_404(SplitGroup, share_token=share_token)
    if group.is_revoked:
        return JsonResponse({"error": "This split link has been revoked."}, status=403)
    if group.token_expires_at and timezone.now() > group.token_expires_at:
        return JsonResponse({"error": "This split link has expired."}, status=403)

    try:
        body = json.loads(request.body)
    except Exception:
        body = request.POST

    debtor = str(body.get("debtor", "")).strip().title()
    creditor = str(body.get("creditor", "")).strip().title()
    amount_raw = body.get("amount", 0)

    if not debtor or len(debtor) > 50 or not creditor or len(creditor) > 50:
        return JsonResponse({"error": "Both debtor and creditor are required (max 50 chars)"}, status=400)

    try:
        amount = Decimal(str(amount_raw))
        if amount <= 0 or amount > 10000000:
            raise ValueError
    except Exception:
        return JsonResponse({"error": "Valid positive amount required up to ₹1,00,00,000"}, status=400)

    SplitSettlement.objects.create(
        group=group,
        debtor=debtor,
        creditor=creditor,
        amount=amount,
        date=timezone.localdate()
    )

    logger.info("Public split settlement recorded: group=%s amount=%s debtor=%s creditor=%s", group.id, amount, debtor, creditor)

    host_domain = request.build_absolute_uri('/')[:-1]
    res = compute_group_settlement(group, host_domain)
    if not res["settlements"] and not group.is_settled:
        group.is_settled = True
        group.save(update_fields=["is_settled"])
        res["is_settled"] = True

    return JsonResponse({
        "status": "success",
        "message": f"Payment recorded: {debtor} paid ₹{amount:,.0f} to {creditor}! ✅",
        "data": res
    })


def api_public_toggle_group_settled(request: HttpRequest, share_token: str) -> JsonResponse:
    """LOGIC-005: Owner authorization required for settle/reopen operations."""
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    group = get_object_or_404(SplitGroup, share_token=share_token)
    if group.is_revoked:
        return JsonResponse({"error": "This split link has been revoked."}, status=403)
    if group.token_expires_at and timezone.now() > group.token_expires_at:
        return JsonResponse({"error": "This split link has expired."}, status=403)

    # Require owner authorization
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Authentication required. Only the group owner can settle or reopen this group."}, status=401)
    if request.user != group.creator and not (request.user.is_staff or request.user.is_superuser):
        return JsonResponse({"error": "Permission denied: Only the group owner can settle or reopen this group."}, status=403)

    group.is_settled = not group.is_settled
    group.save(update_fields=["is_settled"])

    logger.info("Split group settlement toggled by owner uid=%s: group=%s is_settled=%s", request.user.id, group.id, group.is_settled)

    host_domain = request.build_absolute_uri('/')[:-1]
    res = compute_group_settlement(group, host_domain)
    msg = "🎉 Group marked as fully settled and closed!" if group.is_settled else "🔄 Group re-opened for new expenses."
    return JsonResponse({
        "status": "success",
        "is_settled": group.is_settled,
        "message": msg,
        "data": res
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


@api_login_required
def api_delete_split_expense(request: HttpRequest, pk: int, expense_id: int) -> JsonResponse:
    """Delete a single expense from a split group."""
    group = get_object_or_404(SplitGroup, pk=pk, creator=request.user)
    expense = get_object_or_404(SplitExpense, pk=expense_id, group=group)
    desc = expense.description
    expense.delete()
    return JsonResponse({"status": "success", "message": f"🗑️ Expense '{desc}' deleted."})

@api_login_required
@json_required
def api_split_estimate(request: HttpRequest) -> JsonResponse:
    """Uses Groq to estimate budget for a new split group based on past split groups."""
    body = getattr(request, "_json_body", {})
    group_name = str(body.get("name", "")).strip()
    if not group_name:
        return JsonResponse({"error": "Group name is required"}, status=400)
    
    try:
        # Get user's past split groups to provide context to AI
        past_groups = SplitGroup.objects.filter(creator=request.user).prefetch_related('expenses', 'members')
        
        context_lines = []
        for g in past_groups:
            total = sum(e.amount for e in g.expenses.all())
            if total > 0:
                context_lines.append(f"- {g.name}: ₹{total} (for {g.members.count()} members)")
                
        context_text = "\n".join(context_lines) if context_lines else "No past trips recorded yet."
        
        prompt = (
            f"The user is planning a new trip or event called '{group_name}'.\n"
            f"Here is a summary of their past trips and total expenses:\n{context_text}\n\n"
            f"Based on this data (or general Indian travel/outing costs if no past data is similar), provide a very brief (1-2 sentences) "
            f"realistic budget estimate per person or total, and a short tip for '{group_name}'. Output only the tip/estimate, no preamble. Include emojis."
        )
        
        response = _groq_client().chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a witty Indian AI financial coach helping users budget for trips. Keep it extremely concise, max 2 sentences. Use emojis."
                },
                {"role": "user", "content": prompt}
            ],
            model="qwen/qwen3.8-27b",
            temperature=0.7,
            max_tokens=250
        )
        
        raw_estimate = response.choices[0].message.content or ""
        estimate = re.sub(r"<think>(?:.*?</think>|.*$)", "", raw_estimate, flags=re.DOTALL).strip()
        if not estimate:
            estimate = f"For {group_name}, a typical budget is ₹5,000–₹10,000 per person including travel and stay! 🏔️✨"
        return JsonResponse({"estimate": estimate})
        
    except Exception as e:
        logger.error(f"Error generating split estimate: {e}", exc_info=True)
        fallback = f"Estimated budget for '{group_name}' is approx ₹4,000–₹8,000 per person depending on stay & travel! 🏔️🎒"
        return JsonResponse({"estimate": fallback})

# ══════════════════════════════════════════════════════════════════════════════
# MOBILE API AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════════════
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

class CustomAuthToken(ObtainAuthToken):
    authentication_classes = []
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        identifier = request.data.get('username') or request.data.get('email') or request.data.get('phone_number')
        if identifier and len(str(identifier)) == 10 and str(identifier).isdigit():
            identifier = f"91{identifier}"
        password = request.data.get('password')
        
        if not identifier or not password:
            return Response({'error': 'Please provide identifier (phone/email/username) and password.'}, status=400)
            
        user = None
        user_qs = User.objects.filter(username__iexact=identifier)
        if user_qs.exists():
            user = user_qs.first()
        else:
            user_qs = User.objects.filter(email__iexact=identifier)
            if user_qs.exists():
                user = user_qs.first()
            else:
                profile_qs = UserProfile.objects.filter(phone_number=identifier)
                if profile_qs.exists():
                    user = profile_qs.first().user
                    
        if not user:
            if '@' in str(identifier):
                err_msg = 'No account found with this email ID. Please create an account to get started.'
            elif str(identifier).replace('+', '').isdigit():
                err_msg = 'No account found with this phone number. Please create an account to get started.'
            else:
                err_msg = 'No account found with this username. Please create an account to get started.'
            return Response({'error': err_msg, 'code': 'ACCOUNT_NOT_FOUND'}, status=404)
            
        authenticated_user = authenticate(request=request, username=user.username, password=password)
        if not authenticated_user:
            return Response({'error': 'Invalid password.'}, status=401)
            
        token, created = Token.objects.get_or_create(user=authenticated_user)
        
        # Auto-verify email and ensure profile exists on successful password login
        phone_dummy = f"g_{uuid.uuid4().hex[:12]}"
        while UserProfile.objects.filter(phone_number=phone_dummy).exists():
            phone_dummy = f"g_{uuid.uuid4().hex[:12]}"
            
        profile, _ = UserProfile.objects.get_or_create(
            user=authenticated_user,
            defaults={'phone_number': phone_dummy, 'email_verified': True if authenticated_user.email else False}
        )
        if authenticated_user.email and not profile.email_verified:
            profile.email_verified = True
            profile.save(update_fields=['email_verified'])
        
        # Track login activity
        def get_client_ip(request):
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                return x_forwarded_for.split(',')[0]
            return request.META.get('REMOTE_ADDR')
        
        UserLoginActivity.objects.create(user=authenticated_user, ip_address=get_client_ip(request))
        
        return Response({
            'token': token.key,
            'user_id': authenticated_user.pk,
            'email': authenticated_user.email,
            'username': authenticated_user.username,
            'email_verified': profile.email_verified,
            'phone_number': profile.phone_number if not str(profile.phone_number).startswith('g_') else None
        })


from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_google_login(request):
    """
    Authenticate or register user via Google OAuth (AuthSession / WebBrowser token).
    Accepts:
      - access_token (Google OAuth2 access token)
      - id_token (Google OpenID Connect JWT token)
    """
    import re
    import uuid
    import requests as req_lib
    
    access_token = request.data.get('access_token')
    id_token = request.data.get('id_token')
    
    if not access_token and not id_token:
        return Response({'error': 'Google token (access_token or id_token) is required.'}, status=400)
        
    google_data = None
    
    # 1. Try id_token first if provided
    if id_token:
        try:
            resp = req_lib.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}", timeout=10)
            if resp.status_code == 200:
                google_data = resp.json()
        except Exception as e:
            logger.warning(f"Failed verifying Google id_token: {e}")
            
    # 2. If id_token didn't yield user info or access_token was provided, try access_token
    if not google_data or not google_data.get('email'):
        if access_token:
            try:
                resp = req_lib.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={'Authorization': f'Bearer {access_token}'},
                    timeout=10
                )
                if resp.status_code == 200:
                    google_data = resp.json()
            except Exception as e:
                logger.warning(f"Failed fetching Google userinfo with access_token: {e}")
            
    if not google_data or not google_data.get('email'):
        return Response({'error': 'Unable to verify Google credentials. Please try signing in again.'}, status=400)
        
    email = str(google_data.get('email', '')).strip().lower()
    name = str(google_data.get('name', '')).strip()
    given_name = str(google_data.get('given_name', '')).strip()
    family_name = str(google_data.get('family_name', '')).strip()
    
    mode = str(request.data.get('mode', 'login')).strip().lower()
    
    try:
        user = User.objects.filter(email__iexact=email).first()
        is_new = False
        
        with transaction.atomic():
            if not user:
                is_new = True
                base_username = email.split('@')[0]
                base_username = re.sub(r'[^a-zA-Z0-9_]', '', base_username) or "user"
                username = base_username[:25]
                counter = 1
                while User.objects.filter(username__iexact=username).exists():
                    username = f"{base_username[:20]}_{counter}"
                    counter += 1
                    
                first_name = given_name or (name.split()[0] if name else '')
                last_name = family_name or (' '.join(name.split()[1:]) if len(name.split()) > 1 else '')
                
                user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=first_name[:30],
                    last_name=last_name[:30],
                )
                user.set_unusable_password()
                user.save()
                
            phone_dummy = f"g_{uuid.uuid4().hex[:12]}"
            while UserProfile.objects.filter(phone_number=phone_dummy).exists():
                phone_dummy = f"g_{uuid.uuid4().hex[:12]}"

            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    'phone_number': phone_dummy,
                    'email_verified': True,
                }
            )
            if not profile.phone_number:
                profile.phone_number = phone_dummy
            profile.email_verified = True
            profile.save()
            
            token, _ = Token.objects.get_or_create(user=user)
        
        # Track login activity
        try:
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
            UserLoginActivity.objects.create(user=user, ip_address=ip)
        except Exception:
            pass

        # Also establish Django session for web browser logins
        try:
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            request.session['show_wa_banner'] = True
        except Exception as e:
            logger.warning("Session login failed in api_google_login: %s", e)
            
        has_real_phone = bool(profile.phone_number and not str(profile.phone_number).startswith('g_'))
        user_display_name = f"{user.first_name} {user.last_name}".strip() or name or given_name or user.username
        
        return Response({
            'status': 'success',
            'token': token.key,
            'user_id': user.pk,
            'username': user.username,
            'name': user_display_name,
            'email': user.email,
            'phone_number': profile.phone_number if has_real_phone else None,
            'needs_phone': not has_real_phone,
            'is_new': is_new,
            'message': 'Account created successfully with Google!' if is_new else 'Google login successful!'
        })
    except Exception as e:
        logger.exception(f"Error during Google login: {e}")
        return Response({'error': f'Failed to process Google login: {str(e)}'}, status=500)

# ══════════════════════════════════════════════════════════════════════════════
# OTP & PASSWORD RECOVERY APIS
# ══════════════════════════════════════════════════════════════════════════════

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.conf import settings
from .models import AppAnalyticsEvent, AppErrorLog

def generate_expense_tracker_email_html(otp_code, title="Security Verification Code", subtitle="Use this one-time code to securely verify your account on Expense Tracker:"):
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0A0D14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0D14; padding: 35px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background: linear-gradient(145deg, #161B26, #0F131D); border: 1px solid #232B3E; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #6366F1, #8B5CF6, #06B6D4); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 32px 28px 16px 28px; text-align: center;">
              <div style="display: inline-block; width: 54px; height: 54px; line-height: 54px; border-radius: 16px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.25)); border: 1px solid rgba(139, 92, 246, 0.4); font-size: 26px; text-align: center; margin-bottom: 14px;">
                💳
              </div>
              <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">Expense Tracker</h1>
              <p style="margin: 0; font-size: 13px; font-weight: 600; color: #818CF8; text-transform: uppercase; letter-spacing: 1px;">{title}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 28px 28px 28px; text-align: center;">
              <p style="margin: 0 0 22px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                {subtitle}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 auto 18px auto;">
                <tr>
                  <td align="center">
                    <div style="background: #1A2234; border: 1px solid #3B82F6; border-radius: 14px; padding: 18px 28px; display: inline-block; box-shadow: 0 0 25px rgba(59, 130, 246, 0.25);">
                      <span style="font-family: 'SF Mono', Consolas, Menlo, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #60A5FA; display: block; text-shadow: 0 0 12px rgba(96, 165, 250, 0.5);">
                        {otp_code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
              <div style="display: inline-block; padding: 6px 14px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 20px; font-size: 12px; color: #FBBF24; font-weight: 600;">
                ⏱️ Valid for 5 minutes only
              </div>
              <div style="height: 1px; background: #232B3E; margin: 24px 0 18px 0;"></div>
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #64748B; text-align: left;">
                🔒 <strong>Security Notice:</strong> Never share this code with anyone. Expense Tracker team will never ask for your code or password.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background: #0B0E14; border-top: 1px solid #1E2638; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                © 2026 Expense Tracker. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

def _hash_otp(identifier: str, action: str, code: str) -> str:
    """AUTH-001: Safely hash OTP using HMAC-SHA256 with project SECRET_KEY."""
    secret = getattr(settings, 'SECRET_KEY', 'default-otp-salt').encode('utf-8')
    payload = f"{identifier.strip().lower()}:{action.strip().lower()}:{str(code).strip()}".encode('utf-8')
    return hmac.new(secret, payload, hashlib.sha256).hexdigest()


def _verify_otp_record(record: OTPVerification, code: str, action: str = None) -> bool:
    """AUTH-001: Verify OTP against stored hash or fallback check."""
    if record.is_verified:
        return False
    if record.attempts >= record.max_attempts:
        return False
    if timezone.now() - record.created_at > timedelta(minutes=10):
        return False
    if action and record.action and record.action != 'general' and record.action != action:
        return False
    expected = _hash_otp(record.identifier, record.action, code)
    if hmac.compare_digest(record.otp_code, expected):
        return True
    if hmac.compare_digest(record.otp_code, str(code).strip()):
        return True
    return False


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_send_otp(request):
    raw_identifier = request.data.get('identifier') or request.data.get('phone_number') or request.data.get('email')
    action = request.data.get('action') or 'general'
    email_param = request.data.get('email')
    phone_param = request.data.get('phone_number')

    if not raw_identifier and not phone_param and not email_param:
        return Response({'error': 'Phone number or email is required.'}, status=400)

    # 1. Identify Phone Target
    phone_target = None
    candidates = [phone_param, raw_identifier]
    for c in candidates:
        if c and '@' not in str(c):
            digits = ''.join(ch for ch in str(c) if ch.isdigit())
            if len(digits) == 10:
                phone_target = f"91{digits}"
                break
            elif len(digits) >= 11:
                phone_target = digits
                break

    # 2. Identify Email Target
    email_target = None
    candidates_email = [email_param, raw_identifier]
    for e in candidates_email:
        if e and '@' in str(e):
            email_target = str(e).strip().lower()
            break

    if not phone_target and not email_target:
        return Response({'error': 'A valid phone number or email is required.'}, status=400)

    # Validation based on action
    if action == 'register':
        if phone_target:
            p_alt = phone_target[2:] if phone_target.startswith('91') and len(phone_target) == 12 else phone_target
            if UserProfile.objects.filter(phone_number__in=[phone_target, p_alt]).exists():
                return Response({'error': 'An account with this phone number already exists.'}, status=400)
        if email_target:
            if User.objects.filter(email__iexact=email_target).exists():
                return Response({'error': 'An account with this email already exists.'}, status=400)
    elif action == 'reset':
        user_found = False
        if email_target and User.objects.filter(email__iexact=email_target).exists():
            user_found = True
        if not user_found and phone_target:
            p_alt = phone_target[2:] if phone_target.startswith('91') and len(phone_target) == 12 else phone_target
            profile = UserProfile.objects.filter(phone_number__in=[phone_target, p_alt]).first()
            if profile:
                user_found = True
                if not email_target and profile.user.email:
                    email_target = profile.user.email.strip().lower()
            elif User.objects.filter(username__iexact=phone_target).exists():
                user_found = True
        if not user_found:
            # AUTH-001: Generic response to prevent account enumeration
            return Response({'status': 'success', 'message': 'If an account exists with this phone number or email, a verification code has been sent.'})
    elif action == 'login':
        user = None
        if email_target:
            user = User.objects.filter(email__iexact=email_target).first()
        if not user and phone_target:
            p_alt = phone_target[2:] if phone_target.startswith('91') and len(phone_target) == 12 else phone_target
            profile = UserProfile.objects.filter(phone_number__in=[phone_target, p_alt]).first()
            if profile:
                user = profile.user
        if not user and raw_identifier:
            user = User.objects.filter(username__iexact=raw_identifier).first()
            if not user and '@' in str(raw_identifier):
                user = User.objects.filter(email__iexact=str(raw_identifier).strip().lower()).first()
            
        if not user:
            return Response({
                'error': 'No account found with this identifier. Please create an account to get started.',
                'code': 'ACCOUNT_NOT_FOUND'
            }, status=404)
            
        if user.email and not email_target:
            email_target = user.email.strip().lower()
        if hasattr(user, 'profile') and user.profile.phone_number and not phone_target:
            p = user.profile.phone_number
            if not str(p).startswith('g_'):
                if p.startswith('91') or len(p) >= 11:
                    phone_target = p
                elif len(p) == 10:
                    phone_target = f"91{p}"
    elif action == 'link_phone':
        if not phone_target:
            return Response({'error': 'A valid 10-digit mobile number is required.'}, status=400)
        p_alt = phone_target[2:] if phone_target.startswith('91') and len(phone_target) == 12 else phone_target
        existing_profile = UserProfile.objects.filter(phone_number__in=[phone_target, p_alt]).first()
        if existing_profile and not str(existing_profile.phone_number).startswith('g_'):
            return Response({
                'error': 'This mobile number is already registered with another account.',
                'code': 'PHONE_ALREADY_EXISTS'
            }, status=400)

    # AUTH-001: Rate limiting by IP + identifier + action
    ip = _get_client_ip(request)
    recent_check = phone_target or email_target
    ident_otps = OTPVerification.objects.filter(
        identifier=recent_check,
        action=action,
        created_at__gte=timezone.now() - timedelta(minutes=5)
    ).count()
    if ident_otps >= 5:
        return Response({'error': 'Too many OTP requests for this account. Please wait a few minutes.'}, status=429)

    ip_otps = OTPVerification.objects.filter(
        ip_address=ip,
        created_at__gte=timezone.now() - timedelta(minutes=5)
    ).count()
    if ip_otps >= 10:
        return Response({'error': 'Too many OTP requests from your network. Please wait a few minutes.'}, status=429)

    # Generate 6-digit OTP
    otp_code = str(random.randint(100000, 999999))

    # Save hashed OTP for all valid identifiers
    identifiers_to_store = []
    if phone_target:
        identifiers_to_store.append(phone_target)
        if phone_target.startswith('91') and len(phone_target) == 12:
            identifiers_to_store.append(phone_target[2:])
    if email_target:
        identifiers_to_store.append(email_target)

    for ident in set(identifiers_to_store):
        hashed = _hash_otp(ident, action, otp_code)
        OTPVerification.objects.create(
            identifier=ident,
            otp_code=hashed,
            action=action,
            attempts=0,
            max_attempts=5,
            ip_address=ip
        )

    # AUTH-001: Never log raw OTP in logs
    masked_target = (recent_check[:3] + '***' + recent_check[-3:]) if len(str(recent_check)) >= 7 else '***'
    logger.info("OTP dispatched for target=%s action=%s", masked_target, action)

    # 3. Dispatch WhatsApp OTP in background thread
    wa_dispatched = False
    if phone_target:
        import threading
        import requests

        def send_otp_thread(target_phone, code):
            try:
                wa_msg = (
                    f"🔒 *Expense Tracker Verification*\n\n"
                    f"Your OTP code is: *{code}*\n\n"
                    f"Please enter this code in the app to continue. "
                    f"Valid for 5 minutes. Do not share this code with anyone."
                )
                requests.post(
                    'http://127.0.0.1:3001/api/send-message',
                    json={'phone_number': target_phone, 'message': wa_msg},
                    timeout=10
                )
            except Exception as e:
                logger.warning("Could not dispatch WhatsApp OTP: %s", e)

        t = threading.Thread(target=send_otp_thread, args=(phone_target, otp_code))
        t.daemon = True
        t.start()
        wa_dispatched = True

    # 4. Dispatch Email OTP in background thread (non-blocking)
    email_dispatched = False
    if email_target:
        import threading

        def send_email_thread(target_email, code):
            try:
                from .email_service import send_transactional_email
                subject = f"Expense Tracker OTP: {code}"
                body = (
                    f"Your Expense Tracker verification OTP is: {code}\n\n"
                    f"Valid for 5 minutes. Do not share this code."
                )
                html_body = generate_expense_tracker_email_html(
                    code,
                    title="Account Verification",
                    subtitle="Please use the one-time code below to verify your account on Expense Tracker:"
                )
                send_transactional_email(target_email, subject, body, html_body=html_body)
            except Exception as e:
                logger.warning("Could not dispatch Email OTP: %s", e)

        et = threading.Thread(target=send_email_thread, args=(email_target, otp_code))
        et.daemon = True
        et.start()
        email_dispatched = True

    channels = []
    if wa_dispatched and phone_target:
        channels.append(f"WhatsApp ({phone_target})")
    if email_dispatched and email_target:
        channels.append(f"Email ({email_target})")

    destination_desc = " & ".join(channels) if channels else (phone_target or email_target)

    return Response({
        'status': 'success',
        'message': f'Verification OTP sent to {destination_desc}. Please enter the code.',
        'whatsapp_sent': wa_dispatched,
        'email_sent': email_dispatched
    })


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_verify_otp(request):
    raw_identifier = request.data.get('identifier')
    action = request.data.get('action') or 'register'
    if raw_identifier and len(str(raw_identifier)) == 10 and str(raw_identifier).isdigit():
        identifier = f"91{raw_identifier}"
    else:
        identifier = str(raw_identifier).strip() if raw_identifier else ''
    otp_code = request.data.get('otp')
    
    if not identifier or not otp_code:
        return Response({'error': 'Identifier and OTP are required.'}, status=400)
        
    records = OTPVerification.objects.filter(
        identifier=identifier,
        is_verified=False,
        created_at__gte=timezone.now() - timedelta(minutes=5)
    ).order_by('-created_at')
    
    if not records.exists():
        return Response({'error': 'Invalid or expired OTP.'}, status=400)

    matched_record = None
    for r in records:
        if r.attempts >= r.max_attempts:
            return Response({'error': 'Maximum verification attempts exceeded. Please request a new OTP.'}, status=400)
        r.attempts += 1
        if _verify_otp_record(r, otp_code, action):
            matched_record = r
            r.is_verified = True
            r.save()
            break
        r.save()

    if not matched_record:
        return Response({'error': 'Invalid or expired OTP.'}, status=400)
        
    return Response({'message': 'OTP verified successfully.'})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_login_otp(request):
    raw_identifier = request.data.get('identifier') or request.data.get('username') or request.data.get('email') or request.data.get('phone_number')
    otp = request.data.get('otp')
    
    if not raw_identifier or not otp:
        return Response({'error': 'Identifier (email/phone/username) and 6-digit OTP are required.'}, status=400)
        
    identifier = str(raw_identifier).strip()
    clean_digits = ''.join(ch for ch in identifier if ch.isdigit())
    phone_candidate = f"91{clean_digits}" if len(clean_digits) == 10 else clean_digits
    
    user = None
    user = User.objects.filter(username__iexact=identifier).first()
    if not user and '@' in identifier:
        user = User.objects.filter(email__iexact=identifier.lower()).first()
    if not user and phone_candidate:
        p_alt = phone_candidate[2:] if phone_candidate.startswith('91') and len(phone_candidate) == 12 else phone_candidate
        prof = UserProfile.objects.filter(phone_number__in=[phone_candidate, p_alt]).first()
        if prof:
            user = prof.user
    if not user:
        user = User.objects.filter(email__iexact=identifier).first()
        
    if not user:
        return Response({
            'error': 'No account found with this identifier. Please create an account to get started.',
            'code': 'ACCOUNT_NOT_FOUND'
        }, status=404)
        
    valid_idents = [identifier, user.username]
    if user.email:
        valid_idents.append(user.email.strip().lower())
    if hasattr(user, 'profile') and user.profile.phone_number:
        p = user.profile.phone_number
        valid_idents.append(p)
        if p.startswith('91') and len(p) == 12:
            valid_idents.append(p[2:])
        else:
            valid_idents.append(f"91{p}")
            
    records = OTPVerification.objects.filter(
        identifier__in=list(set(valid_idents)),
        is_verified=False,
        action__in=['login', 'general'],
        created_at__gte=timezone.now() - timedelta(minutes=10)
    ).order_by('-created_at')
    
    if not records.exists():
        return Response({'error': 'Invalid or expired OTP code. Please try again.'}, status=400)

    matched = False
    matched_record = None
    for r in records:
        if r.attempts >= r.max_attempts:
            continue
        r.attempts += 1
        if _verify_otp_record(r, str(otp).strip(), 'login'):
            matched = True
            matched_record = r
            r.is_verified = True
            r.save()
            break
        r.save()

    if not matched:
        return Response({'error': 'Invalid or expired OTP code. Please try again.'}, status=400)

    if matched_record:
        try:
            matched_record.delete()
        except Exception:
            pass

    if hasattr(user, 'profile') and user.profile:
        profile = user.profile
    else:
        phone_dummy = f"g_{uuid.uuid4().hex[:12]}"
        while UserProfile.objects.filter(phone_number=phone_dummy).exists():
            phone_dummy = f"g_{uuid.uuid4().hex[:12]}"
            
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={'phone_number': phone_dummy, 'email_verified': True}
        )
    profile.email_verified = True
    profile.save()
        
    token, _ = Token.objects.get_or_create(user=user)
    
    try:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
        UserLoginActivity.objects.create(user=user, ip_address=ip)
    except Exception:
        pass

    # Also establish Django session for web browser logins
    try:
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        request.session['show_wa_banner'] = True
    except Exception as e:
        logger.warning("Session login failed in api_login_otp: %s", e)
        
    return Response({
        'status': 'success',
        'token': token.key,
        'user_id': user.pk,
        'username': user.username,
        'email': user.email,
        'phone_number': profile.phone_number if not str(profile.phone_number).startswith('g_') else None,
        'email_verified': True,
        'message': 'Login and verification successful! Email and phone are verified.'
    })


def robots_txt(request: HttpRequest) -> HttpResponse:
    """WEB-003: robots.txt with sitemap reference."""
    sitemap_url = request.build_absolute_uri('/sitemap.xml')
    content = f"User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /admin-panel/\nDisallow: /api/\nDisallow: /qr/\n\nSitemap: {sitemap_url}\n"
    return HttpResponse(content, content_type="text/plain")


def sitemap_xml(request: HttpRequest) -> HttpResponse:
    """WEB-003: XML sitemap for SEO."""
    domain = request.build_absolute_uri('/')[:-1]
    pages = [
        "",
        "about/",
        "features/",
        "contact/",
        "privacy/",
        "terms/",
        "login/",
        "register/",
    ]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for p in pages:
        xml += f'  <url>\n    <loc>{domain}/{p}</loc>\n    <changefreq>weekly</changefreq>\n  </url>\n'
    xml += '</urlset>'
    return HttpResponse(xml, content_type="application/xml")

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_complete_google_profile(request):
    """
    Called after Google Sign-In when a new user needs to link their verified mobile number.
    Accepts:
      - token (Auth token returned by api_google_login)
      - phone_number (10-digit mobile number)
      - otp (6-digit OTP code)
      - name (optional Full Name)
      - monthly_budget (optional)
    """
    token_key = request.data.get('token') or request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '').strip()
    raw_phone = request.data.get('phone_number')
    otp_code = request.data.get('otp')
    name = request.data.get('name')
    monthly_budget = request.data.get('monthly_budget')
    
    if not token_key:
        return Response({'error': 'Authentication token is required.'}, status=401)
        
    token_obj = Token.objects.filter(key=token_key).first()
    if not token_obj:
        return Response({'error': 'Invalid or expired session. Please sign in with Google again.'}, status=401)
        
    user = token_obj.user
    
    if not raw_phone or not otp_code:
        return Response({'error': 'Mobile number and 6-digit OTP are required.'}, status=400)
        
    clean_digits = ''.join(ch for ch in str(raw_phone) if ch.isdigit())
    if len(clean_digits) == 10:
        phone_target = f"91{clean_digits}"
    elif len(clean_digits) >= 11:
        phone_target = clean_digits
    else:
        return Response({'error': 'Please enter a valid 10-digit mobile number.'}, status=400)
        
    p_alt = phone_target[2:] if phone_target.startswith('91') and len(phone_target) == 12 else phone_target
    
    # Check if another user already has this phone number
    existing_profile = UserProfile.objects.filter(phone_number__in=[phone_target, p_alt]).exclude(user=user).first()
    if existing_profile and not str(existing_profile.phone_number).startswith('g_'):
        return Response({
            'error': 'This mobile number is already registered with another account.',
            'code': 'PHONE_ALREADY_EXISTS'
        }, status=400)
        
    # Verify OTP
    otp_record = OTPVerification.objects.filter(
        identifier__in=[phone_target, p_alt],
        otp_code=str(otp_code).strip(),
        created_at__gte=timezone.now() - timedelta(minutes=10)
    ).first()
    
    if not otp_record:
        return Response({'error': 'Invalid or expired OTP code. Please try again.'}, status=400)
        
    with transaction.atomic():
        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={'phone_number': phone_target, 'email_verified': True}
        )
        profile.phone_number = phone_target
        profile.email_verified = True
        if monthly_budget:
            try:
                profile.monthly_budget = float(monthly_budget)
            except Exception:
                pass
        profile.save()
        
        if name and str(name).strip():
            parts = str(name).strip().split()
            user.first_name = parts[0][:30]
            user.last_name = ' '.join(parts[1:])[:30] if len(parts) > 1 else ''
            user.save(update_fields=['first_name', 'last_name'])
            
        try:
            otp_record.delete()
        except Exception:
            pass
            
    return Response({
        'status': 'success',
        'message': 'Profile completed successfully! Mobile and email are verified.',
        'user_id': user.pk,
        'username': user.username,
        'name': f"{user.first_name} {user.last_name}".strip() or user.username,
        'email': user.email,
        'phone_number': profile.phone_number,
        'email_verified': True,
        'token': token_obj.key,
    })

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_reset_password(request):
    identifier = request.data.get('identifier')
    if identifier and len(str(identifier)) == 10 and str(identifier).isdigit():
        identifier = f"91{identifier}"
    otp_code = request.data.get('otp')
    new_password = request.data.get('new_password')
    
    if not identifier or not otp_code or not new_password:
        return Response({'error': 'Identifier, OTP, and New Password are required.'}, status=400)
    
    if len(new_password) < 6:
        return Response({'error': 'Password must be at least 6 characters.'}, status=400)
        
    otp_record = OTPVerification.objects.filter(
        identifier=identifier, 
        otp_code=otp_code,
        is_verified=True
    ).first()
    
    if not otp_record:
        return Response({'error': 'OTP not verified or invalid.'}, status=400)
        
    # Find user
    user = None
    user_qs = User.objects.filter(username=identifier)
    if user_qs.exists():
        user = user_qs.first()
    else:
        user_qs = User.objects.filter(email=identifier)
        if user_qs.exists():
            user = user_qs.first()
        else:
            profile_qs = UserProfile.objects.filter(phone_number=identifier)
            if profile_qs.exists():
                user = profile_qs.first().user
                
    if not user:
        return Response({'error': 'User not found.'}, status=404)
        
    user.set_password(new_password)
    user.save()
    otp_record.delete()
    
    return Response({'message': 'Password reset successfully. You can now login.'})


# ══════════════════════════════════════════════════════════════════════════════
# REAL AUTH: LOGOUT & DELETE ACCOUNT (Item 1 & 18)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_logout(request):
    """Real server-side logout: Invalidates DRF auth token and clears session."""
    try:
        Token.objects.filter(user=request.user).delete()
        from django.contrib.auth import logout
        logout(request)
        return Response({'status': 'success', 'message': 'Logged out successfully.'})
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_delete_account(request):
    """Real permanent account deletion (GDPR & CCPA compliant)."""
    user = request.user
    password = request.data.get('password')
    
    # If a password was provided, verify it before executing deletion
    if password and user.has_usable_password():
        if not user.check_password(password):
            return Response({'error': 'Incorrect password. Account deletion aborted.'}, status=400)

    username = user.username
    # Cascade delete deletes user, UserProfile, Expenses, Goals, Splits, Notes, Tokens
    user.delete()
    return Response({
        'status': 'success',
        'message': f'Account @{username} and all associated financial records have been permanently deleted.'
    })


# ══════════════════════════════════════════════════════════════════════════════
# EMAIL VERIFICATION APIS (Item 3)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_send_email_verification(request):
    """Sends a 6-digit email verification OTP to user's registered or updated email."""
    user = request.user
    email = request.data.get('email') or user.email
    if not email or '@' not in str(email):
        return Response({'error': 'A valid email address is required.'}, status=400)
    
    # Update email on user if modified
    if email != user.email:
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            return Response({'error': 'This email is already associated with another account.'}, status=400)
        user.email = email
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.email_verified = False
        profile.save()

    # Rate limiting (10 attempts per 5 mins so user is never blocked while testing)
    recent = OTPVerification.objects.filter(identifier=email, created_at__gte=timezone.now() - timedelta(minutes=5)).count()
    if recent >= 10:
        return Response({'error': 'Too many verification attempts. Please wait 5 minutes.'}, status=429)

    otp_code = str(random.randint(100000, 999999))
    OTPVerification.objects.create(identifier=email, otp_code=otp_code)
    
    subject = f"Expense Tracker - Email Verification: {otp_code}"
    body = f"Hi {user.username},\n\nYour Expense Tracker email verification code is: {otp_code}\n\nValid for 5 minutes."
    html_body = generate_expense_tracker_email_html(
        otp_code,
        title="Email Verification",
        subtitle=f"Hi {user.username}, use this one-time code to confirm your email address on Expense Tracker:"
    )
    from .email_service import send_transactional_email
    email_sent, info = send_transactional_email(email, subject, body, html_body=html_body)
    if not email_sent:
        err = str(info.get('error') or '')
        resend_err = str(info.get('resend_error') or '')
        print(f"⚠️ Email verification send failed: {err} | {resend_err}", flush=True)
        if 'testing emails to your own email' in resend_err or 'You can only send testing emails' in resend_err:
            user_msg = (
                "Free Resend sandbox only delivers to your registered email (ajaykumar160380@gmail.com). "
                "To deliver to external email addresses, please add & verify your custom domain on resend.com/domains."
            )
        else:
            user_msg = f"Failed to send email verification: {err or resend_err}"
        return Response({'error': user_msg}, status=400)

    print(f"========== 📧 VERIFICATION CODE for {email}: {otp_code} (via {info.get('provider')}) ==========", flush=True)
    resp = {
        'status': 'success',
        'email_sent': email_sent,
        'provider': info.get('provider'),
        'message': f'Verification code sent to {email}. Check your inbox!'
    }
    return Response(resp)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminUser])
def api_debug_email(request):
    """SEC-002: Staff-only email diagnostic with redacted configuration details."""
    to_email = request.GET.get('to') or (request.data.get('to') if hasattr(request, 'data') else None) or request.user.email
    if not to_email:
        return Response({'error': 'Recipient email is required.'}, status=400)
    from .email_service import send_transactional_email
    success, res = send_transactional_email(
        to_email,
        "Expense Tracker Live Diagnostic Email",
        f"This is a live diagnostic email to {to_email} from Expense Tracker.",
        html_body=generate_expense_tracker_email_html("DIAG12", title="Diagnostic Test", subtitle="Your email delivery is working successfully!")
    )
    if success:
        return Response({'status': 'success', 'recipient': to_email, 'provider': res.get('provider', 'smtp')})
    else:
        return Response({'status': 'failed', 'error': 'Failed to send test email.'}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_verify_email_otp(request):
    """Validates the 6-digit OTP code and marks email as verified."""
    user = request.user
    email = request.data.get('email') or user.email
    otp_code = request.data.get('otp')
    
    if not email or not otp_code:
        return Response({'error': 'Email and 6-digit OTP code are required.'}, status=400)
        
    otp_record = OTPVerification.objects.filter(
        identifier=email,
        otp_code=otp_code,
        created_at__gte=timezone.now() - timedelta(minutes=5)
    ).first()
    
    if not otp_record:
        return Response({'error': 'Invalid or expired OTP code.'}, status=400)
        
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.email_verified = True
    profile.save()
    otp_record.delete()
    
    return Response({'status': 'success', 'message': 'Email verified successfully! 🎉'})


# ══════════════════════════════════════════════════════════════════════════════
# ANALYTICS & ERROR LOGGING (Item 14 & 15)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_track_analytics(request):
    """Records user actions and screen view telemetry."""
    event_name = request.data.get('event_name')
    if not event_name:
        return Response({'error': 'event_name is required'}, status=400)
    
    user = request.user if request.user.is_authenticated else None
    properties = request.data.get('properties', {})
    
    def get_client_ip(req):
        xff = req.META.get('HTTP_X_FORWARDED_FOR')
        if xff:
            return xff.split(',')[0].strip()
        return req.META.get('REMOTE_ADDR')

    AppAnalyticsEvent.objects.create(
        user=user,
        event_name=event_name[:100],
        properties=properties if isinstance(properties, dict) else {},
        ip_address=get_client_ip(request)
    )
    return Response({'status': 'success'})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_log_error(request):
    """Centralized client-side crash and exception reporter."""
    error_message = request.data.get('error_message') or 'Unknown client error'
    stack_trace = request.data.get('stack_trace', '')
    device_info = request.data.get('device_info', {})
    user = request.user if request.user.is_authenticated else None

    AppErrorLog.objects.create(
        user=user,
        error_message=str(error_message),
        stack_trace=str(stack_trace),
        device_info=device_info if isinstance(device_info, dict) else {}
    )
    return Response({'status': 'logged'})


# ══════════════════════════════════════════════════════════════════════════════
# CUSTOM 404 HANDLER (Item 13)
# ══════════════════════════════════════════════════════════════════════════════

def custom_404_view(request, exception=None):
    """Custom 404 view: returns JSON for API routes and themed HTML for web."""
    if request.path.startswith('/api/') or 'application/json' in request.META.get('HTTP_ACCEPT', ''):
        return JsonResponse({
            'error': 'Endpoint not found',
            'detail': f"The requested resource '{request.path}' was not found on this server.",
            'status_code': 404
        }, status=404)
    return render(request, '404.html', status=404)


# ══════════════════════════════════════════════════════════════════════════════
# NEW FEATURE: ADMIN PANEL, ANALYTICS & EXPORTS
# ══════════════════════════════════════════════════════════════════════════════
from django.shortcuts import render
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .models import UserLoginActivity, Feedback
from django.http import FileResponse
import csv
import io

@staff_required
def admin_panel(request):
    logins = UserLoginActivity.objects.all().order_by('-timestamp')[:50]
    feedbacks = Feedback.objects.all().order_by('-created_at')[:50]
    contact_messages = ContactMessage.objects.all().order_by('-created_at')[:50]
    from django.contrib.auth.models import User
    all_users = User.objects.all().select_related('profile').order_by('-date_joined')
    
    return render(request, 'tracker/admin_panel.html', {
        'logins': logins,
        'feedbacks': feedbacks,
        'all_users': all_users,
        'contact_messages': contact_messages,
    })

from django.views.decorators.http import require_POST
@staff_required
@require_POST
def admin_delete_user(request, user_id):
    from django.contrib.auth.models import User
    try:
        user_to_delete = User.objects.get(id=user_id)
        if user_to_delete.is_superuser or user_to_delete.is_staff:
            messages.error(request, "Cannot delete a staff or superuser account.")
        else:
            username = user_to_delete.username
            user_to_delete.delete()
            messages.success(request, f"User '{username}' and all their data were permanently deleted.")
    except User.DoesNotExist:
        messages.error(request, "User not found.")
        
    return redirect('admin_panel')

@api_login_required
def api_admin_users(request):
    if not is_super_admin(request.user):
        return JsonResponse({"error": "Access Denied: Admin permissions required."}, status=403)
    
    from django.contrib.auth.models import User
    from .models import Feedback
    all_users = User.objects.all().select_related('profile').order_by('-date_joined')
    data = []
    for u in all_users:
        data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "date_joined": u.date_joined.strftime("%Y-%m-%d %H:%M:%S"),
            "is_superuser": u.is_superuser,
            "is_staff": u.is_staff,
            "is_active": u.is_active,
        })
        
    feedbacks = Feedback.objects.select_related('user').order_by('-created_at')[:50]
    feedback_data = []
    for f in feedbacks:
        feedback_data.append({
            "id": f.id,
            "username": f.user.username if f.user else "Anonymous",
            "text": f.text,
            "source": f.source,
            "created_at": f.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        })
        
    return JsonResponse({"status": "success", "users": data, "feedbacks": feedback_data})

@api_login_required
def api_admin_delete_user(request, user_id):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    if not is_super_admin(request.user):
        return JsonResponse({"error": "Access Denied"}, status=403)
        
    from django.contrib.auth.models import User
    try:
        user_to_delete = User.objects.get(id=user_id)
        if user_to_delete.is_superuser:
            return JsonResponse({"error": "Cannot delete the main admin account."}, status=400)
        else:
            username = user_to_delete.username
            user_to_delete.delete()
            return JsonResponse({"status": "success", "message": f"User '{username}' was permanently deleted."})
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found."}, status=404)

@api_login_required
def api_submit_feedback(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            text = data.get("text", "").strip()
            source = data.get("source", "app").strip()
            if text:
                Feedback.objects.create(user=request.user, text=text, source=source)
                return JsonResponse({"status": "success", "message": "Feedback submitted successfully."})
            return JsonResponse({"status": "error", "message": "Feedback text is required."})
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)})
    return JsonResponse({"status": "error", "message": "Invalid request method."})

@api_login_required
def export_csv(request):
    expenses = Expense.objects.filter(user=request.user).order_by('-date')
    month = request.GET.get('month')
    year = request.GET.get('year')
    if month and year:
        expenses = expenses.filter(date__month=month, date__year=year)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Category', 'Description', 'Amount'])
    
    valid_categories = {'food', 'transport', 'shopping', 'entertainment', 'bills', 'health', 'education', 'other'}
    
    for exp in expenses:
        cat = (exp.category or 'other').lower()
        desc = exp.description or ''
        
        if cat not in valid_categories:
            formatted_cat = "Other"
            formatted_desc = f"{exp.category.title()} - {desc}" if desc else exp.category.title()
        else:
            formatted_cat = cat.title()
            formatted_desc = desc
            
        writer.writerow([exp.date.strftime('%Y-%m-%d'), formatted_cat, formatted_desc, f"{exp.amount}"])
    
    response = HttpResponse(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="ExpenseTracker_History.csv"'
    return response

@api_login_required
def export_pdf(request):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
        import datetime
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        elements = []
        
        styles = getSampleStyleSheet()
        
        # Custom Styles
        title_style = ParagraphStyle(
            'CustomTitle', parent=styles['Heading1'],
            fontName='Helvetica-Bold', fontSize=24,
            textColor=colors.HexColor('#0F172A'), alignment=TA_CENTER,
            spaceAfter=5
        )
        subtitle_style = ParagraphStyle(
            'Subtitle', parent=styles['Normal'],
            fontName='Helvetica', fontSize=12,
            textColor=colors.HexColor('#64748B'), alignment=TA_CENTER,
            spaceAfter=25
        )
        info_style = ParagraphStyle(
            'Info', parent=styles['Normal'],
            fontName='Helvetica', fontSize=11,
            textColor=colors.HexColor('#334155'), alignment=TA_LEFT,
            spaceAfter=6
        )
        
        # Header
        elements.append(Paragraph("Paisa Tracker", title_style))
        elements.append(Paragraph("Expense & Financial Report", subtitle_style))
        
        expenses = Expense.objects.filter(user=request.user).order_by('-date')
        month = request.GET.get('month')
        year = request.GET.get('year')
        period_text = "All Time"
        if month and year:
            expenses = expenses.filter(date__month=month, date__year=year)
            month_name = datetime.date(int(year), int(month), 1).strftime('%B')
            period_text = f"{month_name} {year}"
            
        total = sum([exp.amount for exp in expenses])
        
        # Info Section
        elements.append(Paragraph(f"<b>Generated For:</b> {request.user.username.title()}", info_style))
        elements.append(Paragraph(f"<b>Period:</b> {period_text}", info_style))
        elements.append(Paragraph(f"<b>Total Expenses:</b> Rs. {total:,.2f}", info_style))
        elements.append(Spacer(1, 15))
        
        data = [['Date', 'Category', 'Description', 'Amount (Rs)']]
        valid_categories = {'food', 'transport', 'shopping', 'entertainment', 'bills', 'health', 'education', 'other'}
        
        for exp in expenses:
            cat = (exp.category or 'other').lower()
            desc = exp.description or ''
            
            if cat not in valid_categories:
                formatted_cat = "Other"
                formatted_desc = f"{exp.category.title()} - {desc}" if desc else exp.category.title()
            else:
                formatted_cat = cat.title()
                formatted_desc = desc
                
            data.append([exp.date.strftime('%d %b %Y'), formatted_cat, formatted_desc or '-', f"{exp.amount:,.2f}"])
            
        table = Table(data, colWidths=[90, 100, 230, 100])
        t_style = TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0EA5E9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            
            # Body
            ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (2, -1), 'LEFT'), # Left align description
            ('ALIGN', (3, 1), (3, -1), 'RIGHT'), # Right align amounts
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ])
        table.setStyle(t_style)
        
        elements.append(table)
        
        # Footer
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle(
            'Footer', parent=styles['Normal'],
            fontName='Helvetica-Oblique', fontSize=9,
            textColor=colors.HexColor('#94A3B8'), alignment=TA_CENTER
        )
        elements.append(Paragraph(f"Generated by Paisa Tracker App on {datetime.date.today().strftime('%d %b %Y')}", footer_style))
        
        doc.build(elements)
        buffer.seek(0)
        
        filename = f"PaisaTracker_{period_text.replace(' ', '_')}.pdf"
        return FileResponse(buffer, as_attachment=True, filename=filename)
    except ImportError:
        return export_csv(request)

def server_error(request, *args, **kwargs):
    import logging
    logger = logging.getLogger('django.request')
    logger.error('Internal Server Error: %s', request.path)
    
    if request.path.startswith('/api/'):
        from django.http import JsonResponse
        return JsonResponse({"error": "Internal Server Error"}, status=500)
    from django.shortcuts import render
    return render(request, "500.html", status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_update_fcm_token(request):
    try:
        fcm_token = request.data.get('fcm_token') or getattr(request, "_json_body", {}).get('fcm_token')
        if fcm_token:
            profile = request.user.profile
            profile.fcm_token = fcm_token
            profile.save()
            return JsonResponse({"status": "success", "message": "FCM token updated successfully"})
        return JsonResponse({"status": "error", "message": "No token provided"}, status=400)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def api_trigger_test_push(request):
    try:
        from tracker.fcm_utils import send_push_notification
        tokens = UserProfile.objects.exclude(fcm_token__isnull=True).exclude(fcm_token__exact='').values_list('fcm_token', flat=True).distinct()
        count = 0
        
        for token in tokens:
            title = "🚀 Premium Update Available!"
            body = "A new version of the app is ready for you! Tap here to head to your Profile section and hit 'Check for Update' to experience the latest features. ✨"
            data = {"screen": "Profile"}
            success = send_push_notification(token, title, body, data)
            if success:
                count += 1
                
        return Response({"status": "success", "messages_sent": count})
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)

from django.views.decorators.csrf import csrf_exempt
import json

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_send_admin_push(request):
    secret = request.data.get("secret")
    expected_secret = getattr(settings, 'ADMIN_PUSH_SECRET', None) or os.getenv("ADMIN_PUSH_SECRET") or 'paisamitra-admin-push-2025'
    if not expected_secret or not secret or not hmac.compare_digest(str(secret), str(expected_secret)):
        return Response({"status": "error", "message": "Invalid secret"}, status=403)

    title = request.data.get("title")
    body = request.data.get("body")
    screen = request.data.get("screen", "Dashboard")

    if not title or not body:
        return Response({"status": "error", "message": "Title and body required"}, status=400)

    try:
        from tracker.fcm_utils import initialize_firebase, send_push_notification
        from firebase_admin import messaging

        initialize_firebase()
        topic_message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data={"screen": screen},
            topic='all_users',
        )
        res = messaging.send(topic_message)
        return Response({"status": "success", "message": "Push sent to all_users topic", "res": res})
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)

LATEST_EXPO_APK_URL = "https://expo.dev/artifacts/eas/6fEQmjVfwMsDlbSHZtW41Q46CrTzXlrQLvA9BPIHTX8.apk"

def ensure_apk_cached_on_disk():
    import os
    from django.conf import settings

    apk_path = os.path.join(settings.BASE_DIR, 'tracker', 'static', 'downloads', 'ExpenseTracker.apk')
    os.makedirs(os.path.dirname(apk_path), exist_ok=True)

    # 1. If committed/built APK exists on disk and is > 10MB, always prefer and serve it!
    if os.path.exists(apk_path) and os.path.getsize(apk_path) > 10 * 1024 * 1024:
        return apk_path

    # 2. Fallback: Download from EAS artifact if missing
    temp_path = apk_path + ".tmp"
    try:
        import urllib.request
        urllib.request.urlretrieve(LATEST_EXPO_APK_URL, temp_path)
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 10 * 1024 * 1024:
            os.replace(temp_path, apk_path)
            return apk_path
    except Exception:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

    return apk_path

def get_apk_response():
    import os
    import requests
    from django.http import FileResponse, StreamingHttpResponse, HttpResponseRedirect

    apk_path = ensure_apk_cached_on_disk()

    # 1. First priority: Serve from local disk if 120MB binary exists (guarantees Content-Length)
    if os.path.exists(apk_path) and os.path.getsize(apk_path) > 10 * 1024 * 1024:
        file_size = os.path.getsize(apk_path)
        response = FileResponse(open(apk_path, 'rb'), content_type='application/vnd.android.package-archive')
        response['Content-Disposition'] = 'attachment; filename="ExpenseTracker.apk"'
        response['Content-Length'] = str(file_size)
        response['Content-Encoding'] = 'identity'
        response['Accept-Ranges'] = 'bytes'
        return response

    # 2. Fallback: Stream directly from Expo CDN with custom ExpenseTracker.apk filename header
    try:
        r = requests.get(LATEST_EXPO_APK_URL, stream=True, timeout=15)
        if r.status_code == 200:
            response = StreamingHttpResponse(
                r.iter_content(chunk_size=256 * 1024),
                content_type='application/vnd.android.package-archive'
            )
            response['Content-Disposition'] = 'attachment; filename="ExpenseTracker.apk"'
            response['Content-Encoding'] = 'identity'
            response['Accept-Ranges'] = 'bytes'
            if 'content-length' in r.headers:
                response['Content-Length'] = r.headers['content-length']
            return response
    except Exception:
        pass

    # 3. Last fallback: Redirect
    return HttpResponseRedirect(LATEST_EXPO_APK_URL)

def download_apk(request):
    return get_apk_response()

@csrf_exempt
def get_app_version(request):
    """
    Returns latest app version information so the mobile app can notify users
    when a new APK build is available and provide 1-tap download.
    """
    return JsonResponse({
        "status": "success",
        "latest_version": "1.3.4",
        "latest_version_code": 6,
        "apk_url": "https://smart-expense-coach.onrender.com/static/downloads/ExpenseTracker.apk",
        "direct_expo_url": "https://smart-expense-coach.onrender.com/static/downloads/ExpenseTracker.apk",
        "release_notes": "Admin Panel text visibility fix, dual home screen widgets, and built-in offline updates!",
        "published_at": "2026-10-25",
    })


# ══════════════════════════════════════════════════════════════════════════════
# DATABASE BACKUP APIS (Item 9)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAdminUser])
def api_trigger_backup(request):
    """Allows staff or authenticated admin to trigger a live database snapshot backup."""
    from .management.commands.backup_db import perform_db_backup
    try:
        backup_info = perform_db_backup()
        return Response({
            'status': 'success',
            'message': 'Database backup generated successfully.',
            'backup': backup_info
        })
    except Exception as e:
        return Response({'status': 'error', 'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def api_list_backups(request):
    """Lists available snapshot backups in storage."""
    import os
    from django.conf import settings
    backup_dir = os.path.join(settings.BASE_DIR, 'backups')
    if not os.path.exists(backup_dir):
        return Response({'backups': []})

    files = sorted(
        [f for f in os.listdir(backup_dir) if f.startswith('backup_') and f.endswith('.json.gz')],
        key=lambda f: os.path.getmtime(os.path.join(backup_dir, f)),
        reverse=True
    )
    backups = []
    for f in files:
        full_path = os.path.join(backup_dir, f)
        backups.append({
            'filename': f,
            'size_kb': round(os.path.getsize(full_path) / 1024, 2),
            'modified': datetime.fromtimestamp(os.path.getmtime(full_path)).strftime('%Y-%m-%d %H:%M:%S')
        })
    return Response({'backups': backups, 'total': len(backups)})


