from django.db import models


class Tool(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()
    function_path = models.CharField(max_length=200)
    parameters_schema = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Agent(models.Model):
    MODEL_CHOICES = [
        ("claude-opus-4-8", "Claude Opus 4.8"),
        ("claude-sonnet-4-6", "Claude Sonnet 4.6"),
        ("claude-haiku-4-5-20251001", "Claude Haiku 4.5"),
    ]

    slug = models.SlugField(max_length=100, unique=True)
    display_name = models.CharField(max_length=100)
    model = models.CharField(max_length=50, choices=MODEL_CHOICES, default="claude-sonnet-4-6")
    system_prompt = models.TextField()
    description = models.TextField(blank=True)
    tools = models.ManyToManyField(Tool, through="AgentTool", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.slug


class AgentTool(models.Model):
    agent = models.ForeignKey(Agent, on_delete=models.CASCADE)
    tool = models.ForeignKey(Tool, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("agent", "tool")
