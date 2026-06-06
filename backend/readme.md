# Agent Control Plane — Backend

Django + DRF backend that lets you configure AI agents (model, system prompt, tools) via API and chat with them. Built on the Anthropic SDK with a full agentic tool-use loop.

---

## Stack

- Django 5.0 + Django REST Framework
- PostgreSQL (psycopg2-binary)
- Anthropic Python SDK

---

## Setup

```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# configure .env
cp .env.example .env  # set DB_* and ANTHROPIC_API_KEY

python manage.py migrate
python manage.py seed_ecommerce   # loads demo customers + orders
python manage.py runserver
```

---

## First-run step

After the server is running, sync tool definitions from code into the DB once:

```bash
POST /api/tools/sync/
```

This scans all `@register_tool` functions and upserts them into the `Tool` table so they can be assigned to agents.

---

## API Reference

### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents/` | List all agents |
| POST | `/api/agents/` | Create an agent |
| GET | `/api/agents/<slug>/` | Get agent detail |
| PUT | `/api/agents/<slug>/` | Update agent |
| DELETE | `/api/agents/<slug>/` | Delete agent |

**Create agent payload:**
```json
{
  "slug": "ecommerce-support",
  "display_name": "E-commerce Support",
  "model": "claude-sonnet-4-6",
  "system_prompt": "You are a helpful customer support agent...",
  "tools": [1, 2, 3]
}
```

---

### Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tools/` | List all registered tools |
| POST | `/api/tools/sync/` | Sync `@register_tool` functions into DB |

---

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/<slug>/chat/` | Send a message to an agent |
| GET | `/api/agents/<slug>/sessions/` | List sessions for an agent |
| GET | `/api/sessions/<uuid>/` | Get full session history |
| GET | `/api/usage/` | Usage logs (tokens + latency) |

**Chat payload:**
```json
{
  "message": "Hi, I am alice@example.com. Show me my orders.",
  "session_id": "optional-uuid-for-multi-turn"
}
```

**Response:**
```json
{
  "session_id": "598d7fc7-...",
  "reply": "Here are your orders, Alice! ..."
}
```

Pass `session_id` back on subsequent messages to continue the same conversation.

**Usage log filter:**
```
GET /api/usage/?agent=ecommerce-support
```

---

## How it works

```
POST /api/agents/<slug>/chat/
        │
        ▼
  Load agent from DB
  (model, system_prompt, assigned tools)
        │
        ▼
  run_agent() — agentic loop
  ┌─────────────────────────────────┐
  │  Build message history from DB  │
  │  Call Anthropic API             │
  │                                 │
  │  stop_reason == "tool_use"?     │
  │    → execute tool via registry  │
  │    → save tool_result to DB     │
  │    → loop back                  │
  │                                 │
  │  stop_reason == "end_turn"?     │
  │    → save assistant reply       │
  │    → break                      │
  └─────────────────────────────────┘
        │
        ▼
  Save UsageLog (tokens + latency)
  Return reply text
```

---

## Tool Registry

Tools are plain Python functions decorated with `@register_tool`. The decorator auto-generates the Anthropic JSON schema from type hints and docstring.

```python
@register_tool
def cancel_order(order_id: int) -> str:
    """Cancel a pending order by its ID."""
    ...
```

On server start, `AppConfig.ready()` imports all tool files so the registry is always populated before any request hits.

---

## Demo Data (E-commerce)

Seeded via `python manage.py seed_ecommerce`:

| Customer | Email | Orders |
|----------|-------|--------|
| Alice | alice@example.com | Shipped + Delivered |
| Bob | bob@example.com | Pending |
| Carol | carol@example.com | Delivered + Cancelled |

Available tools: `get_customer_orders`, `get_order_details`, `cancel_order`, `request_refund`, `update_shipping_address`
