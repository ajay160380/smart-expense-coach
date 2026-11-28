"""
PHASE 9.4 & 9.5: NOTIFICATION ENGINE
Generates smart morning greetings, nightly summaries, and repeat-merchant nudges
with dual tone support ('normal' and 'roast'), rotation to avoid repeats,
and strict idempotency logging.
"""

from datetime import date, timedelta
from django.utils import timezone
from .models import UserProfile, Expense, DailyNotificationLog
from .views import calculate_daily_budget

# ══════════════════════════════════════════════════════════════════════════════
# TEMPLATES REPOSITORY (At least 10 per situation and tone)
# ══════════════════════════════════════════════════════════════════════════════

TEMPLATES = {
    "morning": {
        "normal": [
            "Good morning {name}! Aaj ka budget ₹{budget:,.0f} hai. Ek smart din ki shuruat karein! ☀️",
            "Suprabhat {name}! Aaj aapka daily spending target ₹{budget:,.0f} hai. Mindful spend karein! 🎯",
            "Good morning {name}! Aaj ka bacha budget ₹{budget:,.0f} se shuru ho raha hai. Have a great day! ✨",
            "Utho, bachat karo! Aaj ka daily limit ₹{budget:,.0f} hai {name}. Have a productive day! 🚀",
            "Namaste {name}! Aaj ka kharch karne ka lakshya ₹{budget:,.0f} hai. Stay on track! 💼",
            "Good morning {name}! Aaj aapke paas ₹{budget:,.0f} ka fresh daily quota hai. Spend wisely! 💰",
            "Shubh prabhat {name}! Aaj ka budget ₹{budget:,.0f} tay kiya gaya hai. All the best! 🌟",
            "Hello {name}! Naya din, naya budget: ₹{budget:,.0f} for today. Let's make it count! 👍",
            "Good morning {name}! Daily goal ₹{budget:,.0f} hai. Balance banaye rakhein! 📊",
            "A warm morning {name}! Aaj ka safe spending budget ₹{budget:,.0f} hai. Have a peaceful day! 🌿",
        ],
        "roast": [
            "Good morning {name}! Aaj ka budget ₹{budget:,.0f} hai. Kripya coffee aur shopping pe daaka na daalein! ☕",
            "Uth jao {name}! Aaj sirf ₹{budget:,.0f} udane ki permission hai, Ambani banne ki koshish na karein! 😂",
            "Good morning {name}! Aaj ka quota ₹{budget:,.0f} hai. Zomato app ko aaj thoda sote rehne do! 🍕",
            "Subah ho gayi {name}! ₹{budget:,.0f} pocket me hain, Blinkit ko shopping mall mat samajhna! 🛒",
            "Good morning {name}! Aaj ka limit ₹{budget:,.0f} hai. Dekhte hain shaam tak kitna bacha paate ho! 😜",
            "Suprabhat {name}! Aaj sirf ₹{budget:,.0f} kharch karne hain, PIN number ko thoda aaram do! 🔢",
            "Good morning {name}! Aaj ka budget ₹{budget:,.0f} hai. UPI scan karne se pehle 3 baar lambi saans lena! 🧘",
            "Wake up {name}! Aaj ₹{budget:,.0f} ka allowance hai. Wallet ko ICU me bhejne ka plan toh nahi hai na? 🏥",
            "Good morning {name}! Aaj ka target ₹{budget:,.0f} hai. Credit card ko locker me band kar do! 🔐",
            "Arey utho {name}! Aaj ₹{budget:,.0f} ka quota hai. Dekhein aaj discipline jeetta hai ya sale offers! 🏷️",
        ]
    },
    "night": {
        "under": {
            "normal": [
                "Badhai ho {name}! Aaj ka budget ₹{budget:,.0f} tha aur aapne sirf ₹{spent:,.0f} kharch kiye. ₹{diff:,.0f} bach gaye! 🎉",
                "Shandar bachat {name}! Aaj aapne ₹{diff:,.0f} bacha liye. Aise hi aage badhte rahein! 💰",
                "Mindful spending ka kamaal! Aaj ka bacha paisa ₹{diff:,.0f} hai. Well done {name}! ✨",
                "Aapka budget control me hai {name}. Aaj sirf ₹{spent:,.0f} kharch huye, ₹{diff:,.0f} safe hain! 👍",
                "Superb discipline {name}! Daily target ₹{budget:,.0f} tha aur aapne ₹{diff:,.0f} bacha liye! 🚀",
                "Bachat ki aadat rang la rahi hai {name}. Aaj ₹{diff:,.0f} pocket me bache hain! 🌟",
                "Aaj ka spending score 10/10 {name}! ₹{diff:,.0f} ki solid saving hui hai! 🎯",
                "Shaant aur suljhi hui spending! Aaj aapne ₹{budget:,.0f} me se ₹{diff:,.0f} bacha liye {name}! 🟢",
                "Aapki smart financial journey on track hai! Aaj ₹{diff:,.0f} bache huye hain {name}! 👏",
                "Great job {name}! Aaj ka din bachat ke naam raha, ₹{diff:,.0f} bach gaye! 🏆",
            ],
            "roast": [
                "Arrey waah {name}! Aaj Swiggy-Zomato ka app uninstall kar diya tha kya? ₹{diff:,.0f} bach gaye! 😂",
                "Miracle ho gaya {name}! Aaj paise kharch karna bhool gaye ya pocket me haath nahi gaya? ₹{diff:,.0f} bache hain! 😜",
                "Bade log, badi bachat! Aaj market me koi sale nahi chal rahi thi kya {name}? ₹{diff:,.0f} bacha liye! 🛍️",
                "Kanjoozi ya smartness? Jo bhi ho, ₹{diff:,.0f} bacha liye {name}, party kab de rahe ho? 🥳",
                "Aaj bank wale bhi hairan honge ki {name} ka debit alert kyun nahi aaya! ₹{diff:,.0f} safe hain! 🏦",
                "Lagta hai aaj ghar ka khana pasand aa gaya {name}! ₹{diff:,.0f} bach gaye, mummy khush hongi! 🍲",
                "Control Uday control! Aaj sach me control kar liya {name}, ₹{diff:,.0f} bacha ke kamaal kar diya! 🎬",
                "Itna disciplined kab se ho gaye {name}? Nazar na lag jaye, ₹{diff:,.0f} bacha liye! 🧿",
                "Zomato delivery boy aaj aapka rasta dekh raha tha {name}! ₹{diff:,.0f} bacha ke record tod diya! 🛵",
                "Warren Buffett aapke tips lene na aa jayein {name}, aaj ₹{diff:,.0f} bacha ke ameer feel ho raha hoga! 💼",
            ]
        },
        "warning": {
            "normal": [
                "Dhyan dein {name}, aaj aapne budget ka {pct:.0f}% kharch kar liya hai. Bach gaye sirf ₹{diff:,.0f}.",
                "Aaj limit ke kareeb hain {name}. Bacha hua paisa: ₹{diff:,.0f}. Spend mindfully!",
                "Caution {name}: Aaj ka kharch ₹{spent:,.0f} ho gaya hai. Remaining ₹{diff:,.0f} sambhal ke kharch karein.",
                "Yellow flag {name}! Daily allowance ka 80%+ use ho chuka hai, sirf ₹{diff:,.0f} bache hain.",
                "Thoda break lijiye {name}. Aaj ka quota lagbhag pura hone ko hai (₹{diff:,.0f} remaining).",
                "Budget alert {name}: Aaj ₹{spent:,.0f} kharch ho chuke hain, ₹{diff:,.0f} safe hain.",
                "Aaj ka target kareeb hai {name}. Kal fresh budget shuru hoga.",
                "Paisa balance me rakhein {name}. Aaj sirf ₹{diff:,.0f} daily budget me bache hain.",
                "Smart move yahi hoga ki abhi extra kharche rokein {name}. ₹{diff:,.0f} left today.",
                "Aap threshold ke kareeb hain {name}. Aaj ₹{diff:,.0f} bache hain.",
            ],
            "roast": [
                "Break lagao gaadi ko {name}! ₹{diff:,.0f} bache hain, coffee peene se pehle 10 baar sochna! ☕",
                "Bhai bas karo, ab agar ek chewing gum bhi li toh budget red zone me chala jayega! ₹{diff:,.0f} left! 🛑",
                "Card ko thoda aaram do {name}! UPI scanner garma gaya hai, sirf ₹{diff:,.0f} bache hain! 💳",
                "Phone side me rakh do {name}, Blinkit open kiya toh aaj ka budget chappal tod dega! ₹{diff:,.0f} left! 📱",
                "Itni tez shopping toh race me bhi nahi hoti {name}! ₹{diff:,.0f} bacha ke limit pe khade ho! 🏎️",
                "Kharch karne ka olympics hota toh gold aapka tha {name}! Bach gaye sirf ₹{diff:,.0f}! 🥇",
                "Wallet se dhuan nikal raha hai {name}! Sirf ₹{diff:,.0f} bache hain, breathing room do! 💨",
                "Aapke UPI PIN ko bhi yaad ho gaya hoga aaj ka din! ₹{diff:,.0f} bache hain, sambhalo! 🔢",
                "Swiggy ko bolo aaj ka quota khatam! Sirf ₹{diff:,.0f} bache hain {name}! 🍕",
                "Budget bol raha hai: 'Mujhe chhod do mere haal par!' ₹{diff:,.0f} bache hain {name}! 😅",
            ]
        },
        "over": {
            "normal": [
                "Savdhaan {name}: Aaj ka budget ₹{budget:,.0f} tha aur kharch ₹{spent:,.0f} hua (₹{diff:,.0f} zyada).",
                "Budget cross ho gaya hai {name}. Aaj ₹{diff:,.0f} extra kharch hue. Kal ise balance kar sakte hain.",
                "Daily limit exceed hui {name}. ₹{diff:,.0f} over budget. Kal thoda dhyan rakhein.",
                "Aaj kharch thoda zyada raha {name}: Total ₹{spent:,.0f} (₹{diff:,.0f} over daily limit).",
                "Red zone alert {name}: Aaj ka spend budget se ₹{diff:,.0f} aage nikal gaya.",
                "Limit update {name}: Aaj ₹{diff:,.0f} budget se bahar gaye. Don't worry, kal fresh start hai.",
                "Aaj ka kharcha uncha raha {name}. ₹{diff:,.0f} extra spend hua hai.",
                "Budget reminder {name}: Aaj target se ₹{diff:,.0f} zyada nikal gaye. Stay mindful tomorrow.",
                "Notice {name}: Aaj ka total ₹{spent:,.0f} hai, jo daily target se ₹{diff:,.0f} adhik hai.",
                "Financial health alert {name}: Aaj ₹{diff:,.0f} over-limit raha. Kal bachat ka plan banayein.",
            ],
            "roast": [
                "Ameer log, pranaam! Aaj budget se ₹{diff:,.0f} zyada uda diye! Ambani ji se meeting thi kya? 🤑",
                "Budget ne chat se jump maar diya hai {name}! ₹{diff:,.0f} limit se paar nikal gaye! 🧗",
                "Kaha tha mat chalao UPI, ab dekho ₹{diff:,.0f} extra udd gaye hawa me! 💸",
                "Aaj kharche dekh ke calculator bhi behosh ho gaya {name}! ₹{diff:,.0f} over budget! 📉",
                "Khareedne ka shauk ya shopping ki bimari {name}? Aaj ₹{diff:,.0f} limit se bahar phenk diye! 🛍️",
                "UPI soundbox bol raha hoga: 'Bhai bas kar, thak gaya hoon!' ₹{diff:,.0f} extra uda diye! 🔊",
                "Aaj lagta hai wallet me chhed tha {name}, ₹{diff:,.0f} zyada beh gaye! 🕳️",
                "Kismat kharab nahi thi, haath khula tha {name}! ₹{diff:,.0f} budget ke paar pahunch gaye! 🤷",
                "Agle mahine kya hawa kha ke rahoge {name}? Aaj ₹{diff:,.0f} limit se aage daud gaye! 🍃",
                "Budget ko bye-bye bol diya aaj {name}? ₹{diff:,.0f} extra kharch karke record bana diya! 🚀",
            ]
        }
    }
}


