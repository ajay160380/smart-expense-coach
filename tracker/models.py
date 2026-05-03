from django.db import models
from django.contrib.auth.models import User
from datetime import date

class Expense(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=100)
    # DecimalField use karo accurate calculations ke liye
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=date.today) 
    icon = models.CharField(max_length=10, default="💸")
    # Agar AI description save karni hai toh ye line honi chahiye:
    description = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.category} - ₹{self.amount} ({self.user.username})"
    
class Subscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100) 
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, default='entertainment')
    next_billing_date = models.DateField()

    def __str__(self):
        return f"{self.name} - ₹{self.amount} (User: {self.user.username})"