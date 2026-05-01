from django.urls import path
from . import views

urlpatterns = [
    # Dashboard & Auth (Agar tera auth alag file me hai toh ignore karna)
    path('', views.dashboard, name='dashboard'),
    path('register/', views.register, name='register'),
    
    # Expenses
    path('add/', views.add_expense, name='add_expense'),
    path('edit/<int:pk>/', views.edit_expense, name='edit_expense'),
    path('delete/<int:pk>/', views.delete_expense, name='delete_expense'), # 🚀 YE ZAROORI HAI
    path('export/', views.export_expenses, name='export_expenses'),
    
    # Subscriptions / Bills
    path('add-sub/', views.add_subscription, name='add_subscription'),
    path('delete-sub/<int:pk>/', views.delete_subscription, name='delete_subscription'), # 🚀 YE WALA MISSING THA
    
    # APIs & AI Chat
    path('api/category-insight/', views.api_category_insight, name='api_category_insight'),
    path('ai_chat/', views.ai_chat, name='ai_chat'),
]