def pick_rotated_template(template_list, user_id: int, target_date: date) -> str:
    """Rotates template selection based on user ID and day of year so messages don't repeat."""
    idx = (user_id + target_date.toordinal()) % len(template_list)
    return template_list[idx]


def build_morning_message(user, target_date=None) -> str:
    if target_date is None:
        target_date = timezone.localdate()

    profile = getattr(user, 'profile', None)
    tone = getattr(profile, 'notification_tone', 'normal') or 'normal'
    if tone not in ('normal', 'roast'):
        tone = 'normal'

    daily_data = calculate_daily_budget(user, target_date=target_date)
    budget = daily_data['daily_budget']
    user_name = user.first_name.title() if user.first_name else (user.username.title() or "Dost")

    templates = TEMPLATES["morning"][tone]
    template = pick_rotated_template(templates, user.id, target_date)
    msg = template.format(name=user_name, budget=budget)

    # If rollover is enabled, mention carried amount
    if daily_data.get('rollover_enabled') and daily_data.get('carryover_amount') != 0:
        c_amt = daily_data['carryover_amount']
        if c_amt > 0:
            msg += f" (Pichle dinon se +₹{c_amt:,.0f} carry forward)."
        else:
            msg += f" (Pichle dinon se -₹{abs(c_amt):,.0f} adjusted)."

    return msg


