from django.urls import path, include

urlpatterns = [
    path("api/", include("agents.urls")),
    path("api/", include("chat.urls")),
]
