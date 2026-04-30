from django.db import models
from django.contrib.auth.models import User
from datetime import date

class Expense(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=100)
    amount = models.FloatField()
    # Default date aaj ki set hai, error se bachne ke liye
    date = models.DateField(default=date.today) 
    icon = models.CharField(max_length=10, default="💸")
    
    def __str__(self):
        return f"{self.category} - ₹{self.amount}"