def build_night_message(user, target_date=None) -> tuple[str, str]:
    if target_date is None:
        target_date = timezone.localdate()

    profile = getattr(user, 'profile', None)
    tone = getattr(profile, 'notification_tone', 'normal') or 'normal'
    if tone not in ('normal', 'roast'):
        tone = 'normal'

    daily_data = calculate_daily_budget(user, target_date=target_date)
    budget = daily_data['daily_budget']
    spent = daily_data['spent_today']
    remaining = daily_data['today_remaining']
    status = daily_data['status'] # 'ok', 'warning', 'over'
    user_name = user.first_name.title() if user.first_name else (user.username.title() or "Dost")

    # Find top category today
    today_txs = Expense.objects.filter(user=user, date=target_date)
    top_cat = None
    if today_txs.exists():
        from django.db.models import Sum
        top = today_txs.values('category').annotate(cat_total=Sum('amount')).order_by('-cat_total').first()
        if top:
            top_cat = f"{top['category'].title()} (₹{float(top['cat_total']):,.0f})"

    situation = "under" if status == "ok" else ("warning" if status == "warning" else "over")
    templates = TEMPLATES["night"][situation][tone]
    template = pick_rotated_template(templates, user.id, target_date)

    diff = abs(remaining)
    pct = daily_data['percent_used']
    msg = template.format(name=user_name, budget=budget, spent=spent, diff=diff, pct=pct)

    if top_cat:
        msg += f" • Aaj ka top kharcha: {top_cat}."

    return msg, status


