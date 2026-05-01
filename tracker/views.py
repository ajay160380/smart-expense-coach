import csv
import calendar
import os
from datetime import date, timedelta
from django.db.models import Sum, Max
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.http import HttpResponse
from django.conf import settings
from groq import Groq

# Models aur Forms import
from .models import Expense, Subscription
from .forms import ExpenseForm, SubscriptionForm

# Groq Client Initialization
client = Groq(api_key=settings.GROQ_API_KEY)

def get_groq_insight(expenses, budget, total_spent):
    """Groq API se Hinglish mein financial roast/advice mangwane ke liye."""
    try:
        # AI ko dene ke liye summary (last 5 expenses)
        expense_summary = ", ".join([f"{e.category}: ₹{e.amount}" for e in expenses[:5]])
        
        prompt = f"""
        You are a sarcastic but helpful Indian middle-class financial coach. 
        User's Monthly Budget: ₹{budget}
        Total Spent so far: ₹{total_spent}
        Recent Expenses: {expense_summary}
        
        Give a 1-sentence witty roast or advice in Hinglish (Roman script). 
        Make it funny and relatable (mention things like Chai, Zomato, or Middle-class struggles).
        Keep it under 25 words.
        """

        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-8b-8192",
            temperature=0.7,
            max_tokens=100,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        # Agar API fail ho jaye toh default message
        return f"Budget check kar lo bhai, ₹{max(0, budget - total_spent)} bacha hai bas!"

# ── AUTHENTICATION ──
def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('dashboard')
    else:
        form = UserCreationForm()
    return render(request, 'tracker/register.html', {'form': form})

