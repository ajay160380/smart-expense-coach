import csv
import calendar
from datetime import date, timedelta
from django.db.models import Sum, Max
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.http import HttpResponse

# Imports ek hi baar, ekdum saaf
from .models import Expense, Subscription
from .forms import ExpenseForm, SubscriptionForm

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

# ── DASHBOARD (Premium Look & Auto-Billing) ──
@login_required(login_url='login')
def dashboard(request):
    if request.method == 'POST' and 'new_budget' in request.POST:
        try:
            request.session['budget'] = float(request.POST['new_budget'])
        except ValueError:
            pass
        return redirect('dashboard')

    budget = request.session.get('budget', 20000.0)
    today = date.today()

    # 🔥 AUTO-DEDUCT MAGIC 🔥
    subscriptions = Subscription.objects.filter(user=request.user)
    for sub in subscriptions:
        while sub.next_billing_date <= today:
            # 1. Kharcha automatically add kar do
            Expense.objects.create(
                user=request.user,
                category=sub.category,
                amount=sub.amount,
                date=sub.next_billing_date
            )
            # 2. Agle mahine ki date set kar do
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

    # ⏳ Upcoming Bills List (Sirf aage aane wale 4 bills)
    upcoming_subs = Subscription.objects.filter(user=request.user, next_billing_date__gte=today).order_by('next_billing_date')[:4]
    
    # 🔍 Filters & Search
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
    
    # 📊 Hero Stats
    total_spent = query_set.aggregate(total=Sum('amount'))['total'] or 0
    transaction_count = query_set.count()
    highest_expense = query_set.aggregate(highest=Max('amount'))['highest'] or 0
    
    budget_percent = min((float(total_spent) / float(budget)) * 100, 100) if budget > 0 else 0
    remaining_budget = max(float(budget) - float(total_spent), 0)
    
    days_in_period = today.day if filter_type == 'month' else (7 if filter_type == 'week' else max(1, transaction_count))
    avg_per_day = total_spent / days_in_period if days_in_period > 0 else 0
    
    savings_rate = ((budget - total_spent) / budget) * 100 if budget > 0 else 0
    savings_rate = max(0, min(100, savings_rate))

    # 📑 Category Breakdown
    cat_qs = query_set.values('category').annotate(total=Sum('amount')).order_by('-total')
    category_data_list = []
    top_cat = "None"
    
    cat_colors = {'food':'#6c5ce7','transport':'#00cec9','shopping':'#fd79a8','health':'#00b894','entertainment':'#fdcb6e','education':'#74b9ff','utilities':'#a29bfe','other':'#dfe6e9'}
    cat_icons = {'food':'🍜','transport':'🚗','shopping':'🛍️','health':'💊','entertainment':'🎬','education':'📚','utilities':'⚡','other':'📦'}
    
    if cat_qs:
        top_cat = cat_qs[0]['category'].title()
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

    # 🤖 AI Insight
    if transaction_count == 0:
        insight = "<strong>Start logging!</strong> Add your first expense to see insights."
    elif budget_percent > 90:
        insight = f"<strong>Budget alert!</strong> You've used {budget_percent:.0f}% of your budget. Consider slowing down."
    elif budget_percent > 70:
        insight = f"<strong>Getting close.</strong> You've used {budget_percent:.0f}% of budget. Keep an eye on spending."
    else:
        insight = f"<strong>Looking good!</strong> Your biggest spending category is <strong>{top_cat}</strong>. You have ₹{remaining_budget:.0f} left."

    # 📉 7-Day Chart Data Logic
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

    expenses_list = query_set.order_by('-date')

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
        'sub_form': SubscriptionForm(), # FIX: Added this!
        'upcoming_subs': upcoming_subs, # FIX: Added this!
        'today_month_year': today.strftime('%B %Y')
    }
    return render(request, 'tracker/dashboard.html', context)


# ── ACTIONS (Add, Edit, Delete, Export) ──
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
    return redirect('dashboard')

@login_required(login_url='login')
def edit_expense(request, pk):
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    if request.method == 'POST':
        form = ExpenseForm(request.POST, instance=expense)
        if form.is_valid():
            form.save()
            return redirect('dashboard')
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

# ── SUBSCRIPTIONS ACTION ──
@login_required(login_url='login')
def add_subscription(request):
    if request.method == 'POST':
        form = SubscriptionForm(request.POST)
        if form.is_valid():
            sub = form.save(commit=False)
            sub.user = request.user
            sub.save()
    return redirect('dashboard')