def send_morning_budget_push_to_user(user, target_date=None) -> bool:
    """Sends morning budget push if enabled and not already sent today."""
    if target_date is None:
        target_date = timezone.localdate()

    profile = getattr(user, 'profile', None)
    if not profile or not profile.morning_budget_push or not profile.fcm_token:
        return False

    # Idempotency check
    if DailyNotificationLog.objects.filter(user=user, notification_type='morning', target_date=target_date).exists():
        return False

    msg = build_morning_message(user, target_date)
    from .fcm_utils import send_push_notification
    try:
        send_push_notification(profile.fcm_token, "Good Morning! Aaj Ka Budget ☀️", msg, data={"type": "daily_budget"})
    except Exception as e:
        print(f"Warning sending morning push: {e}")

    DailyNotificationLog.objects.create(
        user=user,
        notification_type='morning',
        target_date=target_date,
        details={"message": msg}
    )
    return True


def send_night_summary_push_to_user(user, target_date=None) -> bool:
    """Sends night summary push if enabled and not already sent today."""
    if target_date is None:
        target_date = timezone.localdate()

    profile = getattr(user, 'profile', None)
    if not profile or not profile.nightly_summary or not profile.fcm_token:
        return False

    # Idempotency check
    if DailyNotificationLog.objects.filter(user=user, notification_type='night', target_date=target_date).exists():
        return False

    msg, status = build_night_message(user, target_date)
    title = "Aaj Ka Kharch Summary 🌙" if status != "over" else "Aaj Ka Budget Alert 🚨"
    from .fcm_utils import send_push_notification
    try:
        send_push_notification(profile.fcm_token, title, msg, data={"type": "nightly_summary"})
    except Exception as e:
        print(f"Warning sending night push: {e}")

    DailyNotificationLog.objects.create(
        user=user,
        notification_type='night',
        target_date=target_date,
        details={"message": msg, "status": status}
    )
    return True


