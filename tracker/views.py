from django.shortcuts import render, redirect
from django.db.models import Sum
from datetime import date, timedelta
from .models import Expense
from .forms import ExpenseForm

def add_expense(request):
    if request.method == 'POST':
        form = ExpenseForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard')
    else:
        form = ExpenseForm()

    return render(request, 'tracker/add_expense.html', {'form': form})

def dashboard(request):
    # 🔹 TOTAL (DB level calculation)
    total = Expense.objects.aggregate(total=Sum('amount'))['total'] or 0

    # 🔹 CATEGORY BREAKDOWN (DB optimized)
    category_qs = Expense.objects.values('category').annotate(total=Sum('amount'))
    category_data = {item['category']: item['total'] for item in category_qs}

    # 🔥 SMART INSIGHT
    if total > 0 and category_data:
        top_category = max(category_data, key=category_data.get)
        percent = (category_data[top_category] / total) * 100

        if percent > 60:
            insight = f"⚠️ Heavy spending on {top_category} ({percent:.1f}%). Reduce it."
        elif percent > 40:
            insight = f"⚡ {top_category} dominates ({percent:.1f}%). Keep an eye."
        else:
            insight = "✅ Spending is balanced."
    else:
        insight = "No expenses yet."

    # 🔥 WEEKLY COMPARISON (proper 7-day window)
    today = date.today()

    current_week_start = today - timedelta(days=7)
    previous_week_start = today - timedelta(days=14)

    current_total = Expense.objects.filter(
        date__gte=current_week_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    previous_total = Expense.objects.filter(
        date__gte=previous_week_start,
        date__lt=current_week_start
    ).aggregate(total=Sum('amount'))['total'] or 0

    # 🔥 COMPARISON MESSAGE
    if previous_total > 0:
        change = current_total - previous_total
        percent_change = (change / previous_total) * 100

        if change > 0:
            comparison = f"⚠️ {percent_change:.1f}% MORE than last week"
        elif change < 0:
            comparison = f"✅ {abs(percent_change):.1f}% LESS than last week"
        else:
            comparison = "No change from last week"
    else:
        comparison = "No previous week data"

    context = {
        'total': total,
        'category_data': category_data,
        'expenses': Expense.objects.all().order_by('-date')[:5],  # latest 5 only
        'insight': insight,
        'comparison': comparison,
        'current_total': current_total,
        'previous_total': previous_total,
    }

    return render(request, 'tracker/dashboard.html', context)