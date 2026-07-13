from django.db import models
from django.contrib.auth.models import User
from datetime import date

# ─── NAYA FEATURE: User Profile (Phone Number ke liye) ───
class UserProfile(models.Model):
    # Default User se 1-to-1 connection
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    

    phone_number = models.CharField(max_length=15, unique=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    
    # --- WhatsApp Linking Fields ---
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True)
    whatsapp_linked = models.BooleanField(default=False)
    whatsapp_link_token = models.CharField(max_length=50, blank=True, null=True, unique=True)
    whatsapp_link_expires = models.DateTimeField(blank=True, null=True)

    # --- Gamification Fields ---
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    streak = models.IntegerField(default=0)
    last_expense_date = models.DateField(blank=True, null=True) # Streak track karne ke liye

    # --- Budget Field ---
    monthly_budget = models.DecimalField(max_digits=10, decimal_places=2, default=20000)

    def __str__(self):
        return f"{self.user.username} - {self.phone_number}"

# ─── PURANE MODELS (Unchanged) ───
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

    class Meta:
        ordering = ['-date', '-id']

class Subscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100) 
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, default='entertainment')
    next_billing_date = models.DateField()

    def __str__(self):
        return f"{self.name} - ₹{self.amount} (User: {self.user.username})"

# ─── NAYA FEATURE: Savings Goals ───
class SavingsGoal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='savings_goals')
    name = models.CharField(max_length=100)           # "iPhone 16 Pro", "Goa Trip"
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    saved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    icon = models.CharField(max_length=10, default="🎯")
    deadline = models.DateField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - ₹{self.saved_amount}/₹{self.target_amount} ({self.user.username})"

    @property
    def progress_percent(self):
        if self.target_amount <= 0:
            return 0
        return min(float(self.saved_amount) / float(self.target_amount) * 100, 100)

# ─── NAYA FEATURE: Expense Split ───
class SplitGroup(models.Model):
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='split_groups')
    name = models.CharField(max_length=100)           # "Goa Trip", "Office Lunch"
    created_at = models.DateTimeField(auto_now_add=True)
    is_settled = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} (by {self.creator.username})"

class SplitMember(models.Model):
    group = models.ForeignKey(SplitGroup, on_delete=models.CASCADE, related_name='members')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        unique_together = ('group', 'name')

    def __str__(self):
        return f"{self.name} in {self.group.name}"

class SplitExpense(models.Model):
    group = models.ForeignKey(SplitGroup, on_delete=models.CASCADE, related_name='expenses')
    paid_by = models.CharField(max_length=100)        # Name of person who paid
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=date.today)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.description} - ₹{self.amount} (paid by {self.paid_by})"