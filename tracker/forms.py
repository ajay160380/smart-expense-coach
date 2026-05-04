from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Expense, Subscription, UserProfile 

class ExpenseForm(forms.ModelForm):
    class Meta:
        model = Expense
        fields = ['amount', 'category', 'date']

class SubscriptionForm(forms.ModelForm):
    class Meta:
        model = Subscription
        fields = ['name', 'amount', 'category', 'next_billing_date']

class CustomRegistrationForm(UserCreationForm):
    phone_number = forms.CharField(
        max_length=15,
        required=True,
        help_text="Apna WhatsApp number daalein (e.g., 917905398965)"
    )

    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('phone_number',)

    def save(self, commit=True):
        user = super().save(commit=False)
        if commit:
            user.save()
            UserProfile.objects.create(
                user=user,
                phone_number=self.cleaned_data['phone_number']
            )
        return user