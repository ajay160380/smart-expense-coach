"""
╔══════════════════════════════════════════════════════════════════════════════════╗
║          PAISA MITRA — EXPENSE TRACKER  |  urls.py  |  Production v3.0         ║
║          Complete URL Configuration matching views.py v3.0                      ║
╚══════════════════════════════════════════════════════════════════════════════════╝
"""

from django.urls import path
from . import views

urlpatterns = [

    # ══════════════════════════════════════════════════════════════════════
    # DASHBOARD
    # ══════════════════════════════════════════════════════════════════════
    path('', views.dashboard, name='dashboard'),

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

    # AI Chat — PaisaMitra bot
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

    # User profile + lifetime stats
    path('api/profile/',               views.api_user_profile,     name='api_user_profile'),

    # ══════════════════════════════════════════════════════════════════════
    # HEALTH CHECK (no auth required — for uptime monitoring)
    # ══════════════════════════════════════════════════════════════════════
    path('health/',                    views.health_check,         name='health_check'),
    # urls.py ke urlpatterns array mein ye line add karo:
    path('api/check-updates/', views.check_updates, name='check_updates'),
    path('api/habit-warnings/', views.habit_warnings, name='habit_warnings'),
]