# ── DASHBOARD ──
@login_required(login_url='login')
def dashboard(request):
    # Budget Update Logic
    if request.method == 'POST' and 'new_budget' in request.POST:
        try:
            request.session['budget'] = float(request.POST['new_budget'])
        except ValueError:
            pass
        return redirect('dashboard')

    budget = request.session.get('budget', 20000.0)
    today = date.today()

    # 🔥 AUTO-DEDUCT MAGIC (Subscriptions)
    subscriptions = Subscription.objects.filter(user=request.user)
    for sub in subscriptions:
        while sub.next_billing_date <= today:
            Expense.objects.create(
                user=request.user,
                category=sub.category,
                amount=sub.amount,
                date=sub.next_billing_date
            )
            # Next billing date logic
            month = sub.next_billing_date.month
            year = sub.next_billing_date.year
            if month == 12:
                month = 1
                year += 1
            else:
                month += 1
            day = min(sub.next_billing_date.day, calendar.monthrange(year, month)[1])
            sub.next_billing_date = date(year, month, day)
            sub.save()

    # Upcoming Bills
    upcoming_subs = Subscription.objects.filter(user=request.user, next_billing_date__gte=today).order_by('next_billing_date')[:4]
    
    # Search & Filters
    search_query = request.GET.get('q', '')
    filter_type = request.GET.get('filter', 'month')

    query_set = Expense.objects.filter(user=request.user)
    
    if search_query:
        query_set = query_set.filter(category__icontains=search_query)

    if filter_type == 'week':
        start_date = today - timedelta(days=7)
        query_set = query_set.filter(date__gte=start_date)
    elif filter_type == 'month':
        query_set = query_set.filter(date__year=today.year, date__month=today.month)
    
    # Stats Calculation
    total_spent = query_set.aggregate(total=Sum('amount'))['total'] or 0
    transaction_count = query_set.count()
    highest_expense = query_set.aggregate(highest=Max('amount'))['highest'] or 0
    
    budget_percent = min((float(total_spent) / float(budget)) * 100, 100) if budget > 0 else 0
    remaining_budget = max(float(budget) - float(total_spent), 0)
    
    days_in_period = today.day if filter_type == 'month' else (7 if filter_type == 'week' else max(1, transaction_count))
    avg_per_day = total_spent / days_in_period if days_in_period > 0 else 0
    
    savings_rate = max(0, min(100, ((budget - total_spent) / budget) * 100)) if budget > 0 else 0

    # Category Breakdown logic
    cat_qs = query_set.values('category').annotate(total=Sum('amount')).order_by('-total')
    category_data_list = []
    
    cat_colors = {'food':'#6c5ce7','transport':'#00cec9','shopping':'#fd79a8','health':'#00b894','entertainment':'#fdcb6e','education':'#74b9ff','utilities':'#a29bfe','other':'#dfe6e9'}
    cat_icons = {'food':'🍜','transport':'🚗','shopping':'🛍️','health':'💊','entertainment':'🎬','education':'📚','utilities':'⚡','other':'📦'}
    
    if cat_qs:
        for c in cat_qs:
            cat_name = c['category'].lower()
            cat_percent = (c['total'] / total_spent) * 100 if total_spent > 0 else 0
            category_data_list.append({
                'name': cat_name,
                'title': cat_name.title(),
                'total': c['total'],
                'percent': min(cat_percent, 100),
                'color': cat_colors.get(cat_name, '#888'),
                'icon': cat_icons.get(cat_name, '📦')
            })

    # Chart Data (Last 7 Days)
    chart_data = []
    chart_totals = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_total = Expense.objects.filter(user=request.user, date=d).aggregate(t=Sum('amount'))['t'] or 0
        chart_totals.append(day_total)
    
    max_chart_val = max(chart_totals) if chart_totals and max(chart_totals) > 0 else 1
    
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_total = chart_totals[6-i]
        height = max((day_total / max_chart_val) * 140, 8 if day_total > 0 else 2)
        chart_data.append({
            'day': d.strftime('%a'),
            'total': day_total,
            'height': height,
            'is_today': d == today
        })

    # Data ready, ab AI Insight mangwayein
    expenses_list = query_set.order_by('-date')

    if transaction_count == 0:
        insight = "<strong>Start logging!</strong> Add your first expense to see AI insights."
    else:
        # 🔥 GROQ AI CALL
        ai_response = get_groq_insight(expenses_list, budget, total_spent)
        insight = f"<strong>AI Coach:</strong> {ai_response}"

    context = {
        'budget': budget,
        'total_spent': total_spent,
        'budget_percent': budget_percent,
        'remaining_budget': remaining_budget,
        'transaction_count': transaction_count,
        'avg_per_day': avg_per_day,
        'highest_expense': highest_expense,
        'savings_rate': savings_rate,
        'insight': insight,
        'category_data_list': category_data_list,
        'chart_data': chart_data,
        'expenses': expenses_list,
        'current_filter': filter_type,
        'search_query': search_query,
        'form': ExpenseForm(),
        'sub_form': SubscriptionForm(),
        'upcoming_subs': upcoming_subs,
        'today_month_year': today.strftime('%B %Y')
    }
    return render(request, 'tracker/dashboard.html', context)

# ── ACTIONS ──
@login_required(login_url='login')
def add_expense(request):
    if request.method == 'POST':
        form = ExpenseForm(request.POST)
        if form.is_valid():
            expense = form.save(commit=False)
            expense.user = request.user
            if not expense.date:
                expense.date = date.today()
            expense.save()
    return redirect('dashboard')

@login_required(login_url='login')
def edit_expense(request, pk):
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    if request.method == 'POST':
        form = ExpenseForm(request.POST, instance=expense)
        if form.is_valid():
            form.save()
    return redirect('dashboard')

@login_required(login_url='login')
def delete_expense(request, pk):
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    if request.method == 'POST':
        expense.delete()
    return redirect('dashboard')

@login_required(login_url='login')
def export_expenses(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="expenses_{date.today()}.csv"'
    writer = csv.writer(response)
    writer.writerow(['Date', 'Category', 'Amount'])
    expenses = Expense.objects.filter(user=request.user).order_by('-date')
    for exp in expenses:
        writer.writerow([exp.date, exp.category, exp.amount])
    return response

@login_required(login_url='login')
def add_subscription(request):
    if request.method == 'POST':
        form = SubscriptionForm(request.POST)
        if form.is_valid():
            sub = form.save(commit=False)
            sub.user = request.user
            sub.save()
    return redirect('dashboard')