def check_and_send_repeat_merchant_nudge(user, merchant: str, target_date=None) -> bool:
    """
    Repeat-merchant nudge (default OFF):
    If the same merchant or category appears 2+ times in one day, send one friendly nudge.
    Max one per merchant per day.
    """
    if target_date is None:
        target_date = timezone.localdate()

    profile = getattr(user, 'profile', None)
    if not profile or not profile.repeat_nudges or not profile.fcm_token:
        return False

    cleaned_merchant = merchant.strip().lower()
    log_key = f"repeat_{cleaned_merchant}"
    if DailyNotificationLog.objects.filter(user=user, notification_type=log_key, target_date=target_date).exists():
        return False

    same_merchant_txs = Expense.objects.filter(
        user=user,
        date=target_date,
        description__icontains=merchant
    )
    count = same_merchant_txs.count()
    if count >= 2:
        from django.db.models import Sum
        total_amt = float(same_merchant_txs.aggregate(t=Sum('amount'))['t'] or 0)
        nudge_msg = f"Dhyan dein: Aaj {merchant} se {count} baar kharch hua hai (Total: ₹{total_amt:,.0f})."

        from .fcm_utils import send_push_notification
        try:
            send_push_notification(profile.fcm_token, f"{merchant} Repeat Spend Alert ⚠️", nudge_msg, data={"type": "repeat_nudge"})
        except Exception:
            pass

        DailyNotificationLog.objects.create(
            user=user,
            notification_type=log_key,
            target_date=target_date,
            details={"merchant": merchant, "count": count, "total": total_amt}
        )
        return True

    return False


def send_live_budget_alert(user, expense, current_time=None) -> tuple[bool, str]:
    """
    PHASE 9.4: Live Budget Feedback
    When an expense is saved (auto or manual), optionally send a live alert:
    'Coffee -₹250. Aaj ka bacha: ₹3,083.'
    - Setting: live_budget_alerts (default OFF)
    - Quiet hours: 11 PM to 7 AM (23:00 to 07:00)
    - Max 10 per day
    """
    profile = getattr(user, 'profile', None)
    if not profile or not profile.live_budget_alerts or not profile.fcm_token:
        return False, "Feature disabled or no FCM token"

    if current_time is None:
        current_time = timezone.localtime()

    # Quiet hours check: 23:00 to 07:00
    hour = current_time.hour
    if hour >= 23 or hour < 7:
        return False, "Quiet hours active (11 PM - 7 AM)"

    today = current_time.date()

    # Max 10 per day check
    alerts_today = DailyNotificationLog.objects.filter(
        user=user,
        notification_type='live_alert',
        target_date=today
    ).count()
    if alerts_today >= 10:
        return False, "Daily limit reached (max 10/day)"

    from .views import calculate_daily_budget
    daily_info = calculate_daily_budget(user, today)
    desc = (expense.description or expense.category or "Kharcha").strip()
    amt = float(expense.amount)
    rem = daily_info['today_remaining']

    alert_msg = f"{desc} -₹{amt:,.0f}. Aaj ka bacha: ₹{rem:,.0f}."

    from .fcm_utils import send_push_notification
    try:
        send_push_notification(profile.fcm_token, "Rozana Budget Update 🎯", alert_msg, data={"type": "live_budget_alert"})
    except Exception:
        pass

    DailyNotificationLog.objects.create(
        user=user,
        notification_type='live_alert',
        target_date=today,
        details={"expense_id": expense.id, "amount": amt, "remaining": rem, "message": alert_msg}
    )
    return True, alert_msg


