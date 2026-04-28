from django.urls import path
from . import views

urlpatterns = [
    path('', views.add_expense, name='add_expense'),   # 👈 HOME = FORM
    path('dashboard/', views.dashboard, name='dashboard'),  # 👈 ANALYTICS
]