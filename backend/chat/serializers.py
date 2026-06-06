from rest_framework import serializers
from .models import Session, Message, UsageLog


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "tool_use_id", "created_at"]


class SessionSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = ["id", "agent", "created_at", "messages"]


class UsageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsageLog
        fields = [
            "id", "agent", "session", "model_used",
            "input_tokens", "output_tokens", "latency_ms", "created_at",
        ]
