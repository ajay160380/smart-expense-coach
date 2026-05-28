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

    def clean_phone_number(self):
        phone = self.cleaned_data.get('phone_number')
        # Check karo ki kya yeh number pehle se DB mein hai
        if UserProfile.objects.filter(phone_number=phone).exists():
            raise forms.ValidationError("Bhai, yeh phone number pehle se hi register hai! Koi doosra try karo ya login karo.")
        return phone