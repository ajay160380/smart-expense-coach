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
    email = forms.EmailField(
        required=True,
        help_text="Valid email address"
    )
    phone_number = forms.CharField(
        max_length=15,
        required=True,
        help_text="Apna WhatsApp number daalein (e.g., 910123456789)"
    )

    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('email', 'phone_number')

    def clean_phone_number(self):
        import re
        raw_phone = self.cleaned_data.get('phone_number', '')
        clean_phone = re.sub(r'[^0-9]', '', raw_phone).lstrip("0")
        if not clean_phone:
            raise forms.ValidationError("Please enter a valid phone number.")
        if UserProfile.objects.filter(phone_number=clean_phone).exists():
            raise forms.ValidationError(
                "This phone number is already registered. Please use a different number or login to your existing account."
            )
        return clean_phone

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
            UserProfile.objects.create(
                user=user,
                phone_number=self.cleaned_data['phone_number']
            )
        return user