def _get_user_local_dt(profile):
    """Returns current timezone-aware datetime in user's preferred timezone."""
    import zoneinfo
    tz_str = (getattr(profile, 'timezone_name', 'Asia/Kolkata') or 'Asia/Kolkata').strip()
    try:
        user_tz = zoneinfo.ZoneInfo(tz_str)
    except Exception:
        tz_str = 'Asia/Kolkata'
        user_tz = zoneinfo.ZoneInfo(tz_str)
    return timezone.now().astimezone(user_tz), tz_str


def _parse_hhmm(time_str: str, fallback_hour: int, fallback_min: int = 0) -> int:
    try:
        h, m = map(int, str(time_str).strip().split(':'))
        if 0 <= h <= 23 and 0 <= m <= 59:
            return h * 60 + m
    except Exception:
        pass
    return fallback_hour * 60 + fallback_min


def build_live_alert_message(desc: str, amt: float, rem: float, tone: str = 'normal') -> str:
    """Formats live spend feedback honoring Normal vs Roast tone."""
    clean_desc = (desc or "Expense").strip()
    if tone == 'roast':
        if rem < 0:
            return f"{clean_desc} pe -₹{amt:,.0f} aur uda diye! Aaj ka limit ₹{abs(rem):,.0f} cross ho chuka hai 🔥"
        if rem < 200:
            return f"{clean_desc} -₹{amt:,.0f}! Aaj sirf ₹{rem:,.0f} bache hain — UPI ko thoda break do 😅"
        return f"{clean_desc} -₹{amt:,.0f} logged! Aaj ka bacha: ₹{rem:,.0f} — sambhal ke kharch karna 🔥"
    return f"{clean_desc} -₹{amt:,.0f}. Aaj ka bacha: ₹{rem:,.0f}."


def build_repeat_nudge_message(label: str, count: int, total_amt: float, tone: str = 'normal') -> str:
    """Formats repeat spend nudge honoring Normal vs Roast tone."""
    if tone == 'roast':
        return f"Arrey bhai! Aaj '{label}' pe {count} baar kharch ho gaya (Total ₹{total_amt:,.0f}) — thoda control! 🔥"
    return f"Dhyan dein: Aaj '{label}' se {count} baar kharch hua hai (Total: ₹{total_amt:,.0f})."


