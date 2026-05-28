from django.contrib import admin
from .models import Expense, Subscription, UserProfile # UserProfile add kiya

admin.site.register(Expense)
admin.site.register(Subscription)
admin.site.register(UserProfile)