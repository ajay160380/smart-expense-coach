import csv, json, calendar, logging, re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.core.cache import cache
from django.db import transaction
from django.db.models import Avg, Count, Max, Min, Sum
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST
from groq import Groq

from django.conf import settings
from .models import Expense, Subscription
from .forms import ExpenseForm, SubscriptionForm

# ── CONSTANTS ─────────────────────────────────────────────────────────────────
logger = logging.getLogger(__name__)
DEFAULT_BUDGET    = 20_000.0
MAX_UPCOMING_SUBS = 4
CHART_DAYS        = 7
AI_CACHE_TIMEOUT  = 300

CAT_COLORS = {
    "food": "#6c5ce7", "transport": "#00cec9", "shopping": "#fd79a8",
    "health": "#00b894", "entertainment": "#fdcb6e", "education": "#74b9ff",
    "utilities": "#a29bfe", "other": "#dfe6e9",
}
CAT_ICONS = {
    "food": "🍜", "transport": "🚗", "shopping": "🛍️", "health": "💊",
    "entertainment": "🎬", "education": "📚", "utilities": "⚡", "other": "📦",
}
VALID_CATEGORIES = set(CAT_COLORS.keys())
VALID_FILTERS    = {"week", "month", "all"}


# ══════════════════════════════════════════════════════════════════════════════
# SERVICE LAYER
# ══════════════════════════════════════════════════════════════════════════════

def _next_month_date(d: date) -> date:
    m = d.month % 12 + 1
    y = d.year + (1 if d.month == 12 else 0)
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))

@transaction.atomic
def process_subscriptions(user) -> int:
    today = date.today()
    subs  = Subscription.objects.filter(user=user, next_billing_date__lte=today).select_for_update()
    debits, batch = 0, []
    for sub in subs:
        bd, itr = sub.next_billing_date, 0
        while bd <= today and itr < 24:
            batch.append(Expense(user=user, category=sub.category, amount=sub.amount, date=bd))
            bd = _next_month_date(bd); itr += 1; debits += 1
        sub.next_billing_date = bd
        sub.save(update_fields=["next_billing_date"])
    Expense.objects.bulk_create(batch, ignore_conflicts=True)
    return debits

def get_filtered_expenses(user, filter_type: str, search_query: str = ""):
    qs = Expense.objects.filter(user=user)
    if search_query:
        qs = qs.filter(category__icontains=search_query)
    today = date.today()
    if filter_type == "week":
        qs = qs.filter(date__gte=today - timedelta(days=7))
    elif filter_type == "month":
        qs = qs.filter(date__year=today.year, date__month=today.month)
    return qs.order_by("-date", "-id")

def calculate_stats(qs, budget: float) -> dict:
    agg = qs.aggregate(total=Sum("amount"), count=Count("id"),
                       highest=Max("amount"), lowest=Min("amount"), average=Avg("amount"))
    ts = float(agg["total"] or 0)
    return {
        "total_spent":       ts,
        "transaction_count": agg["count"] or 0,
        "highest_expense":   float(agg["highest"] or 0),
        "lowest_expense":    float(agg["lowest"]  or 0),
        "average_expense":   float(agg["average"] or 0),
        "budget_percent":    min(ts / budget * 100, 100) if budget else 0,
        "remaining_budget":  max(budget - ts, 0),
        "avg_per_day":       ts / max(date.today().day, 1),
        "savings_rate":      max(0, min(100, (budget - ts) / budget * 100)) if budget else 0,
    }

def build_category_breakdown(qs, total_spent: float) -> list:
    result = []
    for c in qs.values("category").annotate(total=Sum("amount")).order_by("-total"):
        n = (c["category"] or "other").lower()
        t = float(c["total"] or 0)
        result.append({"name": n, "title": n.title(), "total": t,
                        "percent": min(t / total_spent * 100 if total_spent else 0, 100),
                        "color": CAT_COLORS.get(n, "#888"), "icon": CAT_ICONS.get(n, "📦")})
    return result

