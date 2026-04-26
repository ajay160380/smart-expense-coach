from django.shortcuts import render, redirect
from .forms import ExpenseForm

def add_expense(request):
    if request.method == "POST":
        form = ExpenseForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('/')
    else:
        form = ExpenseForm()

    return render(request, 'tracker/add_expense.html', {'form': form})