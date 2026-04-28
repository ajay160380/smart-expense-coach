from django.shortcuts import render
from .models import Expense

def dashboard(request):
    expenses = Expense.objects.all()

    total = sum(exp.amount for exp in expenses)

    category_data = {}
    for exp in expenses:
        if exp.category in category_data:
            category_data[exp.category] += exp.amount
        else:
            category_data[exp.category] = exp.amount

    # 🔥 SMART INSIGHT LOGIC
    insight = ""

    if total > 0:
        for category, amount in category_data.items():
            percent = (amount / total) * 100

            if percent > 50:
                insight = f"You are spending too much on {category} ({percent:.1f}%) ⚠️"
                break

    if insight == "":
        insight = "Your spending looks balanced 👍"

    context = {
        'total': total,
        'category_data': category_data,
        'expenses': expenses,
        'insight': insight   # 👈 new
    }

    return render(request, 'tracker/dashboard.html', context)