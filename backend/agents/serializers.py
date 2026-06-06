from rest_framework import serializers
from .models import Agent, Tool


class ToolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tool
        fields = ["id", "name", "description", "function_path", "parameters_schema", "is_active"]


class AgentSerializer(serializers.ModelSerializer):
    tools = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Tool.objects.all(), required=False
    )

    class Meta:
        model = Agent
        fields = [
            "id", "slug", "display_name", "model", "system_prompt",
            "description", "tools", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def create(self, validated_data):
        tools = validated_data.pop("tools", [])
        agent = Agent.objects.create(**validated_data)
        agent.tools.set(tools)
        return agent

    def update(self, instance, validated_data):
        tools = validated_data.pop("tools", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tools is not None:
            instance.tools.set(tools)
        return instance


class AgentDetailSerializer(AgentSerializer):
    tools = ToolSerializer(many=True, read_only=True)
