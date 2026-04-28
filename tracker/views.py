from django.shortcuts import render
from .models import Expense
from datetime import date, timedelta

def dashboard(request):
    expenses = Expense.objects.all()

    total = sum(exp.amount for exp in expenses)

    # Category breakdown
    category_data = {}
    for exp in expenses:
        if exp.category in category_data:
            category_data[exp.category] += exp.amount
        else:
            category_data[exp.category] = exp.amount

    # 🔥 SMART INSIGHT (category)
    insight = ""
    if total > 0:
        for category, amount in category_data.items():
            percent = (amount / total) * 100
            if percent > 50:
                insight = f"You are spending too much on {category} ({percent:.1f}%) ⚠️"
                break
    if insight == "":
        insight = "Your spending looks balanced 👍"

    # 🔥 WEEKLY COMPARISON
    today = date.today()

    current_week_start = today - timedelta(days=7)
    previous_week_start = today - timedelta(days=14)

    current_week_expenses = Expense.objects.filter(date__gte=current_week_start)
    previous_week_expenses = Expense.objects.filter(
        date__gte=previous_week_start,
        date__lt=current_week_start
    )

    current_total = sum(exp.amount for exp in current_week_expenses)
    previous_total = sum(exp.amount for exp in previous_week_expenses)

    # 🔥 COMPARISON MESSAGE
    comparison = ""

    if previous_total > 0:
        diff = current_total - previous_total
        percent_change = (diff / previous_total) * 100

        if diff > 0:
            comparison = f"⚠️ You spent {percent_change:.1f}% more than last week"
        elif diff < 0:
            comparison = f"✅ You spent {abs(percent_change):.1f}% less than last week"
        else:
            comparison = "No change from last week"
    else:
        comparison = "Not enough data for comparison"

    context = {
        'total': total,
        'category_data': category_data,
        'expenses': expenses,
        'insight': insight,
        'comparison': comparison,
        'current_total': current_total,
        'previous_total': previous_total,
    }

    return render(request, 'tracker/dashboard.html', context)