def evaluate_expense_alerts(user, expense) -> list[dict]:
    """
    Real-time evaluator invoked whenever an expense is saved (Web, Voice, or API).
    Runs live_budget_alerts and repeat_nudges using user's timezone & tone, logs
    to DailyNotificationLog, optionally sends FCM push, and returns alerts for UI.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    now_local, tz_str = _get_user_local_dt(profile)
    today_local = now_local.date()
    tone = 'roast' if getattr(profile, 'notification_tone', 'normal') == 'roast' else 'normal'
    fired: list[dict] = []

    # 1. Live Budget Spend Alert (respects 11 PM - 7 AM quiet hours in user's timezone, max 10/day)
    if profile.live_budget_alerts:
        hour = now_local.hour
        if 7 <= hour < 23:
            alerts_today = DailyNotificationLog.objects.filter(
                user=user,
                notification_type__startswith='live_alert',
                target_date=today_local
            ).count()
            if alerts_today < 10:
                from .views import calculate_daily_budget
                daily_info = calculate_daily_budget(user, expense.date or today_local)
                desc = (expense.description or expense.category or "Expense").strip()
                amt = float(expense.amount)
                rem = float(daily_info.get('today_remaining', 0))
                alert_msg = build_live_alert_message(desc, amt, rem, tone=tone)
                title = "Live Budget Update 🔥" if tone == 'roast' else "Rozana Budget Update 🎯"

                if profile.fcm_token:
                    try:
                        from .fcm_utils import send_push_notification
                        send_push_notification(profile.fcm_token, title, alert_msg, data={"type": "live_budget_alert"})
                    except Exception:
                        pass

                unique_live_key = f"live_alert_{expense.id}"[:50]
                DailyNotificationLog.objects.get_or_create(
                    user=user,
                    notification_type=unique_live_key,
                    target_date=today_local,
                    defaults={"details": {"expense_id": expense.id, "amount": amt, "remaining": rem, "message": alert_msg, "tone": tone}}
                )
                fired.append({"type": "live_alert", "title": title, "message": alert_msg, "tone": tone})

    # 2. Repeat Merchant / Category Nudge (2+ same merchant, or 3+ same category when merchant unnamed)
    if profile.repeat_nudges:
        exp_date = expense.date or today_local
        raw_desc = (expense.description or "").strip()
        if len(raw_desc) >= 2:
            key_label = raw_desc[:40]
            log_key = f"repeat_{key_label.lower()[:40]}"[:50]
            same_qs = Expense.objects.filter(user=user, date=exp_date, description__iexact=raw_desc)
            threshold = 2
        else:
            key_label = (expense.category or "other").title()
            log_key = f"repeat_cat_{(expense.category or 'other').lower()}"[:50]
            same_qs = Expense.objects.filter(user=user, date=exp_date, category=expense.category)
            threshold = 3

        count = same_qs.count()
        if count >= threshold and not DailyNotificationLog.objects.filter(
            user=user, notification_type=log_key, target_date=exp_date
        ).exists():
            from django.db.models import Sum
            total_amt = float(same_qs.aggregate(t=Sum('amount'))['t'] or 0)
            nudge_msg = build_repeat_nudge_message(key_label, count, total_amt, tone=tone)
            title = f"{key_label} Repeat Alert ⚠️"

            if profile.fcm_token:
                try:
                    from .fcm_utils import send_push_notification
                    send_push_notification(profile.fcm_token, title, nudge_msg, data={"type": "repeat_nudge"})
                except Exception:
                    pass

            DailyNotificationLog.objects.get_or_create(
                user=user,
                notification_type=log_key,
                target_date=exp_date,
                defaults={"details": {"label": key_label, "count": count, "total": total_amt, "message": nudge_msg, "tone": tone}}
            )
            fired.append({"type": "repeat_nudge", "title": title, "message": nudge_msg, "tone": tone})

    return fired


def check_web_due_notifications(user) -> dict:
    """
    Evaluates scheduled morning/nightly alerts on web dashboard load using user's timezone.
    Delivers due Morning/Night briefings cleanly once per day to DailyNotificationLog + web UI.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    now_local, tz_str = _get_user_local_dt(profile)
    local_date = now_local.date()
    current_minutes = now_local.hour * 60 + now_local.minute
    tone = 'roast' if getattr(profile, 'notification_tone', 'normal') == 'roast' else 'normal'

    due_alerts: list[dict] = []

    if profile.morning_budget_push:
        target_m = _parse_hhmm(profile.morning_push_time, 8, 0)
        if current_minutes >= target_m and not DailyNotificationLog.objects.filter(
            user=user, notification_type='morning', target_date=local_date
        ).exists():
            msg = build_morning_message(user, local_date)
            title = "Good Morning! Aaj Ka Budget ☀️"
            if profile.fcm_token:
                try:
                    from .fcm_utils import send_push_notification
                    send_push_notification(profile.fcm_token, title, msg, data={"type": "daily_budget"})
                except Exception:
                    pass
            DailyNotificationLog.objects.create(
                user=user, notification_type='morning', target_date=local_date,
                details={"message": msg, "tone": tone, "channel": "web"}
            )
            due_alerts.append({"type": "morning", "title": title, "message": msg, "tone": tone})

    if profile.nightly_summary:
        target_n = _parse_hhmm(profile.nightly_push_time, 22, 0)
        if current_minutes >= target_n and not DailyNotificationLog.objects.filter(
            user=user, notification_type='night', target_date=local_date
        ).exists():
            msg, status = build_night_message(user, local_date)
            title = "Aaj Ka Kharch Summary 🌙" if status != "over" else "Aaj Ka Budget Alert 🚨"
            if profile.fcm_token:
                try:
                    from .fcm_utils import send_push_notification
                    send_push_notification(profile.fcm_token, title, msg, data={"type": "nightly_summary"})
                except Exception:
                    pass
            DailyNotificationLog.objects.create(
                user=user, notification_type='night', target_date=local_date,
                details={"message": msg, "status": status, "tone": tone, "channel": "web"}
            )
            due_alerts.append({"type": "night", "title": title, "message": msg, "tone": tone})

    recent_qs = DailyNotificationLog.objects.filter(user=user).order_by('-sent_at')[:6]
    recent_logs = []
    for log in recent_qs:
        det = log.details if isinstance(log.details, dict) else {}
        sent_local = log.sent_at.astimezone(now_local.tzinfo)
        recent_logs.append({
            "type": log.notification_type,
            "message": det.get("message") or f"{log.notification_type.replace('_', ' ').title()} notification",
            "tone": det.get("tone", tone),
            "sent_at": sent_local.strftime("%d %b, %I:%M %p"),
        })

    return {
        "due_alerts": due_alerts,
        "recent_logs": recent_logs,
        "schedule": {
            "timezone_name": tz_str,
            "local_time": now_local.strftime("%I:%M %p"),
            "notification_tone": tone,
        }
    }


