from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile

class RegisterSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(max_length=15, write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone_number']

    def validate_username(self, value):
        if not value or len(value.strip()) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters.")
        if not value.replace('_', '').isalnum():
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")
        if User.objects.filter(username__iexact=value.strip()).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value.strip()

    def validate_phone_number(self, value):
        clean = ''.join(c for c in str(value) if c.isdigit())
        if len(clean) == 10:
            clean = f"91{clean}"
        if len(clean) < 10 or len(clean) > 15:
            raise serializers.ValidationError("Please provide a valid 10-15 digit phone number.")
        if UserProfile.objects.filter(phone_number=clean).exists():
            raise serializers.ValidationError("An account with this phone number already exists.")
        return clean

    def create(self, validated_data):
        email = validated_data.get('email', '').strip()
        user = User.objects.create_user(
            username=validated_data['username'],
            email=email,
            password=validated_data['password']
        )
        
        UserProfile.objects.create(
            user=user,
            phone_number=validated_data['phone_number'],
            email_verified=False
        )
        return user