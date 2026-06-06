import json
import time

import anthropic
from django.conf import settings

from agents.models import Agent
from chat.models import Session, Message, UsageLog
from tools.registry import get_tool_schemas_for, call_tool


def _build_messages(session: Session) -> list[dict]:
    """Reconstruct Anthropic-compatible message list from DB, grouping tool results correctly."""
    messages = []
    pending_tool_results = []

    for msg in session.messages.all():
        if msg.role == "tool_result":
            # Collect — all tool results from one turn go into a single user message
            pending_tool_results.append({
                "type": "tool_result",
                "tool_use_id": msg.tool_use_id,
                "content": msg.content,
            })
        else:
            # Flush collected tool results before the next non-tool message
            if pending_tool_results:
                messages.append({"role": "user", "content": pending_tool_results})
                pending_tool_results = []

            if msg.role == "assistant":
                # Tool-use turns are stored as a JSON array (text + tool_use blocks)
                try:
                    content = json.loads(msg.content)
                    if isinstance(content, list):
                        messages.append({"role": "assistant", "content": content})
                        continue
                except (json.JSONDecodeError, TypeError):
                    pass
                messages.append({"role": "assistant", "content": msg.content})
            else:
                messages.append({"role": msg.role, "content": msg.content})

    # Flush any trailing tool results
    if pending_tool_results:
        messages.append({"role": "user", "content": pending_tool_results})

    return messages


def run_agent(agent: Agent, session: Session, user_message: str) -> str:
    """Run the agentic loop: call Claude, execute tools if needed, repeat until end_turn."""
    Message.objects.create(session=session, role="user", content=user_message)

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    tool_names = list(agent.tools.values_list("name", flat=True))
    tool_schemas = get_tool_schemas_for(tool_names)

    total_input_tokens = 0
    total_output_tokens = 0
    start_time = time.monotonic()
    text = ""

    while True:
        # Re-read from DB each iteration so tool results saved in the previous loop are included.
        messages = _build_messages(session)

        # TODO: tool_choice not supported yet.
        # First call should respect agent.tool_choice (auto/any/specific tool).
        # Subsequent calls (after tool results) must always use "auto".
        kwargs = {
            "model": agent.model,
            "max_tokens": 4096,
            "system": agent.system_prompt,
            "messages": messages,
        }
        if tool_schemas:
            kwargs["tools"] = tool_schemas

        # **kwargs expands to the full Anthropic API call at runtime, e.g.:
        #
        # client.messages.create(
        #     model="claude-sonnet-4-6",        # from agent.model (DB)
        #     max_tokens=4096,
        #     system="You are a helpful...",    # from agent.system_prompt (DB)
        #     messages=[                         # rebuilt from DB each loop
        #         {"role": "user",    "content": "Show me my orders"},
        #         {"role": "assistant","content": [{"type": "tool_use", ...}]},
        #         {"role": "user",    "content": [{"type": "tool_result", ...}]},
        #     ],
        #     tools=[                            # only if agent has tools assigned
        #         {"name": "get_customer_orders", "input_schema": {...}},
        #         {"name": "cancel_order",        "input_schema": {...}},
        #     ],
        # )
        response = client.messages.create(**kwargs)
        total_input_tokens += response.usage.input_tokens
        total_output_tokens += response.usage.output_tokens

        if response.stop_reason == "end_turn":
            text = next(
                (block.text for block in response.content if block.type == "text"), ""
            )
            Message.objects.create(session=session, role="assistant", content=text)
            break

        if response.stop_reason == "tool_use":
            # Save full assistant content as JSON (text + tool_use blocks)
            # so _build_messages can reconstruct the correct API format later
            full_content = []
            for block in response.content:
                if block.type == "text" and block.text:
                    full_content.append({"type": "text", "text": block.text})
                elif block.type == "tool_use":
                    full_content.append({
                        "type": "tool_use",
                        "id": block.id,
                        "name": block.name,
                        "input": block.input,
                    })
            Message.objects.create(
                session=session,
                role="assistant",
                content=json.dumps(full_content),
            )

            # Execute each tool and save its result
            for block in response.content:
                if block.type != "tool_use":
                    continue
                try:
                    result = call_tool(block.name, block.input)
                    result_str = str(result)
                except Exception as e:
                    result_str = f"Error: {e}"

                Message.objects.create(
                    session=session,
                    role="tool_result",
                    content=result_str,
                    tool_use_id=block.id,
                )
            continue

        break  # unexpected stop_reason — exit to avoid infinite loop

    latency_ms = int((time.monotonic() - start_time) * 1000)
    UsageLog.objects.create(
        agent=agent,
        session=session,
        model_used=agent.model,
        input_tokens=total_input_tokens,
        output_tokens=total_output_tokens,
        latency_ms=latency_ms,
    )

    return text
