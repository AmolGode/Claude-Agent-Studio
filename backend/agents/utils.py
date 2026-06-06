import uuid
from agents.models import Agent
from chat.models import Session
from chat.runner import run_agent


class AgentClient:
    def __init__(self, agent: Agent):
        self._agent = agent

    def ask(self, prompt: str, session_id: str = None) -> str:
        if session_id:
            try:
                session = Session.objects.get(id=session_id, agent=self._agent)
            except Session.DoesNotExist:
                session = Session.objects.create(agent=self._agent)
        else:
            session = Session.objects.create(agent=self._agent)

        return run_agent(self._agent, session, prompt)


def get_agent(slug: str) -> AgentClient:
    agent = Agent.objects.get(slug=slug)
    return AgentClient(agent)
