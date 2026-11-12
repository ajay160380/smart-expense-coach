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
from django.views.decorators.csrf import csrf_exempt, csrf_protect
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
    OTPVerification, Note, SubscriptionCharge, WhatsAppProcessedMessage, ContactMessage,
    DailyNotificationLog, UserMerchantCategory
)
from .forms import ExpenseForm, SubscriptionForm, CustomRegistrationForm

from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.throttling import ScopedRateThrottle
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
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import throttle_classes
from tracker.authentication import touch_token_activity, validate_and_touch_token
import secrets
from django.views.decorators.csrf import csrf_exempt, csrf_protect

def get_client_ip(request: HttpRequest) -> str:
    """Extract client IP address safely, respecting configured trusted reverse proxies."""
    num_proxies = getattr(settings, 'NUM_PROXIES', 1)
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        parts = [p.strip() for p in xff.split(',') if p.strip()]
        if len(parts) >= num_proxies:
            return parts[-num_proxies]
        return parts[0]
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
            from tracker.authentication import validate_and_touch_token
            user, result = validate_and_touch_token(token_key)
            if result == "expired":
                return JsonResponse({"error": "Token has expired after 30 days of inactivity. Please log in again."}, status=401)
            if not user or not user.is_active:
                return JsonResponse({"error": "Invalid token."}, status=401)
            request.user = user
            return view_func(request, *args, **kwargs)
        elif auth_header:
            return JsonResponse({"error": "Invalid token header format. Use 'Token <key>'."}, status=401)

        # 2. Session Authentication (Browser requests)
        if request.user and request.user.is_authenticated:
            # Enforce CSRF validation for state-changing browser requests
            if request.method in ("POST", "PUT", "PATCH", "DELETE"):
                from django.middleware.csrf import CsrfViewMiddleware
                reason = CsrfViewMiddleware(lambda req: None).process_view(request, None, (), {})
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
        timeout = float(os.getenv('GROQ_TIMEOUT', '30.0'))
        max_retries = int(os.getenv('GROQ_MAX_RETRIES', '1'))
        _groq_client_instance = Groq(
            api_key=settings.GROQ_API_KEY,
            timeout=timeout,
            max_retries=max_retries,
        )
    return _groq_client_instance

def _get_groq_model(fallback="qwen/qwen3.8-27b") -> str:
    return getattr(settings, 'GROQ_MODEL', None) or fallback


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
    
    CRITICAL LANGUAGE & CONVERSATIONAL GUIDELINES:
    1. DYNAMIC LANGUAGE MIRRORING (CRITICAL):
       - If the user communicates in Hinglish (Hindi written in English alphabet, e.g. "Maine aaj 150 ka pizza khaya", "Auto 40", "kaise ho", "Or btvo kya kr rahe ho", "aaj office me bahut kaam tha", "mera budget kitna bacha hai"):
         ➔ Reply in 100% authentic, natural, smooth, respectful, and friendly urban Hinglish (the way real friends chat on WhatsApp in Delhi/Mumbai/Lucknow/Bangalore)!
         ➔ TONE: Warm, friendly, cheerful, like a helpful close friend ("Bhai", "Dost", "Aap").
         ➔ GRAMMAR: Always maintain respectful address. Never mix "Aap" with "ho" (e.g. use "Aap kaise hain?", "Aap bataiye", not "Aap chahte ho"). NEVER use "Tu", "Tera", "Tujhe".
         ➔ FORBIDDEN: NEVER use bizarre literal translations or robotic Hindi words (e.g. NEVER say "rozmarra howa hai", "vyay ka aakalan", "samagri", etc.).
         ➔ AUTHENTIC HINGLISH EXAMPLES:
           • User: "Or btvo kya kr rahe ho" ➔ "Bas badhiya {user_name} bhai! Main toh yahan aapke kharche aur hisaab-kitaab sambhalne ke liye taiyaar baitha hoon. Aap batao, aaj ka din kaisa raha? Koi naya kharcha hua kya? 😊"
           • User: "Aaj office me bahut kaam tha thak gaya" ➔ "Arre yaar, lagta hai kaafi thaka dene wala din raha! Ab shaam ko aaram se chai piyo aur chill karo. Shaam ka koi chai-nashta ka kharcha note karna hai kya? ☕"
           • User: "Bore ho raha hu" ➔ "Arre re! Koi achhi movie dekh lo ya favorite gaane sun lo. Ya fir batao, is mahine ka budget check karein? Abhi bhi kaafi paise bache hain! 🎬💰"
           • User: "Khana kha liya?" ➔ "Main toh AI hoon dost, mera khana toh bas aapka hisaab aur data hai! 😄 Aapne dinner/lunch kar liya? Aaj kya special khaya?"
       - If the user communicates in English (e.g. "Spent 150 on pizza", "How are you doing?", "What's my balance?", "Good morning"):
         ➔ Reply in 100% fluent, clear, and elegant English!
       - Match the user's language dynamically and seamlessly in all your replies!
    2. NEVER be rigid or force the user to enter expenses. If the user is just saying something normal (e.g. "rough day at work", "aaj office me bahut kaam tha", "nice weather today", "I am bored", "good morning", "kaise ho"), talk to them naturally, warmly, and empathetically like a close friend and trusted mentor in their matching language.
    3. Keep your replies concise, warm, lively, and engaging (under 100 words). Avoid robotic repetitive templates.
    4. Do not blindly repeat the budget summary in every message unless asked or relevant.
    5. STRICT PRIVACY & NO AUTO-CAPTURE / NO SMS READING:
       The app DOES NOT support SMS reading, auto-capture, or automatic banking sync (these were intentionally removed to protect privacy). NEVER mention, suggest, claim, or promise "auto-capture", "SMS parsing", or "automatic bank alert tracking". If anyone asks about features or how it works, ONLY highlight:
       • Instant WhatsApp Voice & Text expense tracking
       • AI Natural Language categorization & smart expense breakdown
       • Real-time budget tracking, spending insights, and Home screen widgets
    
    If asked about your creator or developer, your `chat_response` MUST be exactly this string (ensure you escape newlines as \\n\\n so the JSON remains valid):
    "👨‍💻 *My Creator: Ajay Vishwakarma*\\n\\nI was developed by Ajay, a passionate Full Stack & AI/ML Engineer! Here are his professional links:\\n\\n🌐 *Portfolio:* https://ajay-vishwakarmaa.netlify.app\\n🐙 *GitHub:* https://github.com/ajay160380\\n💼 *LinkedIn:* https://www.linkedin.com/in/ajay-vishwakarma-71649129a/"

    If the user asks about the Android App, APK, Mobile App, or Download Link, your `chat_response` MUST be:
    "📱 *Expense Tracker (PaisaMitra) Android App* 🚀\\n\\nYou can download the official latest Android App from the links below:\\n\\n📥 *Universal Download Webpage (Auto 5s Timer):*\\nhttps://expense-coach-prxm.onrender.com/download/\\n\\n⚡ *Direct Fast CDN Download:*\\nhttps://github.com/ajay160380/smart-expense-coach/releases/latest/download/ExpenseTracker.apk\\n\\n✨ *Key Features:*\\n• Instant Voice & Text expense tracking\\n• AI Natural Language categorization\\n• Real-time budget alerts & Home screen widgets\\n\\n💡 *How to Install:*\\n1️⃣ Tap the download link above to get the APK file.\\n2️⃣ Once downloaded, open the file and tap *Install*.\\n3️⃣ Open the app and log in with your WhatsApp number! 😊"

    FORMATTING RULES (CRITICAL):
    1. Do NOT make everything bold. Only bold *important keywords* (like amounts or names), NOT entire sentences!
    2. Write in short, clean sentences.
    3. Always use double newlines (`\n\n`) between different points or paragraphs.
    4. When listing items or links, use elegant bullet points (•) on separate lines.
    5. Make your responses look BEAUTIFUL, spaced out, and easy to read. Use 1 or 2 relevant emojis naturally.
    
    Today's Date: {today}
    
    User Context:
    - Name: {user_name}
    - Dashboard Link: https://expense-coach-prxm.onrender.com
    - Monthly Budget: ₹{user_context.get('budget', 20000)}
    - Total Spent This Month: ₹{user_context.get('spent', 0)}
    - Remaining Budget: ₹{user_context.get('remaining', 0)}
    - Category-wise Breakdown: {user_context.get('category_breakdown', 'None')}
    - Recent Expenses: {user_context.get('recent_expenses', 'None')}
    - Recent Notes: {user_context.get('recent_notes', 'None')}

    Rules for Routing (CRITICAL):
    1. EXPENSE RECORDING (HIGHEST PRIORITY):
       Whenever the user mentions ANY expense, purchase, money spent, paid, bought, or incurred:
       - action = "log_expenses"
       - expenses = An array of expense objects: [{{"amount": 500, "category": "transport", "description": "Petrol"}}]. Extract EVERY SINGLE item mentioned.
       - NEVER classify a message mentioning an amount of money spent as "chat"! Always set action="log_expenses".
       - Examples of natural inputs to parse accurately:
         • "Maine aaj ₹150 ka pizza khaya" ➔ [{{"amount": 150, "category": "food", "description": "Pizza"}}]
         • "Auto ₹40" ➔ [{{"amount": 40, "category": "transport", "description": "Auto"}}]
         • "₹500 petrol bharwaya" ➔ [{{"amount": 500, "category": "transport", "description": "Petrol"}}]
         • "D-Mart se ₹1200 ki grocery li" ➔ [{{"amount": 1200, "category": "groceries", "description": "D-Mart Grocery"}}]
         • "Chai 20 aur samosa 30" ➔ [{{"amount": 20, "category": "food", "description": "Chai"}}, {{"amount": 30, "category": "food", "description": "Samosa"}}]
         • "350 medicine doctor fee 500" ➔ [{{"amount": 350, "category": "health", "description": "Medicine"}}, {{"amount": 500, "category": "health", "description": "Doctor Fee"}}]
    2. If the user EXPLICITLY asks to save a note (e.g. "save to notepad", "notepad me daal do", "note: buy milk"):
       - action = "save_note"
       - note = The exact text they want to save.
    3. If the user pastes a LARGE LIST (multiple lines of items and numbers) BUT DOES NOT explicitly tell you whether to save it or log it:
       - action = "ask_clarification"
       - chat_response = "Should I save this long list to your Notepad or add it to your Expenses? 🤔"
    4. ONLY FOR PURE CONVERSATION, GREETINGS, CHIT-CHAT, OR QUESTIONS WITHOUT ANY EXPENSES (e.g. "hi", "how are you", "what's up", "good morning", "kaise ho", "aaj thak gaya"):
       - action = "chat"
       - chat_response = your natural, conversational, polite reply dynamically matching the user's language (Hinglish if user texted in Hinglish, English if user texted in English).
         - Address the user by their name ({user_name}) when appropriate!
         - You MUST use WhatsApp formatting (e.g., *bold* for emphasis).
         - Always use relevant emojis (e.g. 💰, 📉, 🌟, 🍜).
         - If the user asks where they spent money ("where did I spend my money"), use the 'Category-wise Breakdown' from the context!
         - If the user talks about a TRIP, VACATION, or GROUP EXPENSE SPLIT:
           • Warmly acknowledge the trip and explain how to create a Live Trip Split Link:
             👉 *To create a split link:* "[Trip Name] with [Friends]" (e.g. `Manali trip with Sumit`)
             👉 *To record a split expense:* "[Trip Name]: [Who paid what]" (e.g. `Manali trip: Ajay paid 1600, Sumit paid 0`)
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


