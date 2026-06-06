import inspect
from typing import get_type_hints

_registry: dict[str, dict] = {}

_PYTHON_TO_JSON_TYPE = {
    str: "string",
    int: "integer",
    float: "number",
    bool: "boolean",
    list: "array",
    dict: "object",
}


def _build_schema(fn) -> dict:
    """Build an Anthropic-compatible JSON schema from a function's type hints and signature."""
    hints = get_type_hints(fn)
    hints.pop("return", None)
    sig = inspect.signature(fn)

    properties = {}
    required = []

    for param_name, param in sig.parameters.items():
        python_type = hints.get(param_name, str)
        json_type = _PYTHON_TO_JSON_TYPE.get(python_type, "string")
        properties[param_name] = {"type": json_type}
        if param.default is inspect.Parameter.empty:
            required.append(param_name)

    return {
        "type": "object",
        "properties": properties,
        "required": required,
    }


def register_tool(fn):
    """Decorator that auto-registers a function into the tool registry at import time."""
    schema = _build_schema(fn)
    _registry[fn.__name__] = {
        "fn": fn,
        "description": (fn.__doc__ or "").strip(),
        "function_path": f"{fn.__module__}.{fn.__qualname__}",
        "parameters_schema": schema,
    }
    return fn


def get_all_tool_schemas() -> list[dict]:
    """Return Anthropic-compatible schemas for every registered tool."""
    return [
        {
            "name": name,
            "description": meta["description"],
            "input_schema": meta["parameters_schema"],
        }
        for name, meta in _registry.items()
    ]


def get_tool_schemas_for(tool_names: list[str]) -> list[dict]:
    """Return Anthropic-compatible schemas for a specific subset of tools by name."""
    return [
        {
            "name": name,
            "description": _registry[name]["description"],
            "input_schema": _registry[name]["parameters_schema"],
        }
        for name in tool_names
        if name in _registry
    ]


def call_tool(name: str, inputs: dict):
    """Look up a tool by name and execute it with the given inputs."""
    # TODO: pre-hook support not implemented yet.
    # Approach: add _tool_pre_hooks: dict[str, list] = {} at module level.
    # Use @tool_pre_hook("cancel_order") decorator to register per-tool hooks.
    # Run hooks here before calling the tool — raise ValueError to block execution.
    # Global hooks (logging, auth) go in a separate _pre_hooks list, also run here.
    if name not in _registry:
        raise ValueError(f"Tool '{name}' not registered")
    return _registry[name]["fn"](**inputs)


def sync_tools_to_db() -> list[str]:
    """Upsert all registered tools into the DB. Called by /api/tools/sync/."""
    import importlib
    importlib.import_module("tools.builtin.ecommerce_tools")

    from agents.models import Tool

    synced = []
    for name, meta in _registry.items():
        Tool.objects.update_or_create(
            name=name,
            defaults={
                "description": meta["description"],
                "function_path": meta["function_path"],
                "parameters_schema": meta["parameters_schema"],
                "is_active": True,
            },
        )
        synced.append(name)
    return synced
