"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║          EXPENSE TRACKER — EXPENSE TRACKER  |  urls.py  |  Production v3.0         ║
║          Complete URL Configuration matching views.py v3.0                      ║
╚══════════════════════════════════════════════════════════════════════════════════╝
"""

from django.urls import path
from . import views
from .views import RegisterAPIView 




urlpatterns = [

    # ══════════════════════════════════════════════════════════════════════
    # DASHBOARD & STATIC PAGES
    # ══════════════════════════════════════════════════════════════════════
    path('', views.landing_view, name='landing'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('about/', views.about_view, name='about'),
    path('features/', views.features_view, name='features'),
    path('privacy/', views.privacy_view, name='privacy'),
    path('terms/', views.terms_view, name='terms'),
    path('contact/', views.contact_view, name='contact'),

    # ══════════════════════════════════════════════════════════════════════
    # AUTHENTICATION
    # Custom views from views.py (Hinglish messages + proper redirects)
    # ══════════════════════════════════════════════════════════════════════
    path('login/',    views.user_login,  name='login'),
    path('logout/',   views.user_logout, name='logout'),
    path('register/', views.register,    name='register'),

    # ══════════════════════════════════════════════════════════════════════
    # EXPENSE CRUD
    # ══════════════════════════════════════════════════════════════════════
    path('add/',                  views.add_expense,      name='add_expense'),
    path('edit/<int:pk>/',        views.edit_expense,     name='edit_expense'),
    path('delete/<int:pk>/',      views.delete_expense,   name='delete_expense'),
    path('bulk-delete/',          views.bulk_delete_expenses, name='bulk_delete_expenses'),

    # ══════════════════════════════════════════════════════════════════════
    # EXPORT
    # Supports ?format=csv|json  &  ?filter=week|month|all
    # Optional: ?start=YYYY-MM-DD & ?end=YYYY-MM-DD
    # ══════════════════════════════════════════════════════════════════════
    path('export/', views.export_expenses, name='export_expenses'),

    # ══════════════════════════════════════════════════════════════════════
    # SUBSCRIPTIONS
    # ══════════════════════════════════════════════════════════════════════
    path('add-sub/',                   views.add_subscription,    name='add_subscription'),
    path('delete-sub/<int:pk>/',       views.delete_subscription, name='delete_subscription'),

    # ══════════════════════════════════════════════════════════════════════
    # VOICE EXPENSE
    # POST { "text": "aaj zomato pe 450 kharch kiya" }
    # ══════════════════════════════════════════════════════════════════════
    path('api/voice-expense/',         views.voice_expense,       name='voice_expense'),

    # ══════════════════════════════════════════════════════════════════════
    # AI ENDPOINTS
    # ══════════════════════════════════════════════════════════════════════

    # AI Chat — ExpenseTracker bot
    # POST { "message": "...", "history": [...] }
    path('ai_chat/',                   views.ai_chat,             name='ai_chat'),

    # Category Insight — GET ?category=food&period=month
    path('api/category-insight/',      views.api_category_insight, name='api_category_insight'),

    # ══════════════════════════════════════════════════════════════════════
    # ANALYTICS APIs
    # ══════════════════════════════════════════════════════════════════════

    # Full analytics — GET ?period=week|month|quarter|year
    path('api/analytics/',             views.api_analytics,        name='api_analytics'),

    # 52-week spending heatmap data
    path('api/heatmap/',               views.api_heatmap,          name='api_heatmap'),

    # Anomaly alerts — spending spikes, budget exceeded, projections
    path('api/anomalies/',             views.api_anomalies,        name='api_anomalies'),

    # Quick summary stats for dashboard widgets (lightweight, no AI)
    path('api/summary-stats/',         views.api_summary_stats,    name='api_summary_stats'),

    # All subscriptions as JSON
    path('api/subscriptions/',         views.api_subscriptions,    name='api_subscriptions'),

    # Savings projection — GET ?goal=50000
    path('api/savings-projection/',    views.api_savings_projection, name='api_savings_projection'),

    # ══════════════════════════════════════════════════════════════════════
    # MOBILE / PWA APIs
    # ══════════════════════════════════════════════════════════════════════

    # Quick add expense via JSON (for mobile / PWA)
    # POST { "amount": 150, "category": "food", "date": "2025-05-01" }
    path('api/quick-add/',             views.api_quick_add,        name='api_quick_add'),
    path('api/edit-expense/<int:pk>/', views.api_edit_expense,     name='api_edit_expense'),
    path('api/delete-expense/<int:pk>/', views.api_delete_expense, name='api_delete_expense'),

    # User profile + lifetime stats
    path('api/profile/',               views.api_user_profile,     name='api_user_profile'),
    path('api/profile/upload-photo/',  views.api_upload_profile_photo, name='api_upload_profile_photo'),

    # ══════════════════════════════════════════════════════════════════════
    # HEALTH CHECK (no auth required — for uptime monitoring)
    # ══════════════════════════════════════════════════════════════════════
    path('health/',                    views.health_check,         name='health_check'),
    path('api/check-updates/', views.check_updates, name='check_updates'),
    path('api/habit-warnings/', views.habit_warnings, name='habit_warnings'),
    path('api/register/', RegisterAPIView.as_view(), name='api_register'),
    path('api/login/', views.CustomAuthToken.as_view(), name='api_login'),
    path('api/whatsapp-summary/', views.whatsapp_summary, name='whatsapp_summary'),
    path('api/latest-update-time/', views.get_latest_update_time, name='get_latest_update_time'),
    path('api/wa-link-status/', views.wa_link_status, name='wa_link_status'),

    # ══════════════════════════════════════════════════════════════════════
    # FEATURE 1: MONTHLY COMPARISON
    # ══════════════════════════════════════════════════════════════════════
    path('api/monthly-comparison/',     views.api_monthly_comparison, name='api_monthly_comparison'),

    # ══════════════════════════════════════════════════════════════════════
    # FEATURE 2: SAVINGS GOALS
    # ══════════════════════════════════════════════════════════════════════
    path('api/savings-goals/',              views.api_savings_goals,  name='api_savings_goals'),
    path('api/savings-goals/add/',          views.api_add_goal,       name='api_add_goal'),
    path('api/savings-goals/<int:pk>/update/', views.api_update_goal, name='api_update_goal'),
    path('api/savings-goals/<int:pk>/delete/', views.api_delete_goal, name='api_delete_goal'),

    # ══════════════════════════════════════════════════════════════════════
    # FEATURE 3: DAILY MONEY TIP
    # ══════════════════════════════════════════════════════════════════════
    path('api/daily-tip/',              views.api_daily_tip,           name='api_daily_tip'),
    path('api/trigger-daily-tips/',     views.api_trigger_daily_tips,  name='api_trigger_daily_tips'),

    # ══════════════════════════════════════════════════════════════════════
    # FEATURE 5: EXPENSE SPLIT
    # ══════════════════════════════════════════════════════════════════════
    path('api/splits/',                         views.api_split_groups,       name='api_split_groups'),
    path('api/splits/create/',                  views.api_create_split,       name='api_create_split'),
    path('api/splits/<int:pk>/add-expense/',    views.api_add_split_expense,  name='api_add_split_expense'),
    path('api/splits/<int:pk>/summary/',        views.api_split_summary,      name='api_split_summary'),
    path('api/splits/<int:pk>/settle/',         views.api_settle_split,       name='api_settle_split'),
    path('api/splits/<int:pk>/delete/',         views.api_delete_split,       name='api_delete_split'),
    path('api/splits/<int:pk>/delete-expense/<int:expense_id>/', views.api_delete_split_expense, name='api_delete_split_expense'),

    # ══════════════════════════════════════════════════════════════════════
    # NEW FEATURE: ADMIN PANEL, ANALYTICS & EXPORTS
    # ══════════════════════════════════════════════════════════════════════
    path('admin-panel/', views.admin_panel, name='admin_panel'),
    path('admin-panel/delete-user/<int:user_id>/', views.admin_delete_user, name='admin_delete_user'),
    path('api/admin/users/', views.api_admin_users, name='api_admin_users'),
    path('api/admin/delete-user/<int:user_id>/', views.api_admin_delete_user, name='api_admin_delete_user'),
    path('api/submit-feedback/', views.api_submit_feedback, name='api_submit_feedback'),
    path('api/export/csv/', views.export_csv, name='export_csv'),
    path('api/export/pdf/', views.export_pdf, name='export_pdf'),
]