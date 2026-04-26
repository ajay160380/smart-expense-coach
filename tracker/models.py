from django.db import models

class Expense(models.Model):
    amount = models.FloatField()
    category = models.CharField(max_length=100)
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} - {self.amount}"