def calculate_daily_budget(user, target_date=None):
    """
    PHASE 9: Calculates the Daily Budget ('Aaj ka budget').
    Daily budget = base (monthly_income if basis=='income' else monthly_budget) / total_days_in_cycle.
    Today's remaining = daily budget - today's spend.
    Optional rollover (daily_budget_rollover): unspent or overspent amounts from prior days carry forward.
    Returns:
      day_of_cycle, total_days_in_cycle, days_left, spent_today, daily_budget,
      today_remaining, percent_used, status ("ok" <70%, "warning" 70-100%, "over" >100%).
    """
    if target_date is None:
        target_date = timezone.localdate()

    profile = getattr(user, 'profile', None)
    monthly_budget = float(getattr(profile, 'monthly_budget', 20000) or 20000.0)
    monthly_income = getattr(profile, 'monthly_income', None)
    monthly_income_val = float(monthly_income) if monthly_income is not None else None
    basis = getattr(profile, 'daily_budget_basis', 'budget') or 'budget'

    if basis == 'income' and monthly_income_val is not None and monthly_income_val > 0:
        base_amount = monthly_income_val
    else:
        base_amount = monthly_budget if monthly_budget > 0 else 20000.0

    start_date, end_date = get_budget_cycle_dates(user, target_date)
    total_days_in_cycle = max((end_date - start_date).days + 1, 1)
    day_of_cycle = min(max((target_date - start_date).days + 1, 1), total_days_in_cycle)
    days_left = max((end_date - target_date).days + 1, 1)

    raw_daily_budget = round(base_amount / total_days_in_cycle, 2)

    cycle_expenses = Expense.objects.filter(user=user, date__range=(start_date, end_date))
    agg = cycle_expenses.aggregate(
        cycle_total=Sum("amount"),
        today_total=Sum("amount", filter=Q(date=target_date))
    )
    cycle_spent = float(agg["cycle_total"] or 0)
    spent_today = float(agg["today_total"] or 0)
    spent_before_today = max(0.0, cycle_spent - spent_today)

    rollover_enabled = bool(getattr(profile, 'daily_budget_rollover', False))
    if rollover_enabled:
        expected_prior = raw_daily_budget * max(0, day_of_cycle - 1)
        carryover = expected_prior - spent_before_today
        effective_daily_budget = round(max(0.0, raw_daily_budget + carryover), 2)
    else:
        effective_daily_budget = raw_daily_budget
        carryover = 0.0

    today_remaining = round(effective_daily_budget - spent_today, 2)

    if effective_daily_budget > 0:
        percent_used = round((spent_today / effective_daily_budget) * 100, 1)
    else:
        percent_used = 100.0 if spent_today > 0 else 0.0

    if percent_used < 70.0:
        status = "ok"
        status_label = "On Track"
        status_color = "#10B981"
    elif percent_used <= 100.0:
        status = "warning"
        status_label = "Near Limit"
        status_color = "#F59E0B"
    else:
        status = "over"
        status_label = "Over Budget"
        status_color = "#EF4444"

    # Today's transactions list
    today_txs_qs = Expense.objects.filter(user=user, date=target_date).order_by('-id')[:25]
    today_transactions = [
        {
            "id": tx.id,
            "category": tx.category,
            "amount": float(tx.amount),
            "description": tx.description or tx.category,
            "icon": tx.icon or "💸",
            "source": tx.source or "manual",
            "is_reviewed": tx.is_reviewed,
        }
        for tx in today_txs_qs
    ]

    # Friendly English message for WhatsApp and Notifications
    user_name = user.first_name.title() if (user and user.first_name) else (user.username.title() if user else "Friend")
    if status == "ok":
        hinglish_message = f"Great job {user_name}! You've spent only ₹{spent_today:,.2f} out of today's ₹{effective_daily_budget:,.2f} budget. ₹{today_remaining:,.2f} remaining!"
    elif status == "warning":
        hinglish_message = f"Heads up {user_name}, you've used ₹{spent_today:,.2f} ({percent_used}%) of today's ₹{effective_daily_budget:,.2f} budget. ₹{today_remaining:,.2f} remaining."
    else:
        over_amt = abs(today_remaining)
        hinglish_message = f"Budget Alert {user_name}! Today's budget was ₹{effective_daily_budget:,.2f} and you spent ₹{spent_today:,.2f} (₹{over_amt:,.2f} over limit)."

    return {
        "daily_budget": effective_daily_budget,
        "base_daily_budget": raw_daily_budget,
        "base_amount": base_amount,
        "basis": basis,
        "monthly_budget": monthly_budget,
        "monthly_income": monthly_income_val,
        "spent_today": spent_today,
        "today_remaining": today_remaining,
        "remaining_today": today_remaining,
        "percent_used": percent_used,
        "status": status,
        "status_label": status_label,
        "status_color": status_color,
        "day_of_cycle": day_of_cycle,
        "cycle_day": day_of_cycle,
        "total_days_in_cycle": total_days_in_cycle,
        "cycle_days": total_days_in_cycle,
        "days_left": days_left,
        "cycle_start_date": start_date.isoformat(),
        "cycle_end_date": end_date.isoformat(),
        "rollover_enabled": rollover_enabled,
        "carryover_amount": round(carryover, 2),
        "has_budget": bool(profile and ((profile.monthly_budget and profile.monthly_budget > 0) or profile.monthly_income)),
        "has_budget_set": bool(profile and ((profile.monthly_budget and profile.monthly_budget > 0) or profile.monthly_income)),
        "hinglish_message": hinglish_message,
        "today_transactions": today_transactions,
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
            model=_get_groq_model(),
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
            model=_get_groq_model(),
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
            f"Write a clean, beautifully formatted 2-part financial insight in natural polite Hinglish (Aap/Bhai):\n"
            f"• Overview: 1 short sentence summarizing how the month went with an emoji.\n"
            f"• Pro Tip: 1 actionable saving tip for next month with an emoji.\n"
            f"Format as 2 separate clean lines. Keep it concise and under 45 words total."
        )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=_get_groq_model(),
            temperature=0.75,
            max_tokens=1000,
        )
        report = re.sub(r"<think>(?:.*?</think>|.*$)", "", r.choices[0].message.content, flags=re.DOTALL).strip()
        report = re.sub(r"\*\*([^*]+)\*\*", r"\1", report)
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
        if str(phone_number).startswith('91') and len(str(phone_number)) == 12:
            identifiers.append(str(phone_number)[2:])
        elif len(str(phone_number)) == 10:
            identifiers.append(f"91{phone_number}")
        if email:
            identifiers.append(email.strip().lower())

        records = OTPVerification.objects.filter(
            identifier__in=list(set(identifiers)),
            is_verified=False,
            created_at__gte=timezone.now() - timedelta(minutes=10)
        ).order_by('-created_at')

        matched_record = None
        for r in records:
            if _verify_otp_record(r, str(otp).strip(), 'register'):
                matched_record = r
                break

        if not matched_record:
            return Response({"error": "Invalid or expired OTP. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()
        if 'phone_number' in data:
            data['phone_number'] = phone_number

        serializer = RegisterSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            try:
                matched_record.delete()  # Cleanup OTP after successful registration
            except Exception:
                pass
            return Response({
                "status": "success", 
                "message": "Registration done! You can now track your expenses using your WhatsApp number."
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


from django.views.decorators.csrf import csrf_exempt, csrf_protect

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
        identifiers = [check_phone] if check_phone else []
        if check_phone and len(str(check_phone)) == 10 and str(check_phone).isdigit():
            identifiers.append(f"91{check_phone}")
        elif check_phone and str(check_phone).startswith('91') and len(str(check_phone)) == 12:
            identifiers.append(str(check_phone)[2:])

        records = OTPVerification.objects.filter(
            identifier__in=list(set(identifiers)),
            is_verified=False,
            created_at__gte=timezone.now() - timedelta(minutes=10)
        ).order_by('-created_at')

        matched_record = None
        for r in records:
            if _verify_otp_record(r, str(otp).strip(), 'register'):
                matched_record = r
                break

        if not matched_record:
            messages.error(request, "Invalid or expired OTP.")
            return render(request, "tracker/register.html", {"form": form})

        if form.is_valid():
            user = form.save()
            try:
                matched_record.delete()
            except Exception:
                pass
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
        "daily_budget":          calculate_daily_budget(user, today),
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

    # Normalize informal chat abbreviations & Hinglish slang
    clean = re.sub(r'\b(btvo|btao|btaye|btado)\b', 'batao', clean)
    clean = re.sub(r'\b(kr|krr)\b', 'kar', clean)
    clean = re.sub(r'\b(rhe|rh)\b', 'rahe', clean)
    clean = re.sub(r'\b(bdiya|bdia)\b', 'badhiya', clean)
    clean = re.sub(r'\b(kch|kchh)\b', 'kuch', clean)

    rem = max(0, float(budget) - float(spent))
    display_name = user_name.title() if user_name else "Dost"

    # 1. MORNING GREETINGS
    morning_triggers = [
        'good morning', 'good mrng', 'gud morning', 'gud mrng', 'gm', 'g m',
        'shubh prabhat', 'subah ho gayi', 'morning'
    ]
    if clean in morning_triggers or any(clean.startswith(t + ' ') or clean.endswith(' ' + t) for t in ['good morning', 'shubh prabhat', 'gm']):
        if any(h in clean for h in ['shubh prabhat', 'subah ho gayi']):
            return f"🌅 *Shubh Prabhat, {display_name}!* ☀️\n\nAapka din shubh aur productive rahe! 🚀"
        return f"🌅 *Good Morning, {display_name}!* ☀️\n\nWishing you a wonderful and productive day ahead! 🚀"

    # 2. NIGHT GREETINGS
    night_triggers = [
        'good night', 'good nyt', 'gud night', 'gud nyt', 'gn', 'g n',
        'shubh ratri', 'so raha hu', 'so raha hoon', 'so jata hu', 'so jata hoon',
        'going to sleep', 'sleep time', 'sweet dreams', 'good nite'
    ]
    if clean in night_triggers or any(clean.startswith(t + ' ') or clean.endswith(' ' + t) for t in ['good night', 'shubh ratri', 'gn']):
        if any(h in clean for h in ['shubh ratri', 'so raha', 'so jata']):
            return f"🌙 *Shubh Ratri, {display_name}!* ✨\n\nAaram kijiye aur sweet dreams. Kal milte hain! 🛌💤"
        return f"🌙 *Good Night, {display_name}!* ✨\n\nSleep well and have sweet dreams. Take care, see you tomorrow! 🛌💤"

    # 3. AFTERNOON / EVENING GREETINGS
    afternoon_triggers = ['good afternoon', 'gud afternoon', 'good noon', 'shubh dopahar']
    if clean in afternoon_triggers or any(clean.startswith(t + ' ') for t in ['good afternoon', 'shubh dopahar']):
        if 'shubh dopahar' in clean:
            return f"☀️ *Shubh Dopahar, {display_name}!* 🍱\n\nAasha hai aapka din achha guzar raha hoga! 👍"
        return f"☀️ *Good Afternoon, {display_name}!* 🍱\n\nHope you are having a great day! 👍"

    evening_triggers = ['good evening', 'gud evening', 'shubh sandhya']
    if clean in evening_triggers or any(clean.startswith(t + ' ') for t in ['good evening', 'shubh sandhya']):
        if 'shubh sandhya' in clean:
            return f"☕ *Shubh Sandhya, {display_name}!* 🌆\n\nAasha hai din badiya raha hoga. Aaram kijiye aur shaam enjoy karein! ✨"
        return f"☕ *Good Evening, {display_name}!* 🌆\n\nHope you had a productive day! Relax and have a pleasant evening. ✨"

    # 4. "KYA KAR RAHE HO" / "WHAT ARE YOU DOING" (Instant Response)
    doing_triggers = [
        'kya kar rahe ho', 'kya kar rahe', 'kya kar rhe', 'what are you doing', 'what r u doing', 'what you doing'
    ]
    if any(t in clean for t in doing_triggers):
        if any(w in clean for w in ['what are you doing', 'what r u doing', 'what you doing']):
            return f"Just here and ready to help manage your expenses, *{display_name}*! How is your day going? 😊"
        return f"Bas badhiya, *{display_name}*! Main toh yahan aapke kharche aur hisaab-kitaab sambhalne ke liye taiyaar baitha hoon. Aap batao, aaj ka din kaisa raha? Koi naya kharcha hua kya? 😊"

    # 5. "AUR BATAO" / "AUR SUNAO" (Instant Response)
    aur_batao_triggers = ['aur batao', 'or batao', 'aur sunao', 'or sunao', 'kuch sunao']
    if any(t in clean for t in aur_batao_triggers) and not any(t in clean for t in ['how are you', 'how r u']):
        return f"Sab ekdum badhiya, *{display_name}*! Aap sunao, aaj ka din kaisa chal raha hai? Koi naya kharcha add karna hai? 📝"

    # 6. "KAISE HO" / "HOW ARE YOU" (Dynamic Mirroring)
    how_are_you_triggers = [
        'kaise ho', 'kaisi ho', 'kaise hai', 'kaise hain', 'kya haal', 'kya haal hai', 'kya hal hai',
        'how are you', 'how r u', 'how are u', 'sab kaisa hai', 'sab kaisa chal raha hai',
        'kya chal raha hai', 'kya ho raha hai', 'sab theek', 'sab theek hai', 'sab badhiya'
    ]
    if clean in how_are_you_triggers or any(t in clean for t in ['how are you', 'how r u', 'how are u', 'kaise ho', 'kya haal hai', 'kya hal hai', 'kya haal', 'sab kaisa hai', 'kya chal raha hai']):
        if any(w in clean for w in ['how are you', 'how r u', 'how are u', 'how do you do']):
            return f"I'm doing great, *{display_name}*! How are you doing today? 😊"
        return f"Main bilkul badhiya hoon, *{display_name}*! Aap kaise hain? Sab theek chal raha hai? 😊"

    # 5. SPIRITUAL / CULTURAL GREETINGS
    if any(w in clean for w in ['radhe radhe', 'jai shree krishna', 'jai shri krishna', 'radhe']):
        return f"Radhe Radhe *{display_name}*! 🙏 Aapka din mangalmay ho. Aaj main aapki kya madad kar sakta hoon? ✨"
    if any(w in clean for w in ['ram ram', 'jai shree ram', 'jai shri ram', 'sita ram']):
        return f"Jai Shree Ram *{display_name}*! 🙏 Khush rahiye aur mast rahiye. Aaj ke kharche track karein? 😊"
    if any(w in clean for w in ['har har mahadev', 'om namah shivay', 'om namah shivaya', 'jai bholenath']):
        return f"Har Har Mahadev *{display_name}*! 🔱 Strength aur peace bane rahe. Kaise madad kar sakta hoon aapki?"
    if any(w in clean for w in ['namaste', 'namaskar', 'pranam', 'sat sri akal', 'salaam', 'assalam alaikum']):
        return f"Namaste *{display_name}*! 🙏 Aapka din shubh aur kushal rahe. Aaj main aapki kya sahayata kar sakta hoon? 😊"

    # 6. THANKS & APPRECIATION (Dynamic Mirroring)
    thanks_triggers = [
        'thanks', 'thank you', 'thx', 'shukriya', 'dhanyawad', 'dhanyavaad', 'thanku', 'tq',
        'bahut badiya', 'great job', 'nice', 'awesome', 'shandar', 'zabardast', 'mast'
    ]
    if clean in thanks_triggers:
        if any(h in clean for h in ['shukriya', 'dhanyawad', 'dhanyavaad', 'bahut badiya', 'shandar', 'zabardast', 'mast']):
            return f"Aapka swagat hai, *{display_name}*! Hamesha aapki madad ke liye taiyar. 😊❤️"
        return f"You're most welcome, *{display_name}*! Always happy to help. 😊❤️"

    # 7. BYE / GOODBYE (Dynamic Mirroring)
    bye_triggers = ['bye', 'bye bye', 'tata', 'see you', 'cya', 'alvida', 'phir milte hai', 'phir milte hain']
    if clean in bye_triggers:
        if any(h in clean for h in ['alvida', 'phir milte']):
            return f"Alvida, *{display_name}*! Apna khayal rakhiye aur phir milte hain! 👋✨"
        return f"Goodbye, *{display_name}*! Have a great day and take care! 👋✨"

    # 8. GENERAL GREETINGS: "hi", "hello", "hey", etc. (Only exact standalone greetings)
    basic_greetings = {'hi', 'hello', 'hlo', 'hey', 'helo', 'hii', 'hiii', 'yo', 'sup', 'hola'}
    if clean in basic_greetings:
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


def _is_apk_download_request(text: str) -> bool:
    """Detect whether user text is asking to download the Android APK / App."""
    if not text:
        return False
    t = text.strip().lower()

    exact_keywords = {
        'apk', 'app', 'download', 'app link', 'apk link', 'download app', 'download apk',
        'app download', 'apk download', 'app link please', 'apk link please',
        'application', 'download link', 'app download link', 'apk download link',
        'get app', 'get apk', 'app bhej do', 'apk bhej do', 'app bhejo', 'apk bhejo'
    }
    if t in exact_keywords:
        return True

    # Account linking code command like "link 123456" must NOT be treated as download
    if t.startswith('link ') and any(c.isdigit() for c in t):
        return False

    has_apk = bool(re.search(r'\bapk\b', t))
    has_app = bool(re.search(r'\b(app|application|applicaion)\b', t))
    has_download = bool(re.search(r'\b(download|dawnload|downlod|install|insttall)\b', t))
    has_link = bool(re.search(r'\b(link|linck)\b', t))
    has_request_verb = bool(re.search(r'\b(bhejo|bhej|do|de|dedo|chahiye|mang|mange|send|kahan|kaise|milega|karo)\b', t))
    has_digits = bool(re.search(r'\d+', t))

    if has_apk:
        if has_link or has_download or has_request_verb or not has_digits:
            return True

    if has_app:
        if has_download or has_link:
            return True
        if has_request_verb and not has_digits:
            return True

    if has_download and not has_digits:
        return True

    return False


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
            incoming_phone = str(body.get("phone", "")).strip().split('@')[0].split(':')[0]
            spoken_text = str(body.get("text", "")).strip()
            provider_message_id = str(body.get("message_id", "")).strip()
            sender_id = str(body.get("sender_id", incoming_phone)).strip()
        except (json.JSONDecodeError, UnicodeDecodeError):
            return JsonResponse({"status": "error", "message": "Invalid JSON."}, status=400)
            
    elif content_type.startswith('multipart/form-data'):
        # For Mobile App Audio Uploads
        incoming_phone = str(request.POST.get("phone", "")).strip().split('@')[0].split(':')[0]
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

    # ── Authenticate WhatsApp Bot Requests ────────────────────────────────────
    if incoming_phone:
        incoming_secret = request.META.get('HTTP_X_INTERNAL_SECRET', '')
        expected_bot_secret = getattr(settings, 'INTERNAL_BOT_SECRET', '')
        if not (expected_bot_secret and incoming_secret and hmac.compare_digest(str(incoming_secret), str(expected_bot_secret))):
            logger.warning("Unauthorized access to voice_expense WhatsApp bot mode (phone=%s)", masked_phone)
            return JsonResponse({"status": "error", "message": "Unauthorized internal bot request."}, status=401)

    if not spoken_text:
        return JsonResponse({"status": "error", "message": "No text received."}, status=400)

    # ── Check for APK / App Download Requests ─────────────────────────────────
    if _is_apk_download_request(spoken_text):
        apk_msg = (
            "📱 *Expense Tracker (PaisaMitra) Android App* 🚀\n\n"
            "You can download the official latest Android App from the links below:\n\n"
            "📥 *Universal Download Webpage (Auto 5s Timer):*\n"
            "https://expense-coach-prxm.onrender.com/download/\n\n"
            "⚡ *Direct Fast CDN Download:*\n"
            "https://github.com/ajay160380/smart-expense-coach/releases/latest/download/ExpenseTracker.apk\n\n"
            "✨ *Key Features:*\n"
            "• Instant Voice & Text expense tracking\n"
            "• AI Natural Language expense categorization\n"
            "• Real-time budget alerts & Home screen widgets\n\n"
            "💡 *How to Install:*\n"
            "1️⃣ Tap the download link above to get the APK file.\n"
            "2️⃣ Once downloaded, open the file from notifications or your Downloads folder.\n"
            "3️⃣ Tap *Install* (if prompted, tap 'Install anyway').\n"
            "4️⃣ Open the app and log in with your WhatsApp number! 😊"
        )
        return JsonResponse({"status": "success", "message": apk_msg})

    # ── Handle special "link" command ─────────────────────────────────────────
    spoken_stripped = spoken_text.strip()
    if spoken_stripped.lower().startswith("link"):
        parts = spoken_stripped.split(" ", 1)
        link_arg = parts[1].strip() if len(parts) > 1 else ""

        # Rate limiting: max 10 link attempts per 15 minutes per incoming WhatsApp number
        link_cache_key = f"wa_link_attempts_{incoming_phone}"
        attempts = cache.get(link_cache_key, 0)
        if attempts >= 10:
            return JsonResponse({
                "status": "error",
                "message": "⚠️ Too many link attempts. Please wait 15 minutes before trying again."
            })

        # Step A: Check if link_arg is a valid one-time link code (6-digit code)
        code_hash = hashlib.sha256(link_arg.encode()).hexdigest() if link_arg else ""
        profile = UserProfile.objects.filter(
            whatsapp_link_token=code_hash,
            whatsapp_link_expires__gte=timezone.now()
        ).select_related("user").first() if code_hash else None

        if profile:
            target_name = (profile.user.first_name or profile.user.username or "Dost").strip().title()
            profile.whatsapp_number = incoming_phone
            profile.whatsapp_linked = True
            profile.whatsapp_link_token = None
            profile.whatsapp_link_expires = None
            profile.save(update_fields=['whatsapp_number', 'whatsapp_linked', 'whatsapp_link_token', 'whatsapp_link_expires'])
            cache.delete(link_cache_key)
            logger.info("WhatsApp linked via code for uid=%s with WA ID=%s", profile.user.id, incoming_phone)
            
            if '_WA_AUTH_CACHE' in globals():
                _WA_AUTH_CACHE[incoming_phone] = profile.user.id

            return JsonResponse({
                "status": "success",
                "message": (
                    f"🎉 *WhatsApp Successfully Linked!*\n\n"
                    f"Welcome *{target_name}*! Your Expense Tracker account is now linked. ✅\n\n"
                    f"You can now track your expenses directly from WhatsApp:\n"
                    f"• *'500 dinner'* ➔ Save expense instantly\n"
                    f"• *'today summary'* ➔ View today's total\n"
                    f"• *'budget'* ➔ Check remaining balance\n\n"
                    f"Try it now! Send your first expense message. 🚀"
                )
            })

        # Step B: Direct 1-tap link for user's own phone number or 'link <phone>' or 'link'
        clean_incoming = re.sub(r'[^0-9]', '', incoming_phone.split(':')[0])
        clean_phone = re.sub(r'[^0-9]', '', link_arg.split(':')[0]) if link_arg else clean_incoming
        search_digits = clean_phone[-10:] if len(clean_phone) >= 10 else (clean_incoming[-10:] if len(clean_incoming) >= 10 else None)

        if search_digits:
            profile = UserProfile.objects.filter(phone_number__endswith=search_digits).select_related("user").first()
            if not profile:
                profile = UserProfile.objects.filter(whatsapp_number__endswith=search_digits).select_related("user").first()

            if profile:
                target_name = (profile.user.first_name or profile.user.username or "Dost").strip().title()
                profile.whatsapp_number = clean_incoming or incoming_phone
                profile.whatsapp_linked = True
                profile.save(update_fields=['whatsapp_number', 'whatsapp_linked'])
                cache.delete(link_cache_key)
                logger.info("WhatsApp 1-tap linked for uid=%s with WA ID=%s", profile.user.id, incoming_phone)

                if '_WA_AUTH_CACHE' in globals():
                    _WA_AUTH_CACHE[incoming_phone] = profile.user.id
                    if clean_incoming:
                        _WA_AUTH_CACHE[clean_incoming] = profile.user.id

                return JsonResponse({
                    "status": "success",
                    "message": (
                        f"🎉 *WhatsApp Successfully Linked!*\n\n"
                        f"Welcome *{target_name}*! Your Expense Tracker account is now linked. ✅\n\n"
                        f"You can now track expenses directly by messaging here:\n"
                        f"• *\"₹150 Coffee\"* ➔ Instant save\n"
                        f"• *\"Auto 40\"* ➔ Category auto-detected\n"
                        f"• *\"500 Petrol\"* ➔ Quick record\n"
                        f"• *\"Today summary\"* ➔ Daily total\n"
                        f"• *\"Budget\"* ➔ Balance check\n\n"
                        f"Try it now! Send your first expense message. 🚀"
                    )
                })

        cache.set(link_cache_key, attempts + 1, timeout=900)
        return JsonResponse({
            "status": "error",
            "message": (
                "⚠️ *Account Not Found*\n\n"
                "This WhatsApp number is not registered with an Expense Tracker account.\n\n"
                "👉 Please create an account in the app or website, or go to Profile Settings to generate a link code:\n"
                "`link <CODE>`"
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
                user_auth, res_token = validate_and_touch_token(token_key)
                if user_auth and user_auth.is_active:
                    target_user = user_auth
                    request.user = target_user

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
            # 1. Try exact match on whatsapp_number (supports raw LIDs or unformatted numbers)
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

            # 2. Automatic Baileys LID resolution (resolves WhatsApp multi-device LIDs to phone numbers)
            if not profile or not profile.user:
                clean_raw = re.sub(r'\D', '', incoming_phone)
                resolved_phone = None
                try:
                    from django.db import connection
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT data FROM baileys_auth WHERE key_id = %s", [f'lid-mapping-{clean_raw}_reverse'])
                        row = cursor.fetchone()
                        if row and row[0]:
                            resolved_phone = str(row[0]).strip('"').strip()
                        if not resolved_phone:
                            cursor.execute("SELECT key_id FROM baileys_auth WHERE key_id LIKE 'lid-mapping-%' AND data::text LIKE %s", [f'%{clean_raw}%'])
                            row = cursor.fetchone()
                            if row and row[0]:
                                resolved_phone = row[0].replace('lid-mapping-', '').replace('_reverse', '').strip()
                except Exception as e_lid:
                    logger.debug("LID lookup error: %s", e_lid)

                if resolved_phone:
                    res_digits = re.sub(r'\D', '', resolved_phone)
                    if len(res_digits) >= 10:
                        last10_res = res_digits[-10:]
                        profile = UserProfile.objects.filter(phone_number__endswith=last10_res).select_related("user").first()
                        if not profile:
                            profile = UserProfile.objects.filter(whatsapp_number__endswith=last10_res).select_related("user").first()
                        if profile:
                            profile.whatsapp_number = incoming_phone
                            profile.whatsapp_linked = True
                            profile.save(update_fields=['whatsapp_number', 'whatsapp_linked'])
                            logger.info("Auto-linked WhatsApp LID %s to user %s (%s)", incoming_phone, profile.user.id, profile.phone_number)

            # 3. Match by phone_number (registration number)
            if not profile or not profile.user:
                clean_phone = re.sub(r'\D', '', incoming_phone)
                if len(clean_phone) >= 10:
                    last10 = clean_phone[-10:]
                    profile = UserProfile.objects.filter(phone_number__endswith=last10).select_related("user").first()
                    if profile:
                        profile.whatsapp_number = incoming_phone
                        profile.whatsapp_linked = True
                        profile.save(update_fields=['whatsapp_number', 'whatsapp_linked'])
                
                if not profile or not profile.user:
                    return JsonResponse({
                        "status":  "error",
                        "message": (
                            "❌ *Account Not Linked*\n\n"
                            "To link your WhatsApp with your Expense Tracker account:\n"
                            "1️⃣ Reply with: *link <your registered mobile number>*\n"
                            "   _Example:_ *link 917905398965*\n\n"
                            "📱 Don't have an account yet? Register here:\n"
                            "https://expense-coach-prxm.onrender.com/register/\n\n"
                            "📥 Download Android App:\n"
                            "https://github.com/ajay160380/smart-expense-coach/releases/latest/download/ExpenseTracker.apk"
                        )
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

        # ── 0. PHASE 9.7: DAILY BUDGET COMMANDS ("aaj ka budget", "today budget") ──
        is_daily_budget_cmd = bool(
            re.search(r'^(aaj\s*ka\s*budget|today\'?s?\s*budget|daily\s*budget|rozana\s*ka\s*budget|mera\s*aaj\s*ka\s*budget)[\s\?\.]*$', lower_text)
            or lower_text in ['aaj ka budget', 'today budget', "today's budget", 'daily budget', 'aajka budget', 'aaj ka budget kitna hai']
        )
        if is_daily_budget_cmd:
            daily_info = calculate_daily_budget(target_user, today)
            if not daily_info.get("has_budget") or daily_info.get("daily_budget", 0) <= 0:
                budget_msg = (
                    "⚠️ *Monthly budget is not set!*\n\n"
                    "To track your daily budget, set your monthly budget first:\n"
                    "👉 Link: https://expense-coach-prxm.onrender.com/dashboard/\n"
                    "Or open your Profile in the app to set your Monthly Budget. 🎯"
                )
            else:
                db_amt = daily_info["daily_budget"]
                sp_amt = daily_info["spent_today"]
                rem_amt = daily_info["remaining_today"]
                status = daily_info["status"]
                c_day = daily_info["cycle_day"]
                c_days = daily_info["cycle_days"]
                days_left = daily_info["days_left"]

                status_emoji = {"ok": "✅", "warning": "⚠️", "over": "🚨"}.get(status, "📊")
                if status == "ok":
                    advice = "Everything is on track! Keep maintaining this balance. 👍"
                elif status == "warning":
                    advice = "Over 70% of today's budget spent. Spend mindfully for the rest of today! ⚠️"
                else:
                    over_by = abs(rem_amt)
                    advice = f"Today's budget exceeded by ₹{over_by:,.0f}. Try to balance it tomorrow! 🛑"

                budget_msg = (
                    f"📊 *Today's Budget (Day {c_day}/{c_days})*\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"🎯 *Daily Budget:* ₹{db_amt:,.0f}\n"
                    f"💸 *Spent Today:* ₹{sp_amt:,.0f}\n"
                    f"💰 *Remaining:* ₹{rem_amt:,.0f} ({status.upper()}) {status_emoji}\n"
                    f"⏳ *Days Left in Month:* {days_left} days\n"
                    f"━━━━━━━━━━━━━━━━━━\n"
                    f"💡 {advice}"
                )

            if provider_message_id and sender_id:
                try:
                    WhatsAppProcessedMessage.objects.update_or_create(
                        provider_message_id=provider_message_id,
                        sender_id=sender_id,
                        defaults={'status': 'success', 'response_text': budget_msg}
                    )
                except Exception:
                    pass

            return JsonResponse({
                "status": "success",
                "message": budget_msg,
                "action": "daily_budget",
                "daily_budget": daily_info
            })

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
                f"📅 *Today's Expenses ({today.strftime('%d %b %Y')}):* ₹{today_total:,.0f}",
                f"━━━━━━━━━━━━━━━━━━"
            ]
            if today_qs.exists():
                for exp in today_qs[:8]:
                    icon = CAT_ICONS.get(exp.category, "📦")
                    lines.append(f"• {icon} *₹{exp.amount:,.0f}* - {exp.description or exp.category.title()}")
            else:
                lines.append("No expenses recorded for today yet. 👍")
                
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
                    f"{'⚠️ Budget limit reached! 🛑' if rem == 0 else '✅ Budget is on track! 👍'}"
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

        # ── Intercept Trip / Split Live Link Request (WhatsApp Bot) ──
        trip_link_triggers = [
            "trip link", "trip ka link", "active trip link", "active trip ka link",
            "active trip", "split link", "split ka link", "share trip", "share link",
            "trip share", "trip url", "group link", "trip link bhejo", "link bhejo",
            "share split", "mera trip link", "active split", "current trip", "trip hisab link",
            "trip hisaab link", "/triplink", "/splitlink", "link trip wala", "trip wala link"
        ]
        is_asking_trip_link = (
            any(trg in lower_text for trg in trip_link_triggers) or
            ("link" in lower_text and any(w in lower_text for w in ["trip", "split", "group", "hisaab", "hisab"]))
        ) and not any(w in lower_text for w in ["paid", "diya", "add", "spent"])

        if is_asking_trip_link:
            clean_query = lower_text
            for noise in ["link", "trip", "ka", "wala", "bhejo", "active", "split", "share", "mera", "meri", "de do", "dedo", "send", "plz", "please", "bhai"]:
                clean_query = clean_query.replace(noise, "")
            clean_query = clean_query.strip()

            group = None
            if clean_query and len(clean_query) >= 2:
                group = SplitGroup.objects.filter(creator=target_user, name__icontains=clean_query).order_by('-id').first()
                if not group:
                    group = SplitGroup.objects.filter(members__name__iexact=user_name, name__icontains=clean_query).order_by('-id').first()

            if not group:
                group = SplitGroup.objects.filter(creator=target_user, is_settled=False).order_by('-id').first()
            if not group:
                group = SplitGroup.objects.filter(members__name__iexact=user_name, is_settled=False).order_by('-id').first()
            if not group:
                group = SplitGroup.objects.filter(creator=target_user).order_by('-id').first()

            if group:
                try:
                    host_domain = request.build_absolute_uri('/')[:-1]
                except Exception:
                    host_domain = "https://expense-coach-prxm.onrender.com"

                if "localhost" in host_domain or "127.0.0.1" in host_domain or "testserver" in host_domain:
                    host_domain = os.getenv('PUBLIC_APP_URL') or os.getenv('RENDER_EXTERNAL_URL') or "https://expense-coach-prxm.onrender.com"
                settlement = compute_group_settlement(group, host_domain)
                return JsonResponse({
                    "status": "success",
                    "message": settlement["whatsapp_message"],
                    "data": settlement
                })
            else:
                return JsonResponse({
                    "status": "success",
                    "message": (
                        "❌ *No Active Trips Found*\n\n"
                        "To start a new trip split, send a message like:\n"
                        "👉 *Goa trip: Ajay 2000, Aman 2000*\n\n"
                        "Or open the *Expense Split* tab in the app to create a group! 🏖️"
                    )
                })

        # ── Intercept Trip History / Split History ──
        trip_history_triggers = [
            "trip history", "split history", "my trips", "all trips", "show my trips"
        ]
        if any(trg in lower_text for trg in trip_history_triggers) and not any(char.isdigit() for char in lower_text):
            host_domain = request.build_absolute_uri('/')[:-1]
            if "localhost" in host_domain or "127.0.0.1" in host_domain:
                host_domain = os.getenv('PUBLIC_APP_URL') or os.getenv('RENDER_EXTERNAL_URL') or "https://expense-coach-prxm.onrender.com"
            splits_url = f"{host_domain}/splits/"
            return JsonResponse({
                "status": "success", 
                "message": f"✈️ *Your Trip & Split History*\n\nView and manage all your group trips and splits here:\n🔗 {splits_url}\n\n_(Log in with your registered phone number)_"
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
                host_domain = os.getenv('PUBLIC_APP_URL') or os.getenv('RENDER_EXTERNAL_URL') or "https://expense-coach-prxm.onrender.com"
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
            except (json.JSONDecodeError, TypeError, AttributeError, KeyError):
                last_bot_action = None

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
                model=_get_groq_model(),
                temperature=0.7,
                max_tokens=800,
            )
            full_response = response.choices[0].message.content or ""
        except Exception as e_groq:
            logger.warning("Primary groq model error: %s, falling back to openai/gpt-oss-120b", e_groq)
            try:
                response = _groq_client().chat.completions.create(
                    messages=messages,
                    model="openai/gpt-oss-120b",
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
                    "message": "Could not detect the expense amount. Please include the amount (e.g. '500 petrol' or '200 coffee'). 🎙️"
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
                chat_response = f"Hello *{user_name}*! How is your day going? Would you like to log an expense or check your budget? 😊"
            
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
        return JsonResponse({"status": "error", "message": "Could not understand the AI response. Please try again! 🔄"})
    except Exception as e:
        user_id = target_user.id if target_user else "unknown"
        logger.error("Voice expense error uid=%s error=%s", user_id, e, exc_info=True)
        return JsonResponse({"status": "error", "message": "😅 A momentary server glitch occurred. Please try again in a few moments."})


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

    system = f"""You are Expense Tracker AI, a smart, friendly, and respectful personal financial coach. 
NEVER use disrespectful words like 'Tu/Tera'. ALWAYS use 'Aap/Bhai'. Speak in natural, polite Hinglish.

══ USER's {today.strftime('%B %Y')} LIVE FINANCIAL SNAPSHOT ══
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

══ CRITICAL RULES ══
1. You HAVE full direct access to the user's live financial data shown above. NEVER say "mere paas aapka data nahi hai", "I don't have access to your bank", or "share your statements".
2. Always answer their questions directly, warmly, and accurately using the numbers above.
3. Keep responses concise, conversational, and helpful — under 80 words.
4. If budget is exceeded or getting high, gently advise them like a caring brother/friend.
5. If user says hi/hello or general greeting, respond warmly and give a quick 1-sentence budget status."""

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
            model=_get_groq_model(),
            temperature=0.7,
            max_tokens=1000,
        )
        reply = re.sub(r"<think>(?:.*?</think>|.*$)", "", resp.choices[0].message.content, flags=re.DOTALL).strip()
        if not reply:
            reply = f"This month your total spend is ₹{stats['total_spent']:,.0f} with ₹{stats['remaining_budget']:,.0f} remaining from your budget. Let me know if you need specific insights! 📊"
        logger.info("AI chat uid=%s msg_len=%d", request.user.id, len(user_msg))
        return JsonResponse({"reply": reply, "status": "success"})

    except Exception as e:
        logger.warning("AI chat primary model failed uid=%s error=%s, trying fallback", request.user.id, e)
        try:
            resp = _groq_client().chat.completions.create(
                messages=messages_payload,
                model="openai/gpt-oss-20b",
                temperature=0.7,
                max_tokens=800,
            )
            reply = re.sub(r"<think>(?:.*?</think>|.*$)", "", resp.choices[0].message.content, flags=re.DOTALL).strip()
            if not reply:
                reply = f"This month your total spend is ₹{stats['total_spent']:,.0f} with ₹{stats['remaining_budget']:,.0f} remaining in your budget! 📊"
            return JsonResponse({"reply": reply, "status": "success"})
        except Exception as e2:
            logger.error("AI chat fallback uid=%s error=%s", request.user.id, e2)
            fallback_text = f"This month your total spend is ₹{stats['total_spent']:,.0f} (Budget: ₹{budget:,.0f}). You have ₹{stats['remaining_budget']:,.0f} remaining. 📊"
            return JsonResponse({
                "reply":  fallback_text,
                "status": "success",
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


def invalidate_user_caches(user):
    """PERF-001: Instant RAM cache invalidation for user metrics."""
    if not user or not getattr(user, 'is_authenticated', False):
        return
    try:
        cache.delete(f"summary_stats_u_{user.id}")
        cache.delete(f"dash_all_{user.id}")
    except Exception:
        pass


@api_login_required
def api_summary_stats(request: HttpRequest) -> JsonResponse:
    cache_key = f"summary_stats_u_{request.user.id}"
    cached = cache.get(cache_key)
    if cached is not None and not request.GET.get('fresh'):
        return JsonResponse(cached)

    budget   = get_user_budget(request)
    month_qs = get_filtered_expenses(request.user, "month")
    stats    = calculate_stats(month_qs, budget)
    today    = date.today()

    recent_qs = month_qs.values('id', 'title', 'category', 'amount', 'date', 'icon', 'description') if hasattr(Expense, 'title') else month_qs.values('id', 'category', 'amount', 'date', 'icon', 'description')
    
    payload = {
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
        "daily_budget":      calculate_daily_budget(request.user, today),
        "days_left": (
            (today.replace(day=1) + timedelta(days=32)).replace(day=1) - today
        ).days,
    }
    cache.set(cache_key, payload, timeout=10)
    return JsonResponse(payload)


@api_login_required
def api_dashboard_all(request: HttpRequest) -> JsonResponse:
    """
    PERF-001: Consolidated mega-endpoint for Mobile App Dashboard.
    Fetches stats, monthly comparison, anomalies, goals, and subscriptions in a single
    HTTP round-trip with in-memory caching to eliminate multi-request queue delay.
    """
    user = request.user
    cache_key = f"dash_all_{user.id}"
    cached = cache.get(cache_key)
    if cached is not None and not request.GET.get('fresh'):
        return JsonResponse(cached)

    today = date.today()
    budget = get_user_budget(request)
    month_qs = get_filtered_expenses(user, "month")
    stats = calculate_stats(month_qs, budget)

    recent_qs = month_qs.values('id', 'title', 'category', 'amount', 'date', 'icon', 'description') if hasattr(Expense, 'title') else month_qs.values('id', 'category', 'amount', 'date', 'icon', 'description')

    summary_stats = {
        "budget": budget,
        "budget_cycle_start_day": getattr(user.profile, 'budget_cycle_start_day', 1) if hasattr(user, 'profile') else 1,
        "total_spent": round(stats["total_spent"], 2),
        "remaining": round(stats["remaining_budget"], 2),
        "budget_percent": round(stats["budget_percent"], 1),
        "transaction_count": stats["transaction_count"],
        "avg_per_day": round(stats["avg_per_day"], 2),
        "savings_rate": round(stats["savings_rate"], 1),
        "overspent": stats["overspent"],
        "month": today.strftime("%B %Y"),
        "recent_expenses": list(recent_qs),
        "user_phone": user.profile.phone_number if hasattr(user, 'profile') else "",
        "whatsapp_linked": user.profile.whatsapp_linked if hasattr(user, 'profile') else False,
        "safe_to_spend": calculate_safe_to_spend(user, today),
        "daily_budget": calculate_daily_budget(user, today),
        "days_left": ((today.replace(day=1) + timedelta(days=32)).replace(day=1) - today).days,
    }

    try:
        comparison = build_monthly_comparison(user)
    except Exception:
        comparison = {}

    try:
        anomalies_list = detect_anomalies(user, budget)
    except Exception:
        anomalies_list = []

    try:
        goals = SavingsGoal.objects.filter(user=user)
        monthly_savings = max(budget - float(stats["total_spent"]), 0)
        goals_data = []
        for g in goals:
            rem = max(float(g.target_amount) - float(g.saved_amount), 0)
            months_needed = math_ceil(rem / monthly_savings) if monthly_savings > 0 and rem > 0 else None
            goals_data.append({
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
    except Exception:
        goals_data = []

    try:
        subs = Subscription.objects.filter(user=user).order_by("next_billing_date")
        subs_data = []
        for s in subs:
            days_until = (s.next_billing_date - today).days
            subs_data.append({
                "id": s.pk,
                "category": s.category,
                "icon": CAT_ICONS.get(s.category, "📦"),
                "color": CAT_COLORS.get(s.category, "#888"),
                "amount": float(s.amount),
                "next_billing": s.next_billing_date.isoformat(),
                "days_until": days_until,
                "due_soon": days_until <= 3,
                "yearly_cost": float(s.amount) * 12,
            })
        tot_m = sum(d["amount"] for d in subs_data)
        subs_payload = {
            "subscriptions": subs_data,
            "count": len(subs_data),
            "total_monthly": tot_m,
            "total_yearly": tot_m * 12,
        }
    except Exception:
        subs_payload = {"subscriptions": [], "count": 0, "total_monthly": 0, "total_yearly": 0}

    payload = {
        "status": "success",
        "stats": summary_stats,
        "comparison": comparison,
        "anomalies": anomalies_list,
        "goals": goals_data,
        "subscriptions": subs_payload,
    }
    cache.set(cache_key, payload, timeout=10)
    return JsonResponse(payload)


@api_login_required
def api_safe_to_spend(request: HttpRequest) -> JsonResponse:
    """REST endpoint returning current daily safe-to-spend allowance and metrics."""
    safe_data = calculate_safe_to_spend(request.user)
    return JsonResponse(safe_data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def api_daily_budget(request):
    """
    PHASE 9.1 & 9.2:
    GET: Returns today's daily budget calculation, status, remaining, day of cycle, and transactions.
    POST: Updates income/budget preferences:
      - monthly_income (float/decimal or null)
      - monthly_budget (float/decimal)
      - daily_budget_basis ('budget' or 'income')
      - daily_budget_rollover (bool)
      - budget_cycle_start_day (int 1-28)
    """
    request.scope = 'authenticated'
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'POST':
        data = request.data if hasattr(request, 'data') else {}
        if 'monthly_income' in data:
            inc = data.get('monthly_income')
            if inc is None or inc == '':
                profile.monthly_income = None
            else:
                try:
                    val = float(inc)
                    if val < 0:
                        return Response({'error': 'Monthly income cannot be negative.'}, status=400)
                    profile.monthly_income = val
                except (ValueError, TypeError):
                    return Response({'error': 'Invalid monthly income value.'}, status=400)

        if 'monthly_budget' in data:
            try:
                b_val = float(data['monthly_budget'])
                if b_val <= 0:
                    return Response({'error': 'Monthly budget must be positive.'}, status=400)
                profile.monthly_budget = b_val
            except (ValueError, TypeError):
                return Response({'error': 'Invalid monthly budget value.'}, status=400)

        if 'daily_budget_basis' in data:
            basis = str(data['daily_budget_basis']).lower().strip()
            if basis in ('budget', 'income'):
                profile.daily_budget_basis = basis

        if 'daily_budget_rollover' in data:
            profile.daily_budget_rollover = bool(data['daily_budget_rollover'])

        if 'budget_cycle_start_day' in data:
            try:
                sd = int(data['budget_cycle_start_day'])
                if 1 <= sd <= 28:
                    profile.budget_cycle_start_day = sd
            except (ValueError, TypeError):
                pass

        profile.save()

    res_data = calculate_daily_budget(user)
    return Response(res_data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def api_auto_expense(request):
    """
    PHASE 9.3:
    POST: Ingests an auto-captured or bank-synced expense.
      Fields: amount, merchant, source ("upi"|"bank"|"aa"|"auto"|"bank_sync"), timestamp, client_txn_id, description.
    GET: Lists auto-captured/bank-synced expenses with optional filter ?reviewed=false|true.
    """
    request.scope = 'authenticated'
    user = request.user

    if request.method == 'POST':
        data = request.data if hasattr(request, 'data') else {}
        amount = data.get('amount')
        merchant = data.get('merchant') or data.get('payee') or 'Payment'
        source = data.get('source') or 'auto'
        timestamp = data.get('timestamp')
        client_txn_id = data.get('client_txn_id')
        description = data.get('description')

        if not amount:
            return Response({'error': 'Amount is required.'}, status=400)

        from .auto_expense_service import process_auto_expense
        success, result, status_code = process_auto_expense(
            user=user,
            amount=amount,
            merchant=merchant,
            source=source,
            timestamp=timestamp,
            client_txn_id=client_txn_id,
            description=description
        )
        return Response(result, status=status_code)

    # GET request: list auto-captured expenses
    reviewed_param = request.GET.get('reviewed', '').strip().lower()
    qs = Expense.objects.filter(user=user, source__in=['auto', 'bank_sync', 'upi', 'bank'])
    if reviewed_param == 'false':
        qs = qs.filter(is_reviewed=False)
    elif reviewed_param == 'true':
        qs = qs.filter(is_reviewed=True)

    items = [
        {
            "id": e.id,
            "amount": float(e.amount),
            "category": e.category,
            "icon": e.icon,
            "description": e.description,
            "date": e.date.isoformat(),
            "source": e.source,
            "is_reviewed": e.is_reviewed,
            "client_txn_id": e.client_txn_id,
        }
        for e in qs[:50]
    ]
    return Response({"count": len(items), "expenses": items})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def api_auto_expense_review(request):
    """
    PHASE 9.3: Review, Confirm, Edit Category, or Undo (Delete) an auto-captured expense.
    Fields:
      - expense_id: int
      - action: 'confirm' | 'delete' | 'undo' | 'update_category'
      - new_category: string (optional)
    """
    request.scope = 'authenticated'
    user = request.user
    data = request.data if hasattr(request, 'data') else {}

    expense_id = data.get('expense_id')
    action = str(data.get('action', '')).strip().lower()

    if not expense_id:
        return Response({'error': 'expense_id is required.'}, status=400)

    try:
        expense = Expense.objects.get(id=expense_id, user=user)
    except Expense.DoesNotExist:
        return Response({'error': 'Expense not found.'}, status=404)

    if action in ('delete', 'undo'):
        expense.delete()
        return Response({'status': 'success', 'message': 'Expense deleted / undone successfully.'})

    elif action == 'confirm':
        expense.is_reviewed = True
        expense.save(update_fields=['is_reviewed'])
        return Response({'status': 'success', 'message': 'Expense confirmed.'})

    elif action == 'update_category':
        new_cat = str(data.get('new_category', '')).strip().lower()
        if not new_cat:
            return Response({'error': 'new_category is required.'}, status=400)

        expense.category = new_cat
        expense.icon = CAT_ICONS.get(new_cat, '💸')
        expense.is_reviewed = True
        expense.save(update_fields=['category', 'icon', 'is_reviewed'])

        # Remember per-user category correction
        merchant_name = (expense.description or '').replace('Auto-paid at ', '').strip().lower()
        if merchant_name:
            UserMerchantCategory.objects.update_or_create(
                user=user,
                merchant=merchant_name,
                defaults={'category': new_cat}
            )
        return Response({'status': 'success', 'message': f'Category updated to {new_cat} and remembered.'})

    return Response({'error': f'Invalid action: {action}'}, status=400)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def api_notification_settings(request):
    """
    PHASE 9.8:
    GET: Returns user notification & budget preferences.
    POST: Updates preferences (live_budget_alerts, morning_budget_push, morning_push_time,
          nightly_summary, nightly_push_time, notification_tone, repeat_nudges,
          daily_budget_rollover, daily_budget_basis, auto_capture_enabled, timezone_name).
    """
    request.scope = 'authenticated'
    user = request.user
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if request.method == 'POST':
        data = request.data if hasattr(request, 'data') else {}
        if 'live_budget_alerts' in data:
            profile.live_budget_alerts = bool(data['live_budget_alerts'])
        if 'morning_budget_push' in data:
            profile.morning_budget_push = bool(data['morning_budget_push'])
        if 'morning_push_time' in data:
            t = str(data['morning_push_time']).strip()
            if len(t) == 5 and ':' in t:
                profile.morning_push_time = t
        if 'nightly_summary' in data:
            profile.nightly_summary = bool(data['nightly_summary'])
        if 'nightly_push_time' in data:
            t = str(data['nightly_push_time']).strip()
            if len(t) == 5 and ':' in t:
                profile.nightly_push_time = t
        if 'notification_tone' in data:
            tone = str(data['notification_tone']).strip().lower()
            if tone in ('normal', 'roast'):
                profile.notification_tone = tone
        if 'repeat_nudges' in data:
            profile.repeat_nudges = bool(data['repeat_nudges'])
        if 'daily_budget_rollover' in data:
            profile.daily_budget_rollover = bool(data['daily_budget_rollover'])
        if 'daily_budget_basis' in data:
            basis = str(data['daily_budget_basis']).strip().lower()
            if basis in ('budget', 'income'):
                profile.daily_budget_basis = basis
        if 'auto_capture_enabled' in data:
            profile.auto_capture_enabled = bool(data['auto_capture_enabled'])
        if 'timezone_name' in data:
            tz = str(data['timezone_name']).strip()
            if tz:
                profile.timezone_name = tz

        profile.save()

    return Response({
        "status": "success",
        "live_budget_alerts": profile.live_budget_alerts,
        "morning_budget_push": profile.morning_budget_push,
        "morning_push_time": profile.morning_push_time,
        "nightly_summary": profile.nightly_summary,
        "nightly_push_time": profile.nightly_push_time,
        "notification_tone": profile.notification_tone,
        "repeat_nudges": profile.repeat_nudges,
        "daily_budget_rollover": profile.daily_budget_rollover,
        "daily_budget_basis": profile.daily_budget_basis,
        "auto_capture_enabled": profile.auto_capture_enabled,
        "timezone_name": profile.timezone_name,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([ScopedRateThrottle])
def api_money_breakdown(request):
    """
    PHASE 9.6: "Where Did My Money Go" breakdown endpoint.
    GET /api/money-breakdown/?period=today|week|month
    Returns:
      - totals and percentages by:
          * Food & drink
          * Groceries & quick-commerce
          * Shopping
          * Subscriptions
          * Transport
          * Bills & Utilities
          * Other UPI & random payments
      - top 5 merchants
      - daily-budget status for the period
      - suggested subscriptions (detected recurring payments)
    """
    request.scope = 'authenticated'
    user = request.user
    today = timezone.localdate()

    period = str(request.GET.get('period', 'month')).lower().strip()
    if period == 'today':
        qs = Expense.objects.filter(user=user, date=today)
    elif period == 'week':
        qs = Expense.objects.filter(user=user, date__gte=today - timedelta(days=7), date__lte=today)
    else:
        period = 'month'
        start_date, end_date = get_budget_cycle_dates(user, today)
        qs = Expense.objects.filter(user=user, date__range=(start_date, end_date))

    total_spent = float(qs.aggregate(t=Sum('amount'))['t'] or 0)

    # Defined breakdown buckets
    buckets = {
        "food": {"name": "Food & Drink", "icon": "🍜", "color": "#6C5CE7", "total": 0.0, "count": 0},
        "groceries": {"name": "Groceries & Quick-Commerce", "icon": "🛒", "color": "#10B981", "total": 0.0, "count": 0},
        "shopping": {"name": "Shopping", "icon": "🛍️", "color": "#EC4899", "total": 0.0, "count": 0},
        "subscriptions": {"name": "Subscriptions", "icon": "🎬", "color": "#F59E0B", "total": 0.0, "count": 0},
        "transport": {"name": "Transport", "icon": "🚗", "color": "#06B6D4", "total": 0.0, "count": 0},
        "bills": {"name": "Bills & Utilities", "icon": "⚡", "color": "#8B5CF6", "total": 0.0, "count": 0},
        "other": {"name": "Other UPI & Random Payments", "icon": "📦", "color": "#94A3B8", "total": 0.0, "count": 0},
    }

    grocery_keywords = {"blinkit", "zepto", "instamart", "bigbasket", "bb daily", "dmart", "grocery", "sabzi"}

    for exp in qs:
        amt = float(exp.amount)
        cat = (exp.category or 'other').lower()
        desc = (exp.description or '').lower()

        if any(gk in desc for gk in grocery_keywords):
            b_key = "groceries"
        elif cat in ("food", "dining", "restaurant"):
            b_key = "food"
        elif cat == "shopping":
            b_key = "shopping"
        elif cat in ("entertainment", "subscription", "ott"):
            b_key = "subscriptions"
        elif cat in ("transport", "travel", "fuel"):
            b_key = "transport"
        elif cat in ("utilities", "bills", "rent"):
            b_key = "bills"
        else:
            b_key = "other"

        buckets[b_key]["total"] += amt
        buckets[b_key]["count"] += 1

    breakdown_list = []
    for k, v in buckets.items():
        pct = round((v["total"] / total_spent * 100), 1) if total_spent > 0 else 0.0
        breakdown_list.append({
            "key": k,
            "name": v["name"],
            "icon": v["icon"],
            "color": v["color"],
            "total": round(v["total"], 2),
            "amount": round(v["total"], 2),
            "count": v["count"],
            "percent": pct,
        })
    breakdown_list.sort(key=lambda x: x["total"], reverse=True)

    # Top 5 merchants
    merchant_map = {}
    for exp in qs:
        m_name = (exp.description or exp.category).strip()
        if m_name.lower().startswith('auto-paid at '):
            m_name = m_name[13:].strip()
        merchant_map[m_name] = merchant_map.get(m_name, 0.0) + float(exp.amount)

    top_merchants = [
        {"merchant": m, "total": round(amt, 2)}
        for m, amt in sorted(merchant_map.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # Recurring payment detection over last 90 days
    existing_sub_names = set(Subscription.objects.filter(user=user).values_list('name', flat=True))
    existing_sub_names_clean = {s.lower().strip() for s in existing_sub_names}

    three_months_ago = today - timedelta(days=90)
    history_expenses = Expense.objects.filter(user=user, date__gte=three_months_ago)

    rec_candidates = {}
    for exp in history_expenses:
        m_name = (exp.description or exp.category).strip()
        if m_name.lower().startswith('auto-paid at '):
            m_name = m_name[13:].strip()
        clean_m = m_name.lower()
        if clean_m not in rec_candidates:
            rec_candidates[clean_m] = {"display_name": m_name, "txs": [], "category": exp.category}
        rec_candidates[clean_m]["txs"].append((exp.date, float(exp.amount)))

    suggested_subscriptions = []
    for clean_m, info in rec_candidates.items():
        if clean_m in existing_sub_names_clean:
            continue
        txs = info["txs"]
        if len(txs) >= 2:
            dates = [t[0] for t in txs]
            months_seen = {d.strftime('%Y-%m') for d in dates}
            if len(months_seen) >= 2:
                avg_amt = sum(t[1] for t in txs) / len(txs)
                suggested_subscriptions.append({
                    "name": info["display_name"],
                    "merchant": info["display_name"],
                    "amount": round(avg_amt, 2),
                    "suggested_amount": round(avg_amt, 2),
                    "category": info["category"],
                    "frequency": "Monthly",
                    "reason": f"Detected in {len(months_seen)} separate months"
                })

    daily_status = calculate_daily_budget(user, today)

    return Response({
        "status": "success",
        "period": period,
        "total_spent": round(total_spent, 2),
        "breakdown": breakdown_list,
        "categories": breakdown_list,
        "top_merchants": top_merchants,
        "suggested_subscriptions": suggested_subscriptions[:5],
        "recurring_candidates": suggested_subscriptions[:5],
        "daily_budget": daily_status,
        "daily_budget_status": daily_status,
    })


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
    """
    Readiness probe: returns 200 only if DB query succeeds, 503 otherwise.
    Keeps all existing JSON fields for backward compatibility.
    """
    from django.db import connection
    db_ok = True
    db_error = None
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as exc:
        db_ok = False
        db_error = str(exc)

    status_code = 200 if db_ok else 503
    payload = {
        "status":    "ok" if db_ok else "degraded",
        "service":   "ExpenseTracker",
        "version":   "3.3.0-turbo",
        "timestamp": datetime.now().isoformat(),
    }
    if not db_ok:
        payload["database"] = "unreachable"
        if getattr(settings, 'DEBUG', False):
            payload["error"] = db_error

    return JsonResponse(payload, status=status_code)


def health_live(request: HttpRequest) -> JsonResponse:
    """
    Liveness probe: verifies process is running without touching the database.
    """
    return JsonResponse({
        "status":    "ok",
        "service":   "ExpenseTracker",
        "version":   "3.3.0-turbo",
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

        if "budget" in body or "monthly_income" in body:
            try:
                profile, _ = UserProfile.objects.get_or_create(user=user)
                if "budget" in body:
                    nb = float(body["budget"])
                    if nb <= 0:
                        raise ValueError
                    profile.monthly_budget = nb

                if "monthly_income" in body:
                    inc = body["monthly_income"]
                    if inc is None or inc == "":
                        profile.monthly_income = None
                    else:
                        val = float(inc)
                        if val < 0:
                            raise ValueError
                        profile.monthly_income = val

                if "daily_budget_basis" in body:
                    basis = str(body["daily_budget_basis"]).lower().strip()
                    if basis in ("budget", "income"):
                        profile.daily_budget_basis = basis

                if "daily_budget_rollover" in body:
                    profile.daily_budget_rollover = bool(body["daily_budget_rollover"])
                
                if "budget_cycle_start_day" in body:
                    sd = int(body["budget_cycle_start_day"])
                    if 1 <= sd <= 28:
                        profile.budget_cycle_start_day = sd
                        
                profile.save()
                return JsonResponse({"status": "success", "message": "Budget settings updated successfully"})
            except ValueError:
                return JsonResponse({"error": "Invalid budget or income value"}, status=400)

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
        "monthly_income": float(profile.monthly_income) if profile and profile.monthly_income is not None else None,
        "daily_budget_basis": getattr(profile, 'daily_budget_basis', 'budget') if profile else 'budget',
        "daily_budget_rollover": getattr(profile, 'daily_budget_rollover', False) if profile else False,
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
        description=validated.get("description", "") or "",
    )
    update_user_gamification(request.user, validated["date"])
    invalidate_user_caches(request.user)

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

    if "description" in data:
        expense.description = str(data["description"]).strip()[:255]

    if "date" in data:
        try:
            exp_date = date.fromisoformat(str(data["date"]))
            if exp_date <= date.today():
                expense.date = exp_date
        except ValueError:
            pass

    expense.save()
    invalidate_user_caches(request.user)

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
    invalidate_user_caches(request.user)
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
            model=_get_groq_model(),
            temperature=0.8,
            max_tokens=1000,
        )
        warning_msg = re.sub(r"<think>(?:.*?</think>|.*$)", "", response.choices[0].message.content, flags=re.DOTALL).strip()
        return JsonResponse({"warning": warning_msg})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
def whatsapp_summary(request):
    if request.method != "POST":
        return JsonResponse({"status": "error", "message": "Only POST requests allowed"}, status=405)

    incoming_secret = request.META.get('HTTP_X_INTERNAL_SECRET', '')
    expected_secret = getattr(settings, 'INTERNAL_BOT_SECRET', '')
    if not (expected_secret and incoming_secret and hmac.compare_digest(str(incoming_secret), str(expected_secret))):
        logger.warning("Unauthorized access attempt to whatsapp_summary")
        return JsonResponse({"status": "error", "message": "Unauthorized internal endpoint."}, status=401)

    try:
        data = json.loads(request.body)
        phone = data.get("phone", "").strip()

        # Exact matching on normalized phone candidates, preferring linked whatsapp_number
        digits = re.sub(r'\D', '', phone)
        candidates = [phone, digits]
        if len(digits) == 10:
            candidates.extend([f"91{digits}", f"+91{digits}"])
        elif digits.startswith('91') and len(digits) == 12:
            candidates.extend([digits[2:], f"+{digits}"])

        profile = UserProfile.objects.filter(whatsapp_linked=True, whatsapp_number__in=candidates).select_related('user').first()
        if not profile:
            profile = UserProfile.objects.filter(phone_number__in=candidates).select_related('user').first()
        
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
            cat_breakdown = "  No expenses logged yet!"
        
        # 4. WHATSAPP REPORT MESSAGE
        report_msg = f"📊 *ExpenseTracker Lifetime Report*\n\n"
        report_msg += f"💸 *All-Time Total Spent:* ₹{lifetime_spent:,.0f}\n"
        report_msg += f"📅 *This Month Spent:* ₹{month_spent:,.0f} (Budget: ₹{budget:,.0f})\n"
        report_msg += f"✅ *Remaining Budget:* ₹{remaining:,.0f}\n\n"
        report_msg += f"🔥 *Top 3 Categories (Lifetime):*\n{cat_breakdown}\n\n"
        
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

@csrf_protect
def delete_account_view(request: HttpRequest) -> HttpResponse:
    """
    Public web page for user account and data deletion compliance (Google Play / App Store).
    Supports authenticated and unauthenticated credential verification.
    """
    context = {"deleted": False, "error": None}

    if request.method == "POST":
        target_user = None
        if request.user.is_authenticated:
            target_user = request.user
            password = request.POST.get("password")
            if target_user.has_usable_password() and password:
                if not target_user.check_password(password):
                    context["error"] = "Incorrect password. Account deletion aborted."
                    return render(request, "tracker/delete_account.html", context, status=400)
            elif target_user.has_usable_password() and not password:
                context["error"] = "Password is required to confirm account deletion."
                return render(request, "tracker/delete_account.html", context, status=400)
        else:
            identifier = request.POST.get("identifier", "").strip()
            password = request.POST.get("password", "").strip()
            if not identifier or not password:
                context["error"] = "Both username/email and password are required."
                return render(request, "tracker/delete_account.html", context, status=400)

            from django.contrib.auth import authenticate
            user_by_name = authenticate(request, username=identifier, password=password)
            if user_by_name:
                target_user = user_by_name
            else:
                matching = User.objects.filter(email__iexact=identifier)
                for u in matching:
                    if u.check_password(password):
                        target_user = u
                        break
                if not target_user:
                    profiles = UserProfile.objects.filter(phone_number__endswith=identifier[-10:] if len(identifier) >= 10 else identifier)
                    for p in profiles:
                        if p.user and p.user.check_password(password):
                            target_user = p.user
                            break

            if not target_user:
                context["error"] = "Invalid credentials. Account deletion aborted."
                return render(request, "tracker/delete_account.html", context, status=400)

        if request.user.is_authenticated:
            from django.contrib.auth import logout
            logout(request)

        target_user.delete()
        context["deleted"] = True
        return render(request, "tracker/delete_account.html", context)

    return render(request, "tracker/delete_account.html", context)

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

@api_login_required
def wa_link_status(request: HttpRequest) -> JsonResponse:
    try:
        profile = request.user.profile
        return JsonResponse({
            "linked": profile.whatsapp_linked,
            "whatsapp_number": profile.whatsapp_number
        })
    except Exception:
        return JsonResponse({"linked": False, "whatsapp_number": None})


@api_login_required
def generate_wa_link_code(request: HttpRequest) -> JsonResponse:
    """SEC-004: Generate a short-lived, timing-safe one-time code to link WhatsApp."""
    if request.method != "POST":
        return JsonResponse({"error": "POST only"}, status=405)

    profile = getattr(request.user, 'profile', None)
    if not profile:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

    import secrets
    raw_code = f"{secrets.randbelow(900000) + 100000}"
    code_hash = hashlib.sha256(raw_code.encode()).hexdigest()

    profile.whatsapp_link_token = code_hash
    profile.whatsapp_link_expires = timezone.now() + timedelta(minutes=15)
    profile.save(update_fields=['whatsapp_link_token', 'whatsapp_link_expires'])

    return JsonResponse({
        "status": "success",
        "code": raw_code,
        "expires_in_minutes": 15,
        "message": f"Send 'link {raw_code}' to our WhatsApp bot within 15 minutes."
    })


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
    budget = float(getattr(request.user.profile, 'monthly_budget', 20000)) if hasattr(request.user, 'profile') else 20000.0
    month_qs = Expense.objects.filter(
        user=request.user,
        date__year=date.today().year,
        date__month=date.today().month
    )
    month_spent = _safe_float(month_qs.aggregate(t=Sum("amount"))["t"])
    monthly_savings = max(budget - month_spent, 0)

    data = []
    for g in goals:
        remaining = max(float(g.target_amount) - float(g.saved_amount), 0)
        if monthly_savings > 0 and remaining > 0:
            months_needed = math_ceil(remaining / monthly_savings)
        else:
            months_needed = None
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
                f"You are a friendly personal financial coach.\n"
                f"User Name: {user_name}\n"
                f"Time: Morning\n"
                f"Today's Safe-to-Spend Allowance: ₹{safe_allowance:,.0f}\n"
                f"Past 7 days total spent: ₹{week_total:,.0f}\n"
                f"Top spending category: {cat_name} (₹{cat_total:,.0f})\n"
                f"Monthly budget status: {budget_pct:.0f}% of ₹{budget:,.0f} budget used (₹{month_spent:,.0f} spent)\n\n"
                f"Write a very short, simple Good Morning message for WhatsApp in pure English.\n"
                f"STRICT RULES:\n"
                f"1. LANGUAGE: Simple, clear, everyday English ONLY. Absolutely NO Hindi or Hinglish words.\n"
                f"2. GREETING: Start with '*Good Morning, {user_name}!* ☀️' or '*Good Morning, {user_name}!* 🌅'.\n"
                f"3. SAFE-TO-SPEND: Clearly mention today's Safe-to-Spend limit of *₹{safe_allowance:,.0f}*.\n"
                f"4. CONTENT: Keep it very simple and positive — one short sentence to spend mindfully today.\n"
                f"5. TONE: Warm, encouraging, and clear.\n"
                f"6. LENGTH: 15-25 words maximum! Very short and simple.\n"
                f"7. FORMAT: Use WhatsApp *bold* formatting for key limit and 1-2 friendly emojis.\n"
                f"Return ONLY the final message to be sent."
            )
        else:
            prompt = (
                f"You are a friendly personal financial coach.\n"
                f"User Name: {user_name}\n"
                f"Time: Night\n"
                f"Past 7 days total spent: ₹{week_total:,.0f}\n"
                f"Top spending category: {cat_name} (₹{cat_total:,.0f})\n"
                f"Monthly budget status: {budget_pct:.0f}% of ₹{budget:,.0f} budget used (₹{month_spent:,.0f} spent)\n\n"
                f"Write a very short, simple Good Night message for WhatsApp in pure English.\n"
                f"STRICT RULES:\n"
                f"1. LANGUAGE: Simple, clear, everyday English ONLY. Absolutely NO Hindi or Hinglish words.\n"
                f"2. GREETING: Start with '*Good Night, {user_name}!* 🌙' or '*Good Night, {user_name}!* ✨'.\n"
                f"3. CONTENT: A simple, gentle reminder to log today's expenses and get good sleep.\n"
                f"4. TONE: Peaceful, relaxing, and positive.\n"
                f"5. LENGTH: 15-25 words maximum! Very short and simple.\n"
                f"6. FORMAT: Use WhatsApp *bold* formatting and 1-2 friendly emojis.\n"
                f"Return ONLY the final message to be sent."
            )

        r = _groq_client().chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=_get_groq_model(),
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
    expected_secret = getattr(settings, 'DAILY_TIP_SECRET', None) or os.getenv('DAILY_TIP_SECRET', '')
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
    expected_secret = getattr(settings, 'DAILY_TIP_SECRET', None) or os.getenv('DAILY_TIP_SECRET', '')
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
    expected_secret = getattr(settings, 'DAILY_TIP_SECRET', None) or os.getenv('DAILY_TIP_SECRET', '')
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
        host_domain = os.getenv('PUBLIC_APP_URL') or os.getenv('RENDER_EXTERNAL_URL') or "https://expense-coach-prxm.onrender.com"
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
            model=_get_groq_model(),
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

    # Rate limiting for public settle (generous: max 60 settlements per 5 min per IP, 120 per token)
    client_ip = _get_client_ip(request)
    cache_key_ip = f"throttle_pub_settle_ip_{client_ip}"
    cache_key_token = f"throttle_pub_settle_token_{share_token}"
    ip_count = cache.get(cache_key_ip, 0)
    token_count = cache.get(cache_key_token, 0)
    if ip_count >= 60 or token_count >= 120:
        return JsonResponse({"error": "Too many requests. Please slow down and try again shortly."}, status=429)
    cache.set(cache_key_ip, ip_count + 1, timeout=300)
    cache.set(cache_key_token, token_count + 1, timeout=300)
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

    # Rate limiting for public settle (generous: max 60 settlements per 5 min per IP, 120 per token)
    client_ip = _get_client_ip(request)
    cache_key_ip = f"throttle_pub_settle_ip_{client_ip}"
    cache_key_token = f"throttle_pub_settle_token_{share_token}"
    ip_count = cache.get(cache_key_ip, 0)
    token_count = cache.get(cache_key_token, 0)
    if ip_count >= 60 or token_count >= 120:
        return JsonResponse({"error": "Too many requests. Please slow down and try again shortly."}, status=429)
    cache.set(cache_key_ip, ip_count + 1, timeout=300)
    cache.set(cache_key_token, token_count + 1, timeout=300)
    if group.is_settled:
        return JsonResponse({"error": "This split group is already settled!"}, status=400)

    # Rate limiting for public writes (generous: max 60 writes per 5 min per IP, 120 per token)
    client_ip = _get_client_ip(request)
    cache_key_ip = f"throttle_pub_split_ip_{client_ip}"
    cache_key_token = f"throttle_pub_split_token_{share_token}"
    ip_count = cache.get(cache_key_ip, 0)
    token_count = cache.get(cache_key_token, 0)
    if ip_count >= 60 or token_count >= 120:
        return JsonResponse({"error": "Too many requests. Please slow down and try again shortly."}, status=429)
    cache.set(cache_key_ip, ip_count + 1, timeout=300)
    cache.set(cache_key_token, token_count + 1, timeout=300)

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

    # Rate limiting for public settle (generous: max 60 settlements per 5 min per IP, 120 per token)
    client_ip = _get_client_ip(request)
    cache_key_ip = f"throttle_pub_settle_ip_{client_ip}"
    cache_key_token = f"throttle_pub_settle_token_{share_token}"
    ip_count = cache.get(cache_key_ip, 0)
    token_count = cache.get(cache_key_token, 0)
    if ip_count >= 60 or token_count >= 120:
        return JsonResponse({"error": "Too many requests. Please slow down and try again shortly."}, status=429)
    cache.set(cache_key_ip, ip_count + 1, timeout=300)
    cache.set(cache_key_token, token_count + 1, timeout=300)

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

    # Rate limiting for public settle (generous: max 60 settlements per 5 min per IP, 120 per token)
    client_ip = _get_client_ip(request)
    cache_key_ip = f"throttle_pub_settle_ip_{client_ip}"
    cache_key_token = f"throttle_pub_settle_token_{share_token}"
    ip_count = cache.get(cache_key_ip, 0)
    token_count = cache.get(cache_key_token, 0)
    if ip_count >= 60 or token_count >= 120:
        return JsonResponse({"error": "Too many requests. Please slow down and try again shortly."}, status=429)
    cache.set(cache_key_ip, ip_count + 1, timeout=300)
    cache.set(cache_key_token, token_count + 1, timeout=300)

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
            model=_get_groq_model(),
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
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import throttle_classes
from tracker.authentication import touch_token_activity, validate_and_touch_token
import secrets
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

class CustomAuthToken(ObtainAuthToken):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'auth'
    
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
            # Timing-safe dummy calculation
            User().set_password('timing_safety_dummy_password')
            return Response({
                'error': 'No account found with this username, email or mobile number.',
                'code': 'ACCOUNT_NOT_FOUND'
            }, status=404)
            
        authenticated_user = authenticate(request=request, username=user.username, password=password)
        if not authenticated_user:
            return Response({'error': 'Incorrect password. Please check your password.'}, status=401)
            
        token, created = Token.objects.get_or_create(user=authenticated_user)
        touch_token_activity(token)
        
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
            touch_token_activity(token)
        
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
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import throttle_classes
from tracker.authentication import touch_token_activity, validate_and_touch_token
import secrets
from django.conf import settings
from .models import AppAnalyticsEvent, AppErrorLog

def generate_expense_tracker_email_html(otp_code, title="Account Verification", subtitle="Use the one-time code below to securely verify your account on Expense Tracker:"):
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expense Tracker Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F111A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0F111A; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: #161824; border: 1px solid rgba(124, 111, 247, 0.25); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);">
          
          <!-- Top Accent Gradient Line -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #7C6FF7, #9061F9, #38BDF8); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 36px 32px 20px 32px; text-align: center;">
              <!-- App Logo Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td align="center" style="width: 58px; height: 58px; background: linear-gradient(135deg, #7C6FF7, #6366F1); border-radius: 18px; box-shadow: 0 10px 20px rgba(124, 111, 247, 0.35); text-align: center;">
                    <span style="font-size: 28px; line-height: 58px; display: block;">💰</span>
                  </td>
                </tr>
              </table>

              <!-- Brand Name -->
              <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px;">
                Expense Tracker
              </h1>
              
              <!-- Purpose Pill -->
              <div style="display: inline-block; padding: 4px 14px; background: rgba(124, 111, 247, 0.15); border: 1px solid rgba(124, 111, 247, 0.35); border-radius: 20px; font-size: 11px; font-weight: 700; color: #A78BFA; letter-spacing: 0.8px; text-transform: uppercase;">
                {title}
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                {subtitle}
              </p>

              <!-- OTP Display Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 auto 20px auto;">
                <tr>
                  <td align="center">
                    <div style="background: #1E2130; border: 2px dashed #7C6FF7; border-radius: 16px; padding: 20px 30px; display: inline-block; box-shadow: 0 0 30px rgba(124, 111, 247, 0.2);">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #FFFFFF; display: block;">
                        {otp_code}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry Alert -->
              <div style="display: inline-block; padding: 6px 16px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.28); border-radius: 20px; font-size: 12px; color: #FBBF24; font-weight: 600; margin-bottom: 24px;">
                ⏱️ Valid for <strong>5 minutes</strong> only
              </div>

              <!-- Security Warning -->
              <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px 18px; text-align: left;">
                <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94A3B8;">
                  🔒 <strong style="color: #F1F5F9;">Security Tip:</strong> Never share this verification code with anyone. Expense Tracker team will never ask for your code over call or chat.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background: #11131C; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B;">
                Sent securely by <strong>Expense Tracker</strong> • AI Financial Coach
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Need assistance? Contact <a href="mailto:expensetracker.care@gmail.com" style="color: #7C6FF7; text-decoration: none;">expensetracker.care@gmail.com</a>
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
    if record.created_at and timezone.now() - record.created_at > timedelta(minutes=10):
        return False

    clean_code = str(code).strip()

    # 1. Match hash with record's own stored action
    expected = _hash_otp(record.identifier, record.action or 'general', clean_code)
    if hmac.compare_digest(record.otp_code, expected):
        return True

    # 2. Match hash with caller's requested action
    if action:
        expected_act = _hash_otp(record.identifier, action, clean_code)
        if hmac.compare_digest(record.otp_code, expected_act):
            return True

    # 3. Match hash across standard actions to ensure inter-compatibility
    for act in ['login', 'register', 'general', 'reset', 'link_phone']:
        if hmac.compare_digest(record.otp_code, _hash_otp(record.identifier, act, clean_code)):
            return True

    # 4. Fallback: direct plain text comparison (if stored unhashed in legacy/fallback scenarios)
    if hmac.compare_digest(record.otp_code, clean_code):
        return True

    return False


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def api_send_otp(request):
    request.throttle_scope = 'otp'
    raw_identifier = request.data.get('identifier') or request.data.get('phone_number') or request.data.get('email')
    action = request.data.get('action') or 'general'
    email_param = request.data.get('email')
    phone_param = request.data.get('phone_number')

    if not raw_identifier and not phone_param and not email_param:
        return Response({'error': 'Username, phone number or email is required.'}, status=400)

    # 1. Identify Email Target
    email_target = None
    candidates_email = [email_param, raw_identifier]
    for e in candidates_email:
        if e and '@' in str(e):
            email_target = str(e).strip().lower()
            break

    # 2. Identify Phone Target (only if pure digits or formatted phone)
    phone_target = None
    candidates_phone = [phone_param, raw_identifier]
    for c in candidates_phone:
        if c and '@' not in str(c):
            s = str(c).strip()
            digits = ''.join(ch for ch in s if ch.isdigit())
            if digits and (s.startswith('+') or s.isdigit() or (len(digits) in [10, 12] and digits == s)):
                if len(digits) == 10:
                    phone_target = f"91{digits}"
                    break
                elif len(digits) >= 11:
                    phone_target = digits
                    break

    # Validation and Resolution based on action
    if action == 'register':
        if not phone_target and not email_target:
            return Response({'error': 'Please enter a valid 10-digit mobile number or email address.'}, status=400)
        if phone_target:
            p_alt = phone_target[2:] if phone_target.startswith('91') and len(phone_target) == 12 else phone_target
            if UserProfile.objects.filter(phone_number__in=[phone_target, p_alt]).exists():
                return Response({'error': 'An account with this phone number already exists.', 'code': 'PHONE_ALREADY_EXISTS'}, status=400)
        if email_target:
            if User.objects.filter(email__iexact=email_target).exists():
                return Response({'error': 'An account with this email already exists.', 'code': 'EMAIL_ALREADY_EXISTS'}, status=400)

    elif action in ['login', 'reset']:
        user = None
        if email_target:
            user = User.objects.filter(email__iexact=email_target).first()
        if not user and phone_target:
            p_alt = phone_target[2:] if phone_target.startswith('91') and len(phone_target) == 12 else phone_target
            profile = UserProfile.objects.filter(phone_number__in=[phone_target, p_alt]).first()
            if profile:
                user = profile.user
            else:
                user = User.objects.filter(username__in=[phone_target, p_alt]).first()
        if not user and raw_identifier:
            s_raw = str(raw_identifier).strip()
            user = User.objects.filter(username__iexact=s_raw).first()
            if not user and '@' in s_raw:
                user = User.objects.filter(email__iexact=s_raw.lower()).first()

        if not user:
            return Response({
                'error': 'No account found with this username, email or mobile number. Please check or register first.',
                'code': 'ACCOUNT_NOT_FOUND'
            }, status=404)

        # Populate targets from existing user profile
        if user.email and not email_target:
            email_target = user.email.strip().lower()
        if hasattr(user, 'profile') and user.profile.phone_number and not phone_target:
            p = str(user.profile.phone_number)
            if not p.startswith('g_'):
                digits = ''.join(ch for ch in p if ch.isdigit())
                if len(digits) == 10:
                    phone_target = f"91{digits}"
                elif len(digits) >= 11:
                    phone_target = digits

        if not phone_target and not email_target:
            return Response({
                'error': 'No registered mobile number or email found on this account to receive OTP.',
                'code': 'NO_CONTACT_METHOD'
            }, status=400)

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

    else:
        if not phone_target and not email_target:
            return Response({'error': 'A valid phone number or email is required.'}, status=400)

    # AUTH-001: Rate limiting by IP + identifier + action
    ip = _get_client_ip(request)
    recent_check = phone_target or email_target

    # Per-identifier hourly limit (max 5 OTP sends per hour per identifier)
    hourly_key = f"otp_hourly_{recent_check}"
    hourly_sent = cache.get(hourly_key, 0)
    if hourly_sent >= 5:
        return Response({'error': 'Too many OTP requests for this account. Please try again after 1 hour.'}, status=429)

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

    # Increment hourly counter
    cache.set(hourly_key, hourly_sent + 1, timeout=3600)

    # Generate 6-digit cryptographically secure OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"

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
@throttle_classes([ScopedRateThrottle])
def api_verify_otp(request):
    request.throttle_scope = 'otp'
    raw_identifier = request.data.get('identifier')
    action = request.data.get('action') or 'register'
    identifiers = []
    if raw_identifier:
        s = str(raw_identifier).strip()
        identifiers.append(s)
        digits = ''.join(ch for ch in s if ch.isdigit())
        if digits:
            identifiers.append(digits)
            identifiers.append(f"91{digits}")
            if digits.startswith('91') and len(digits) == 12:
                identifiers.append(digits[2:])
    otp_code = request.data.get('otp')

    if not identifiers or not otp_code:
        return Response({'error': 'Identifier and OTP are required.'}, status=400)

    records = OTPVerification.objects.filter(
        identifier__in=list(set(identifiers)),
        is_verified=False,
        created_at__gte=timezone.now() - timedelta(minutes=10)
    ).order_by('-created_at')

    if not records.exists():
        return Response({'error': 'Invalid or expired OTP.'}, status=400)

    matched_record = None
    for r in records:
        if r.attempts >= r.max_attempts:
            continue
        if _verify_otp_record(r, otp_code, action):
            matched_record = r
            r.is_verified = True
            r.save()
            break
        else:
            r.attempts += 1
            r.save()

    if not matched_record:
        return Response({'error': 'Invalid or expired OTP.'}, status=400)

    return Response({'message': 'OTP verified successfully.'})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def api_login_otp(request):
    request.throttle_scope = 'otp'
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
            'error': 'No account found with this username, email or mobile number.',
            'code': 'ACCOUNT_NOT_FOUND'
        }, status=404)
        
    valid_idents = [identifier, user.username]
    if clean_digits:
        valid_idents.append(clean_digits)
        valid_idents.append(f"91{clean_digits}")
        if clean_digits.startswith('91') and len(clean_digits) == 12:
            valid_idents.append(clean_digits[2:])
    if phone_candidate:
        valid_idents.append(phone_candidate)
        if phone_candidate.startswith('91') and len(phone_candidate) == 12:
            valid_idents.append(phone_candidate[2:])
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
        created_at__gte=timezone.now() - timedelta(minutes=10)
    ).order_by('-created_at')

    if not records.exists():
        return Response({'error': 'Invalid or expired OTP code. Please try again.'}, status=400)

    matched = False
    matched_record = None
    for r in records:
        if r.attempts >= r.max_attempts:
            continue
        if _verify_otp_record(r, str(otp).strip(), 'login'):
            matched = True
            matched_record = r
            r.is_verified = True
            r.save()
            break
        else:
            r.attempts += 1
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
    touch_token_activity(token)
    
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
    records = OTPVerification.objects.filter(
        identifier__in=[phone_target, p_alt],
        created_at__gte=timezone.now() - timedelta(minutes=10)
    ).order_by('-created_at')

    otp_record = None
    for r in records:
        if r.attempts >= r.max_attempts:
            continue
        if _verify_otp_record(r, str(otp_code).strip(), 'link_phone'):
            otp_record = r
            r.is_verified = True
            r.save(update_fields=['is_verified'])
            break
        else:
            r.attempts += 1
            r.save(update_fields=['attempts'])

    if not otp_record:
        # Fallback check if verified in this 10m window
        otp_record = OTPVerification.objects.filter(
            identifier__in=[phone_target, p_alt],
            is_verified=True,
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
        # Check if an existing profile had a linked WhatsApp LID or number for this phone
        existing_wa = UserProfile.objects.filter(
            phone_number__endswith=phone_target[-10:],
            whatsapp_linked=True
        ).exclude(whatsapp_number__isnull=True).exclude(whatsapp_number='').values_list('whatsapp_number', flat=True).first()

        if existing_wa:
            profile.whatsapp_number = existing_wa
            profile.whatsapp_linked = True
        elif not profile.whatsapp_number:
            profile.whatsapp_number = phone_target
            profile.whatsapp_linked = True
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
@throttle_classes([ScopedRateThrottle])
def api_reset_password(request):
    request.throttle_scope = 'auth'
    identifier = request.data.get('identifier')
    if identifier and len(str(identifier)) == 10 and str(identifier).isdigit():
        identifier = f"91{identifier}"
    otp_code = request.data.get('otp')
    new_password = request.data.get('new_password')
    
    if not identifier or not otp_code or not new_password:
        return Response({'error': 'Identifier, OTP, and New Password are required.'}, status=400)
    
    if len(new_password) < 6:
        return Response({'error': 'Password must be at least 6 characters.'}, status=400)
        
    valid_record = None
    records = OTPVerification.objects.filter(
        identifier=identifier,
        is_verified=True,
        action__in=['reset', 'general'],
        created_at__gte=timezone.now() - timedelta(minutes=10)
    ).order_by('-created_at')

    for r in records:
        expected_hash = _hash_otp(identifier, r.action, str(otp_code).strip())
        if hmac.compare_digest(str(r.otp_code), str(expected_hash)) or hmac.compare_digest(str(r.otp_code), str(otp_code).strip()):
            valid_record = r
            break

    if not valid_record:
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

    # Rotate auth token on password reset
    Token.objects.filter(user=user).delete()
    new_token = Token.objects.create(user=user)
    touch_token_activity(new_token)

    # Delete all OTP records for this identifier after successful reset
    OTPVerification.objects.filter(identifier=identifier).delete()
    
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
    """Real permanent account deletion (GDPR & CCPA compliant) - Ultra-fast atomic execution."""
    user = request.user
    password = request.data.get('password')
    
    # If a password was provided, verify it before executing deletion
    if password and user.has_usable_password():
        if not user.check_password(password):
            return Response({'error': 'Incorrect password. Account deletion aborted.'}, status=400)

    username = user.username
    uid = user.id

    from django.db import connection, transaction
    fast_delete_sql = """
    DELETE FROM authtoken_token WHERE user_id = %(uid)s;
    DELETE FROM tracker_expense WHERE user_id = %(uid)s;
    DELETE FROM tracker_savingsgoal WHERE user_id = %(uid)s;
    DELETE FROM tracker_subscription WHERE user_id = %(uid)s;
    DELETE FROM tracker_note WHERE user_id = %(uid)s;
    DELETE FROM tracker_splitsettlement WHERE group_id IN (SELECT id FROM tracker_splitgroup WHERE creator_id = %(uid)s);
    DELETE FROM tracker_splitexpense WHERE group_id IN (SELECT id FROM tracker_splitgroup WHERE creator_id = %(uid)s);
    DELETE FROM tracker_splitmember WHERE group_id IN (SELECT id FROM tracker_splitgroup WHERE creator_id = %(uid)s);
    DELETE FROM tracker_splitgroup WHERE creator_id = %(uid)s;
    DELETE FROM tracker_feedback WHERE user_id = %(uid)s;
    DELETE FROM tracker_userloginactivity WHERE user_id = %(uid)s;
    DELETE FROM tracker_dailynotificationlog WHERE user_id = %(uid)s;
    DELETE FROM tracker_appanalyticsevent WHERE user_id = %(uid)s;
    DELETE FROM tracker_apperrorlog WHERE user_id = %(uid)s;
    DELETE FROM tracker_usermerchantcategory WHERE user_id = %(uid)s;
    DELETE FROM tracker_whatsappsession WHERE user_id = %(uid)s;
    DELETE FROM tracker_userprofile WHERE user_id = %(uid)s;
    DELETE FROM django_admin_log WHERE user_id = %(uid)s;
    DELETE FROM auth_user_groups WHERE user_id = %(uid)s;
    DELETE FROM auth_user_user_permissions WHERE user_id = %(uid)s;
    DELETE FROM auth_user WHERE id = %(uid)s;
    """
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(fast_delete_sql, {'uid': uid})
    except Exception as e:
        logger.warning("Fast delete fallback to ORM delete: %s", e)
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
        
    records = OTPVerification.objects.filter(
        identifier=email,
        created_at__gte=timezone.now() - timedelta(minutes=10)
    ).order_by('-created_at')
    
    otp_record = None
    for r in records:
        if r.attempts >= r.max_attempts:
            continue
        if _verify_otp_record(r, str(otp_code).strip(), 'general'):
            otp_record = r
            r.is_verified = True
            r.save(update_fields=['is_verified'])
            break
        else:
            r.attempts += 1
            r.save(update_fields=['attempts'])
    
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
    # Body size limit (max 50KB)
    if hasattr(request, 'body') and len(request.body) > 50 * 1024:
        return Response({'error': 'Request body too large.'}, status=413)

    client_ip = _get_client_ip(request)
    cache_key = f"throttle_track_{client_ip}"
    current_count = cache.get(cache_key, 0)
    if current_count >= 150:
        return Response({'error': 'Rate limit exceeded for analytics.'}, status=429)
    cache.set(cache_key, current_count + 1, timeout=60)

    event_name = request.data.get('event_name')
    if not event_name:
        return Response({'error': 'event_name is required'}, status=400)
    
    user = request.user if request.user.is_authenticated else None
    raw_props = request.data.get('properties', {})
    
    # Restrict properties size to ~4KB
    properties = {}
    if isinstance(raw_props, dict):
        try:
            props_json = json.dumps(raw_props)[:4096]
            properties = json.loads(props_json)
        except Exception:
            properties = {}

    AppAnalyticsEvent.objects.create(
        user=user,
        event_name=str(event_name)[:100],
        properties=properties,
        ip_address=client_ip
    )
    return Response({'status': 'success'})


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_log_error(request):
    """Centralized client-side crash and exception reporter."""
    if hasattr(request, 'body') and len(request.body) > 50 * 1024:
        return Response({'error': 'Request body too large.'}, status=413)

    client_ip = _get_client_ip(request)
    cache_key = f"throttle_log_error_{client_ip}"
    current_count = cache.get(cache_key, 0)
    if current_count >= 120:
        return Response({'error': 'Too many error reports. Please slow down.'}, status=429)
    cache.set(cache_key, current_count + 1, timeout=60)

    raw_error = request.data.get('error_message') or 'Unknown client error'
    raw_stack = request.data.get('stack_trace', '')
    raw_device = request.data.get('device_info', {})
    user = request.user if request.user.is_authenticated else None

    # Truncate fields
    error_message = str(raw_error)[:2000]
    stack_trace = str(raw_stack)[:10000]

    device_info = {}
    if isinstance(raw_device, dict):
        try:
            device_json = json.dumps(raw_device)[:4096]
            device_info = json.loads(device_json)
        except Exception:
            device_info = {}

    AppErrorLog.objects.create(
        user=user,
        error_message=error_message,
        stack_trace=stack_trace,
        device_info=device_info
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
            data = json.loads(request.body) if request.body else {}
            text = (data.get("text") or data.get("feedback") or data.get("message") or "").strip()
            source = (data.get("source") or "app").strip()
            if text:
                user = request.user if (hasattr(request, 'user') and request.user and request.user.is_authenticated) else None
                if not user:
                    from django.contrib.auth.models import User
                    user = User.objects.filter(is_superuser=True).first() or User.objects.first()
                Feedback.objects.create(user=user, text=text, source=source)
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

from django.views.decorators.csrf import csrf_exempt, csrf_protect
import json

@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def api_send_admin_push(request):
    secret = request.data.get("secret")
    expected_secret = getattr(settings, 'ADMIN_PUSH_SECRET', None) or os.getenv("ADMIN_PUSH_SECRET", '')
    if not expected_secret or not secret or not hmac.compare_digest(str(secret), str(expected_secret)):
        return Response({"status": "error", "message": "Invalid secret"}, status=403)

    title = request.data.get("title")
    body = request.data.get("body")
    screen = request.data.get("screen", "Dashboard")

    if not title or not body:
        return Response({"status": "error", "message": "Title and body required"}, status=400)

    try:
        from tracker.fcm_utils import initialize_firebase, send_push_notification, get_android_config, get_apns_config
        from firebase_admin import messaging

        initialize_firebase()
        topic_message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data={"screen": screen},
            topic='all_users',
            android=get_android_config(title, body),
            apns=get_apns_config(title, body),
        )
        res = messaging.send(topic_message)
        return Response({"status": "success", "message": "Push sent to all_users topic", "res": res})
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)

GITHUB_APK_CDN_URL = "https://github.com/ajay160380/smart-expense-coach/releases/latest/download/ExpenseTracker.apk"
LATEST_EXPO_APK_URL = "https://expo.dev/artifacts/eas/XmpFE8ks54B2zzMtDDIS7wO-2ikUOkqq9VhfTqVd5Wg.apk"

def get_apk_response():
    from django.http import HttpResponseRedirect
    return HttpResponseRedirect(GITHUB_APK_CDN_URL)

def download_apk(request):
    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    if request.GET.get('direct') == '1' or 'curl' in user_agent or 'wget' in user_agent or request.headers.get('Accept') == 'application/json':
        return get_apk_response()
    return render(request, 'tracker/download.html', {
        'direct_apk_url': GITHUB_APK_CDN_URL,
        'mirror_apk_url': LATEST_EXPO_APK_URL,
    })

@csrf_exempt
def get_app_version(request):
    """
    Returns latest app version information so the mobile app can notify users
    when a new APK build is available and provide 1-tap download.
    """
    base = request.build_absolute_uri('/')[:-1] if request else 'https://expense-coach-prxm.onrender.com'
    direct_url = f"{base}/download-apk/"
    return JsonResponse({
        "status": "success",
        "latest_version": "1.4.1",
        "latest_version_code": 11,
        "apk_url": direct_url,
        "direct_expo_url": GITHUB_APK_CDN_URL,
        "release_notes": "Standard clean release: 100% Play Protect verified & instant 1-tap install on all Android devices!",
        "published_at": "2026-11-12",
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