def send_test_notification(user, kind: str) -> dict:
    """
    Runs a live test of Morning / Night / Live / Repeat Nudge using real user numbers,
    selected AI Alert Tone, and configured timezone; logs to DailyNotificationLog and
    dispatches FCM push if available.
    """
    profile, _ = UserProfile.objects.get_or_create(user=user)
    now_local, tz_str = _get_user_local_dt(profile)
    local_date = now_local.date()
    tone = 'roast' if getattr(profile, 'notification_tone', 'normal') == 'roast' else 'normal'

    if kind == 'morning':
        title = "Morning Budget Push (Test) ☀️"
        msg = build_morning_message(user, local_date)
    elif kind == 'night':
        msg, status = build_night_message(user, local_date)
        title = "Nightly Summary (Test) 🌙" if status != "over" else "Nightly Alert (Test) 🚨"
    elif kind == 'nudge':
        title = "Repeat Merchant Nudge (Test) ⚠️"
        recent_exp = Expense.objects.filter(user=user).order_by('-date', '-id').first()
        label = ((recent_exp.description or recent_exp.category) if recent_exp else "Coffee").strip().title()
        amt = float(recent_exp.amount) if recent_exp else 240.0
        msg = build_repeat_nudge_message(label, 2, amt * 2, tone=tone)
    else:
        kind = 'live'
        from .views import calculate_daily_budget
        daily_info = calculate_daily_budget(user, local_date)
        title = "Live Budget Alert (Test) 🎯"
        msg = build_live_alert_message("Sample Expense", 150.0, float(daily_info.get('today_remaining', 0)), tone=tone)

    if profile.fcm_token:
        try:
            from .fcm_utils import send_push_notification
            send_push_notification(profile.fcm_token, title, msg, data={"type": f"test_{kind}"})
        except Exception:
            pass

    DailyNotificationLog.objects.filter(
        user=user,
        notification_type=f"test_{kind}",
        target_date=local_date,
    ).delete()
    DailyNotificationLog.objects.create(
        user=user,
        notification_type=f"test_{kind}",
        target_date=local_date,
        details={"message": msg, "tone": tone, "test": True}
    )
    return {
        "status": "success",
        "type": kind,
        "title": title,
        "message": msg,
        "tone": tone,
        "local_time": now_local.strftime("%I:%M %p"),
        "timezone_name": tz_str,
    }