def build_chart_data(user) -> list:
    today = date.today()
    start = today - timedelta(days=CHART_DAYS - 1)
    dm = {r["date"]: float(r["day_total"])
          for r in Expense.objects.filter(user=user, date__range=(start, today))
                          .values("date").annotate(day_total=Sum("amount"))}
    totals  = [dm.get(start + timedelta(days=i), 0) for i in range(CHART_DAYS)]
    max_val = max(totals) if max(totals) > 0 else 1
    return [{"day": (start + timedelta(days=i)).strftime("%a"),
             "date": (start + timedelta(days=i)).isoformat(),
             "total": totals[i],
             "height": max(totals[i] / max_val * 140, 8 if totals[i] else 2),
             "is_today": (start + timedelta(days=i)) == today}
            for i in range(CHART_DAYS)]

def _groq() -> Groq:
    return Groq(api_key=settings.GROQ_API_KEY)

def get_ai_insight(user_id, expenses, budget, total_spent) -> str:
    ck = f"ai_insight_{user_id}_{int(budget)}_{int(total_spent)}"
    if hit := cache.get(ck): return hit
    try:
        summary   = "; ".join(f"{e.category}: ₹{e.amount}" for e in expenses[:5]) or "No data"
        remaining = max(0, budget - total_spent)
        days_left = ((date.today().replace(day=1) + timedelta(days=32)).replace(day=1) - date.today()).days
        prompt = (f"You are a brutally honest funny Indian financial coach.\n"
                  f"Budget ₹{budget:,.0f} | Spent ₹{total_spent:,.0f} | Left ₹{remaining:,.0f} | Days left {days_left}\n"
                  f"Expenses: {summary}\n"
                  f"ONE punchy Hinglish sentence (Roman script), sarcastic, Indian references, under 30 words, ends with micro-tip. ONLY the sentence.")
        
        r = _groq().chat.completions.create(messages=[{"role":"user","content":prompt}],
                                            model="llama-3.3-70b-versatile", temperature=0.8, max_tokens=80)
        insight = r.choices[0].message.content.strip()
        cache.set(ck, insight, AI_CACHE_TIMEOUT)
        return insight
    except Exception as e:
        logger.error("Groq insight uid=%s: %s", user_id, e)
        return f"Bhai ₹{max(0,budget-total_spent):,.0f} bacha hai — Zomato band karo! 🍛"


# ══════════════════════════════════════════════════════════════════════════════
# ① CATEGORY INSIGHT API
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def api_category_insight(request: HttpRequest) -> JsonResponse:
    category = request.GET.get("category", "").strip().lower()
    period   = request.GET.get("period", "month")

    if category not in VALID_CATEGORIES:
        return JsonResponse({"error": "Invalid category"}, status=400)

    base_qs = get_filtered_expenses(request.user, period)
    cat_qs  = base_qs.filter(category=category)
    agg     = cat_qs.aggregate(total=Sum("amount"), count=Count("id"),
                                highest=Max("amount"), avg=Avg("amount"))

    cat_total = float(agg["total"] or 0)
    all_total = float(base_qs.aggregate(t=Sum("amount"))["t"] or 0)
    share_pct = round(cat_total / all_total * 100 if all_total else 0, 1)

    recent = [{"date": r["date"].isoformat(), "amount": float(r["amount"])}
              for r in cat_qs.values("date", "amount").order_by("-date")[:3]]

    ck  = f"cat_tip_{request.user.id}_{category}_{period}_{int(cat_total)}"
    tip = cache.get(ck)
    if not tip:
        try:
            prompt = (f"You are a witty Indian financial coach.\n"
                      f"User spent ₹{cat_total:,.0f} on {category} ({share_pct}% of budget). "
                      f"Avg per txn: ₹{float(agg['avg'] or 0):,.0f}.\n"
                      f"ONE Hinglish sentence: roast this {category} spending with Indian reference "
                      f"+ one saving hack. Under 35 words. ONLY the sentence.")
            r   = _groq().chat.completions.create(messages=[{"role":"user","content":prompt}],
                                                   model="llama-3.3-70b-versatile", temperature=0.85, max_tokens=90)
            tip = r.choices[0].message.content.strip()
            cache.set(ck, tip, AI_CACHE_TIMEOUT)
        except Exception as e:
            logger.error("Cat tip: %s", e)
            tip = f"{category.title()} pe itna? Thoda control karo yaar! 💸"

    return JsonResponse({
        "category":  category,
        "icon":      CAT_ICONS.get(category, "📦"),
        "color":     CAT_COLORS.get(category, "#888"),
        "total":     cat_total,
        "share_pct": share_pct,
        "count":     agg["count"] or 0,
        "avg":       round(float(agg["avg"] or 0), 2),
        "highest":   float(agg["highest"] or 0),
        "recent":    recent,
        "ai_tip":    tip,
    })


