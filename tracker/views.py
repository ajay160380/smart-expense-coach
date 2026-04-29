from django.shortcuts import render, redirect, get_object_or_404
from django.db.models import Sum
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.http import HttpResponse
import csv
import calendar
from datetime import datetime, date, timedelta

from .models import Expense
from .forms import ExpenseForm

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


@login_required(login_url='login')
def dashboard(request):
    # Budget Logic
    if request.method == 'POST' and 'new_budget' in request.POST:
        try:
            request.session['budget'] = float(request.POST['new_budget'])
        except ValueError:
            pass
        return redirect('dashboard')

    monthly_budget = request.session.get('budget', 10000.0)
    today = date.today()
    
    # ⏳ QUICK FILTER LOGIC (Week / Month / All)
    filter_type = request.GET.get('filter', 'month') # Default is month
    
    if filter_type == 'week':
        start_date = today - timedelta(days=today.weekday())
        display_expenses = Expense.objects.filter(user=request.user, date__gte=start_date)
    elif filter_type == 'all':
        display_expenses = Expense.objects.filter(user=request.user)
    else:
        display_expenses = Expense.objects.filter(user=request.user, date__year=today.year, date__month=today.month)

    # 🍕 AUTO-EMOJI MAGIC (Smart Categorization)
    expenses_list = display_expenses.order_by('-date')[:15]
    for exp in expenses_list:
        cat = exp.category.lower()
        if any(x in cat for x in ['pizza', 'burger', 'food', 'maggie', 'zomato', 'swiggy', 'eat', 'dinner']): exp.icon = '🍔'
        elif any(x in cat for x in ['petrol', 'uber', 'cab', 'travel', 'ola', 'auto', 'train', 'bus']): exp.icon = '🚗'
        elif any(x in cat for x in ['movie', 'netflix', 'game', 'fun', 'party']): exp.icon = '🍿'
        elif any(x in cat for x in ['rent', 'emi', 'bill', 'electricity', 'water', 'wifi', 'recharge']): exp.icon = '📄'
        elif any(x in cat for x in ['cloth', 'shopping', 'amazon', 'flipkart', 'shoe', 'myntra']): exp.icon = '🛍️'
        elif any(x in cat for x in ['doctor', 'med', 'pharmacy', 'health', 'gym']): exp.icon = '💊'
        else: exp.icon = '💸'

    # Filtered Data for Chart
    category_qs = display_expenses.values('category').annotate(total=Sum('amount'))
    category_data = {item['category']: item['total'] for item in category_qs}

    # Monthly calculation for "Smart Coach" (Coach humesha monthly chalna chahiye)
    current_month_expenses = Expense.objects.filter(user=request.user, date__year=today.year, date__month=today.month)
    monthly_total = current_month_expenses.aggregate(total=Sum('amount'))['total'] or 0

    insight = "No expenses recorded for this period! 🚀"
    if monthly_total > 0 and category_data:
        top_category = max(category_data, key=category_data.get)
        percent = (category_data[top_category] / monthly_total) * 100
        if percent > 60: insight = f"⚠️ Heavy spending on {top_category} ({percent:.1f}%). Try to cut back!"
        elif percent > 40: insight = f"⚡ {top_category} is your biggest expense ({percent:.1f}%)."
        else: insight = "✅ Your spending across categories looks perfectly balanced."

    budget_percent = (float(monthly_total) / float(monthly_budget)) * 100 if monthly_budget > 0 else 0
    _, last_day = calendar.monthrange(today.year, today.month)
    remaining_days = last_day - today.day + 1
    remaining_budget = float(monthly_budget) - float(monthly_total)
    daily_limit = remaining_budget / remaining_days if remaining_days > 0 else 0

    if remaining_budget < 0: coach_advice = "🚨 Alert! You have crossed your monthly budget. Stop unnecessary spending!"
    elif remaining_days <= 3 and remaining_budget > 0: coach_advice = f"Month is almost over! You saved ₹{remaining_budget:.0f}. Great job! 🎉"
    elif budget_percent >= 80: coach_advice = f"⚠️ High alert! Only ₹{remaining_budget:.0f} left. Try spending less than ₹{daily_limit:.0f}/day."
    elif budget_percent <= 50 and remaining_days < 15: coach_advice = f"👍 You are managing very well. Safe daily limit is ₹{daily_limit:.0f}."
    else: coach_advice = f"📊 You are on track. Try to keep your daily expenses around ₹{daily_limit:.0f}."

    context = {
        'total': monthly_total,
        'category_data': category_data,
        'expenses': expenses_list, 
        'insight': insight,
        'monthly_budget': monthly_budget,
        'budget_percent': min(budget_percent, 100),
        'coach_advice': coach_advice,
        'remaining_budget': remaining_budget,
        'form': ExpenseForm(),
        'current_filter': filter_type, # To keep the active tab highlighted
    }
    return render(request, 'tracker/dashboard.html', context)

@login_required(login_url='login')
def add_expense(request):
    if request.method == 'POST':
        form = ExpenseForm(request.POST)
        if form.is_valid():
            expense = form.save(commit=False)
            expense.user = request.user
            expense.save()
            return redirect('dashboard')
    return render(request, 'tracker/add_expense.html', {'form': ExpenseForm()})

@login_required(login_url='login')
def edit_expense(request, pk):
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    if request.method == 'POST':
        form = ExpenseForm(request.POST, instance=expense)
        if form.is_valid():
            form.save()
            return redirect('dashboard')
    return render(request, 'tracker/add_expense.html', {'form': ExpenseForm(instance=expense), 'edit_mode': True})

@login_required(login_url='login')
def delete_expense(request, pk):
    expense = get_object_or_404(Expense, pk=pk, user=request.user)
    if request.method == 'POST':
        expense.delete()
        return redirect('dashboard')
    return render(request, 'tracker/delete_confirm.html', {'expense': expense})

@login_required(login_url='login')
def export_expenses(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="my_expenses_{date.today()}.csv"'
    writer = csv.writer(response)
    writer.writerow(['Date', 'Category', 'Amount'])
    expenses = Expense.objects.filter(user=request.user).order_by('-date')
    for exp in expenses: writer.writerow([exp.date, exp.category.title(), exp.amount])
    return response