from django.db import models
from django.contrib.auth.models import User
from datetime import date
from django.utils import timezone
import uuid
import secrets

# ─── NAYA FEATURE: User Profile (Phone Number ke liye) ───
class UserProfile(models.Model):
    # Default User se 1-to-1 connection
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    

    phone_number = models.CharField(max_length=15, unique=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    profile_picture_b64 = models.TextField(blank=True, null=True) # For Render ephemeral storage fix
    
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
    
    # --- FCM Push Notification Token ---
    fcm_token = models.CharField(max_length=255, blank=True, null=True)

    # --- Budget Field ---
    monthly_budget = models.DecimalField(max_digits=10, decimal_places=2, default=20000)
    budget_cycle_start_day = models.IntegerField(default=1)

    # --- Verification ---
    email_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.phone_number}"

# ─── NAYA FEATURE: Feedback System ───
class Feedback(models.Model):
    SOURCE_CHOICES = (
        ('app', 'App'),
        ('web', 'Web'),
        ('whatsapp', 'WhatsApp'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    text = models.TextField()
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='web')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback from {self.user.username} via {self.source}"

# ─── NAYA FEATURE: Analytics (Login Activity) ───
class UserLoginActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='logins')
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} logged in at {self.timestamp}"

# ─── NAYA FEATURE: WhatsApp Bot Memory ───
class WhatsAppSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='whatsapp_sessions', null=True, blank=True)
    phone_number = models.CharField(max_length=20, unique=True)
    state = models.CharField(max_length=50, default='NORMAL')
    context = models.JSONField(default=list, blank=True) # To store recent messages
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Session for {self.phone_number} - State: {self.state}"

# ─── NAYA FEATURE: OTP Verification (Hardened) ───
class OTPVerification(models.Model):
    identifier = models.CharField(max_length=100, db_index=True) # Phone number or Email
    otp_code = models.CharField(max_length=128) # Stores hashed OTP or code
    action = models.CharField(max_length=50, default='general', db_index=True)
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=5)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.identifier} ({self.action}, Verified: {self.is_verified})"

# ─── NAYA FEATURE: AI Notepad ───
class Note(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Note by {self.user.username} at {self.updated_at.strftime('%Y-%m-%d %H:%M')}"


# ─── PURANE MODELS (Unchanged) ───
class Expense(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.CharField(max_length=100, db_index=True)
    # DecimalField use karo accurate calculations ke liye
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=date.today, db_index=True)
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
    next_billing_date = models.DateField(db_index=True)

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
    share_token = models.CharField(max_length=64, unique=True, blank=True, null=True, db_index=True)
    token_expires_at = models.DateTimeField(blank=True, null=True)
    is_revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_settled = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.share_token:
            self.share_token = secrets.token_urlsafe(24)
        super().save(*args, **kwargs)

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


class SplitSettlement(models.Model):
    group = models.ForeignKey(SplitGroup, on_delete=models.CASCADE, related_name='settlements')
    debtor = models.CharField(max_length=100)      # Person who paid the settlement
    creditor = models.CharField(max_length=100)    # Person who received the settlement
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=date.today)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.debtor} paid ₹{self.amount} to {self.creditor} ({self.group.name})"


# ─── REAL PRODUCTION ADDITIONS: Analytics & Error Logging ───
class AppAnalyticsEvent(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='analytics_events')
    event_name = models.CharField(max_length=100, db_index=True)
    properties = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        username = self.user.username if self.user else "Anonymous"
        return f"[{self.event_name}] by {username} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class AppErrorLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='error_logs')
    error_message = models.TextField()
    stack_trace = models.TextField(blank=True, null=True)
    device_info = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Error at {self.created_at.strftime('%Y-%m-%d %H:%M')}: {self.error_message[:50]}"


# ─── IDEMPOTENCY: Subscription Charge Model (LOGIC-003) ───
class SubscriptionCharge(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='charges')
    billing_date = models.DateField(db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense = models.ForeignKey(Expense, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['subscription', 'billing_date'], name='unique_subscription_billing_charge')
        ]
        ordering = ['-billing_date']

    def __str__(self):
        return f"Charge for {self.subscription.name} on {self.billing_date} - ₹{self.amount}"


# ─── IDEMPOTENCY: WhatsApp Processed Message Model (LOGIC-004) ───
class WhatsAppProcessedMessage(models.Model):
    provider_message_id = models.CharField(max_length=128, db_index=True)
    sender_id = models.CharField(max_length=100, db_index=True)
    status = models.CharField(max_length=20, default='success')
    response_text = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['provider_message_id', 'sender_id'], name='unique_whatsapp_message')
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"Msg {self.provider_message_id} from {self.sender_id} ({self.status})"


# ─── SUPPORT: Contact Form Message Model (WEB-001) ───
class ContactMessage(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]
    name = models.CharField(max_length=150)
    email = models.EmailField()
    subject = models.CharField(max_length=200, blank=True, default='')
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    replied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Message from {self.name} <{self.email}> at {self.created_at.strftime('%Y-%m-%d %H:%M')}"