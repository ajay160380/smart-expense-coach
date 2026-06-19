from django.contrib import admin
from .models import Expense, Subscription, UserProfile, SavingsGoal, SplitGroup, SplitExpense, SplitMember


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('user', 'category', 'amount', 'date', 'description')
    list_filter = ('category', 'date')
    search_fields = ('user__username', 'category', 'description')
    ordering = ('-date', '-id')


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'amount', 'category', 'next_billing_date')
    list_filter = ('category',)
    search_fields = ('user__username', 'name')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone_number', 'whatsapp_linked', 'whatsapp_number', 'monthly_budget', 'level', 'xp', 'streak')
    list_filter = ('whatsapp_linked',)
    search_fields = ('user__username', 'phone_number', 'whatsapp_number')


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'target_amount', 'saved_amount', 'is_completed', 'deadline')
    list_filter = ('is_completed',)
    search_fields = ('user__username', 'name')


@admin.register(SplitGroup)
class SplitGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'is_settled', 'created_at')
    list_filter = ('is_settled',)
    search_fields = ('name', 'creator__username')


@admin.register(SplitExpense)
class SplitExpenseAdmin(admin.ModelAdmin):
    list_display = ('group', 'paid_by', 'description', 'amount', 'date')
    search_fields = ('description', 'paid_by')


@admin.register(SplitMember)
class SplitMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'phone')
    search_fields = ('name',)