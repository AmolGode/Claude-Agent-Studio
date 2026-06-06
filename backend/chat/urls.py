from django.urls import path
from . import views

urlpatterns = [
    path("agents/<slug:slug>/chat/", views.ChatView.as_view()),
    path("agents/<slug:slug>/sessions/", views.AgentSessionListView.as_view()),
    path("sessions/<uuid:session_id>/", views.SessionDetailView.as_view()),
    path("usage/", views.UsageLogListView.as_view()),
]
