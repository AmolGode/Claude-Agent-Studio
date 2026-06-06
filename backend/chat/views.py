from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from agents.models import Agent
from .models import Session, UsageLog
from .serializers import SessionSerializer, UsageLogSerializer
from .runner import run_agent


class ChatView(APIView):
    def post(self, request, slug):
        try:
            agent = Agent.objects.get(slug=slug)
        except Agent.DoesNotExist:
            return Response({"error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)

        user_message = request.data.get("message", "").strip()
        if not user_message:
            return Response({"error": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

        session_id = request.data.get("session_id")
        if session_id:
            try:
                session = Session.objects.get(id=session_id, agent=agent)
            except Session.DoesNotExist:
                return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            session = Session.objects.create(agent=agent)

        reply = run_agent(agent, session, user_message)
        return Response({"session_id": str(session.id), "reply": reply})


class AgentSessionListView(APIView):
    def get(self, request, slug):
        try:
            agent = Agent.objects.get(slug=slug)
        except Agent.DoesNotExist:
            return Response({"error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)

        sessions = agent.sessions.all().order_by("-created_at")
        return Response(SessionSerializer(sessions, many=True).data)


class SessionDetailView(APIView):
    def get(self, request, session_id):
        try:
            session = Session.objects.prefetch_related("messages").get(id=session_id)
        except Session.DoesNotExist:
            return Response({"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(SessionSerializer(session).data)


class UsageLogListView(APIView):
    def get(self, request):
        slug = request.query_params.get("agent")
        logs = UsageLog.objects.select_related("agent", "session").order_by("-created_at")
        if slug:
            logs = logs.filter(agent__slug=slug)
        return Response(UsageLogSerializer(logs, many=True).data)
