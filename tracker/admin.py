from django.contrib import admin
from .models import Expense, Subscription, UserProfile, SavingsGoal, SplitGroup, SplitExpense, SplitMember

admin.site.register(Expense)
admin.site.register(Subscription)
admin.site.register(UserProfile)
admin.site.register(SavingsGoal)
admin.site.register(SplitGroup)
admin.site.register(SplitExpense)
admin.site.register(SplitMember)