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

    context = {
        'total': total,
        'category_data': category_data,
        'expenses': expenses
    }

    return render(request, 'tracker/dashboard.html', context)