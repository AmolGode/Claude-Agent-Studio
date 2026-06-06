from django.apps import AppConfig


class ToolsConfig(AppConfig):
    name = "tools"

    def ready(self):
        import tools.builtin.ecommerce_tools  # noqa: F401 — fills _registry on every server start
