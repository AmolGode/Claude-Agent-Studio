from django.urls import path
from . import views

urlpatterns = [
    path("agents/", views.AgentListView.as_view()),
    path("agents/<slug:slug>/", views.AgentDetailView.as_view()),
    path("tools/", views.ToolListView.as_view()),
    path("tools/sync/", views.ToolSyncView.as_view()),
]