# ══════════════════════════════════════════════════════════════════════════════
# ② DEDICATED AI ASSIST API (/ai_chat/)
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def ai_chat(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Only POST requests allowed"}, status=405)

    try:
        body     = json.loads(request.body)
        user_msg = body.get("message", "").strip()
    except (json.JSONDecodeError, KeyError):
        return JsonResponse({"error": "Invalid body format"}, status=400)

    if not user_msg:
        return JsonResponse({"error": "Message khali hai"}, status=400)

    budget   = float(request.session.get("budget", DEFAULT_BUDGET))
    month_qs = get_filtered_expenses(request.user, "month")
    stats    = calculate_stats(month_qs, budget)
    cats     = build_category_breakdown(month_qs, stats["total_spent"])
    cat_lines = "\n".join(f"  - {c['title']}: ₹{c['total']:,.0f} ({c['percent']:.0f}%)" for c in cats[:6])

    system = f"""You are "PaisaMitra" — a friendly, witty Indian personal finance coach.
Speak in Hinglish (Roman script). Be warm, sometimes sarcastic, always practical.

USER'S {date.today().strftime('%B %Y')} SNAPSHOT:
- Budget:        ₹{budget:,.0f}
- Spent:         ₹{stats['total_spent']:,.0f}
- Remaining:     ₹{stats['remaining_budget']:,.0f}
- Budget Used:   {stats['budget_percent']:.0f}%
- Transactions:  {stats['transaction_count']}
- Daily Avg:     ₹{stats['avg_per_day']:,.0f}

TOP CATEGORIES:
{cat_lines or "  (No data yet)"}

RULES:
- Answer in Hinglish naturally.
- Keep responses concise (max 80 words).
- If unrelated to finance, gently redirect back."""

    try:
        resp = _groq().chat.completions.create(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg}
            ],
            model="llama-3.3-70b-versatile", temperature=0.7, max_tokens=150,
        )
        return JsonResponse({"reply": resp.choices[0].message.content.strip()})
    except Exception as e:
        logger.error("AI Assist uid=%s: %s", request.user.id, e)
        return JsonResponse({"reply": "Oops! Network issue aa gaya. Thodi der baad try karo yaar 😅"})


# ══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════════════

