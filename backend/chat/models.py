import uuid
from django.db import models
from agents.models import Agent


class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name="sessions")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Session {self.id} ({self.agent.slug})"


class Message(models.Model):
    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
        ("tool_result", "Tool Result"),
    ]

    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="messages")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    tool_use_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class UsageLog(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE, related_name="usage_logs")
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name="usage_logs")
    model_used = models.CharField(max_length=50)
    input_tokens = models.IntegerField()
    output_tokens = models.IntegerField()
    latency_ms = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
