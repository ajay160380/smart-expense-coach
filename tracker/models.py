from django.db import models
from django.contrib.auth.models import User  # 👈 Naya import (Django ka inbuilt User system)

class Expense(models.Model):
    # 👈 Ye line add karni hai. CASCADE ka matlab agar user delete hua, toh uske kharche bhi delete ho jayenge.
    user = models.ForeignKey(User, on_delete=models.CASCADE, default=1) 
    
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100)
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} - ₹{self.amount}"