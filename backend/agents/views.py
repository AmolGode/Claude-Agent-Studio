from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Agent, Tool
from .serializers import AgentSerializer, AgentDetailSerializer, ToolSerializer
from tools.registry import sync_tools_to_db


class AgentListView(APIView):
    def get(self, request):
        agents = Agent.objects.prefetch_related("tools").all()
        return Response(AgentDetailSerializer(agents, many=True).data)

    def post(self, request):
        serializer = AgentSerializer(data=request.data)
        if serializer.is_valid():
            agent = serializer.save()
            return Response(AgentDetailSerializer(agent).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AgentDetailView(APIView):
    def _get_agent(self, slug):
        try:
            return Agent.objects.prefetch_related("tools").get(slug=slug)
        except Agent.DoesNotExist:
            return None

    def get(self, request, slug):
        agent = self._get_agent(slug)
        if not agent:
            return Response({"error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(AgentDetailSerializer(agent).data)

    def put(self, request, slug):
        agent = self._get_agent(slug)
        if not agent:
            return Response({"error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = AgentSerializer(agent, data=request.data, partial=True)
        if serializer.is_valid():
            agent = serializer.save()
            return Response(AgentDetailSerializer(agent).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug):
        agent = self._get_agent(slug)
        if not agent:
            return Response({"error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)
        agent.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ToolListView(APIView):
    def get(self, request):
        tools = Tool.objects.filter(is_active=True)
        return Response(ToolSerializer(tools, many=True).data)


class ToolSyncView(APIView):
    def post(self, request):
        synced = sync_tools_to_db()
        return Response({"synced": synced})