def register(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save(); login(request, user)
            messages.success(request, "Account ban gaya! 🎉")
            return redirect("dashboard")
        messages.error(request, "Kuch gadbad hai.")
    else:
        form = UserCreationForm()
    return render(request, "tracker/register.html", {"form": form})


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def dashboard(request):
    if request.method == "POST" and "new_budget" in request.POST:
        try:
            nb = float(request.POST["new_budget"])
            if nb <= 0: raise ValueError
            request.session["budget"] = nb
            messages.success(request, f"Budget set: ₹{nb:,.0f} 💰")
        except (ValueError, TypeError):
            messages.error(request, "Valid budget daalo.")
        return redirect("dashboard")

    user   = request.user
    budget = float(request.session.get("budget", DEFAULT_BUDGET))
    today  = date.today()

    debits = process_subscriptions(user)
    if debits: messages.info(request, f"{debits} subscription(s) auto-deduct ho gaye. 📅")

    upcoming_subs = (Subscription.objects.filter(user=user, next_billing_date__gte=today)
                                         .order_by("next_billing_date")[:MAX_UPCOMING_SUBS])

    search_query = request.GET.get("q", "").strip()
    filter_type  = request.GET.get("filter", "month")
    if filter_type not in VALID_FILTERS: filter_type = "month"

    expenses_qs       = get_filtered_expenses(user, filter_type, search_query)
    stats             = calculate_stats(expenses_qs, budget)
    category_data_list = build_category_breakdown(expenses_qs, stats["total_spent"])
    chart_data        = build_chart_data(user)

    if stats["transaction_count"] == 0:
        insight = "<strong>Shuru karo!</strong> Pehla expense add karo, AI coaching milegi. 🚀"
    else:
        insight = f"<strong>AI Coach:</strong> {get_ai_insight(user.id, expenses_qs, budget, stats['total_spent'])}"

    context = {
        "budget": budget, "insight": insight,
        "category_data_list": category_data_list, "chart_data": chart_data,
        "expenses": expenses_qs, "current_filter": filter_type,
        "search_query": search_query, "form": ExpenseForm(),
        "sub_form": SubscriptionForm(), "upcoming_subs": upcoming_subs,
        "today_month_year": today.strftime("%B %Y"),
        "valid_categories": list(VALID_CATEGORIES),
        **stats,
    }
    return render(request, "tracker/dashboard.html", context)


# ══════════════════════════════════════════════════════════════════════════════
# EXPENSE ACTIONS
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@require_POST
def add_expense(request):
    try:
        amount = Decimal(request.POST.get("amount","").strip())
        if amount <= 0: raise InvalidOperation
    except (InvalidOperation, ValueError):
        messages.error(request, "Valid amount daalo.")
        return redirect("dashboard")
    category = request.POST.get("category","other").strip().lower()
    if category not in VALID_CATEGORIES: category = "other"
    try:    exp_date = date.fromisoformat(request.POST.get("date",""))
    except: exp_date = date.today()
    Expense.objects.create(user=request.user, amount=amount, category=category, date=exp_date)
    messages.success(request, f"₹{amount:,} added! ✅")
    return redirect("dashboard")


# 🚀 FAST VOICE-TO-EXPENSE LOGIC (FIXED MODEL & FIXED DB ERROR)
@login_required(login_url="login")
def voice_expense(request: HttpRequest) -> JsonResponse:
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            spoken_text = data.get("text", "")
            print(f"🎤 User ne bola: {spoken_text}") 

            prompt = f"""
            You are a strict data parser. The user said: "{spoken_text}"
            Return ONLY a valid JSON object. NO extra words.
            Categories allowed: food, transport, shopping, health, entertainment, education, utilities, other.
            Format required: {{"amount": <number>, "category": "<string>"}}
            Example: {{"amount": 300, "category": "food"}}
            """

            client = _groq()
            chat_completion = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model="llama-3.1-8b-instant", # <--- NAYA FAST MODEL
                temperature=0.0,
            )

            response_text = chat_completion.choices[0].message.content.strip()
            print(f"🤖 Groq ka reply: {response_text}")
            
            match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if not match:
                raise ValueError(f"Groq ne valid JSON nahi diya: {response_text}")
                
            ai_data = json.loads(match.group(0))

            # Database me save karna (Bina 'title' k jisse pehle error aaya tha)
            Expense.objects.create(
                user=request.user,
                amount=Decimal(str(ai_data.get("amount", 0))),
                category=ai_data.get("category", "other").lower(),
                date=date.today()
            )

            return JsonResponse({"status": "success", "message": "Expense saved!"})

        except Exception as e:
            print(f"❌ ERROR in Voice API: {e}")
            return JsonResponse({"status": "error", "message": str(e)})
            
    return JsonResponse({"status": "error", "message": "Invalid request"})


@login_required(login_url="login")
def edit_expense(request, pk):
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    if request.method == "POST":
        form = ExpenseForm(request.POST, instance=expense)
        if form.is_valid(): form.save(); messages.success(request, "Updated! ✏️")
        else: messages.error(request, "Invalid data.")
    return redirect("dashboard")


@login_required(login_url="login")
@require_POST
def delete_expense(request, pk):
    get_object_or_404(Expense, pk=pk, user=request.user).delete()
    messages.success(request, "Deleted. 🗑️")
    return redirect("dashboard")


# ══════════════════════════════════════════════════════════════════════════════
# EXPORT
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
def export_expenses(request):
    resp = HttpResponse(content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="expenses_{date.today()}.csv"'
    resp.write("\ufeff")
    w = csv.writer(resp)
    w.writerow(["Date", "Category", "Amount (₹)"])
    w.writerows(Expense.objects.filter(user=request.user).order_by("-date").values_list("date","category","amount"))
    return resp


# ══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTIONS
# ══════════════════════════════════════════════════════════════════════════════

@login_required(login_url="login")
@require_POST
def add_subscription(request):
    form = SubscriptionForm(request.POST)
    if form.is_valid():
        sub = form.save(commit=False); sub.user = request.user; sub.save()
        messages.success(request, "Subscription add ho gayi! 📅")
    else:
        messages.error(request, "Details check karo.")
    return redirect("dashboard")


@login_required(login_url="login")
@require_POST
def delete_subscription(request, pk):
    get_object_or_404(Subscription, pk=pk, user=request.user).delete()
    messages.success(request, "Subscription cancel! ✂️")
    return redirect("dashboard")