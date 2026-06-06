import { useState, useEffect, useRef } from 'react'
import api from '../api'

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// A single message row in the session transcript
function MessageItem({ msg, index, expanded, onToggle }) {
  // assistant content may be a JSON-encoded array of content blocks (tool_use / text)
  let blocks = null
  if (msg.role === 'assistant') {
    try { blocks = JSON.parse(msg.content) } catch {}
  }

  if (msg.role === 'tool_result') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <button className="tool-result-toggle" onClick={() => onToggle(index)}>
          {expanded ? '▾' : '▸'} tool_result
          {msg.tool_use_id && (
            <span style={{ opacity: 0.5, marginLeft: 8, fontWeight: 400 }}>
              · {msg.tool_use_id.slice(-8)}
            </span>
          )}
        </button>
        {expanded && <pre className="tool-result-content">{msg.content}</pre>}
      </div>
    )
  }

  if (msg.role === 'user') {
    return (
      <div className="msg-wrap msg-wrap-user">
        <div className="msg-author">user</div>
        <div className="msg-bubble msg-bubble-user">{msg.content}</div>
      </div>
    )
  }

  // assistant — may be plain text or structured blocks
  if (blocks && Array.isArray(blocks)) {
    const toolCalls = blocks.filter(b => b.type === 'tool_use')
    const textParts = blocks.filter(b => b.type === 'text')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-start', maxWidth: '72%' }}>
        <div className="msg-author">assistant</div>
        {toolCalls.map((tc, i) => {
          const args = Object.entries(tc.input || {})
            .map(([k, v]) => `${k}: "${v}"`)
            .join(', ')
          return (
            <div key={i} className="tool-badge">▸ {tc.name}({args})</div>
          )
        })}
        {textParts.map((t, i) => (
          <div key={i} className="msg-bubble msg-bubble-assistant">{t.text}</div>
        ))}
      </div>
    )
  }

  return (
    <div className="msg-wrap msg-wrap-assistant">
      <div className="msg-author">assistant</div>
      <div className="msg-bubble msg-bubble-assistant">{msg.content}</div>
    </div>
  )
}

export default function HistorySection() {
  const [agents,      setAgents]      = useState([])
  const [agentSlug,   setAgentSlug]   = useState('')
  const [sessions,    setSessions]    = useState([])
  const [activeId,    setActiveId]    = useState(null)
  const [messages,    setMessages]    = useState([])
  const [expanded,    setExpanded]    = useState(new Set())
  const [loadingSess, setLoadingSess] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    api.getAgents().then(setAgents).catch(() => {})
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function pickAgent(slug) {
    setAgentSlug(slug)
    setActiveId(null)
    setMessages([])
    setExpanded(new Set())
    if (!slug) { setSessions([]); return }
    setLoadingSess(true)
    try   { setSessions(await api.getSessions(slug)) }
    catch { setSessions([]) }
    finally { setLoadingSess(false) }
  }

  async function pickSession(id) {
    setActiveId(id)
    setMessages([])
    setExpanded(new Set())
    setLoadingMsgs(true)
    try {
      const data = await api.getSession(id)
      setMessages(data.messages || [])
    } catch {
      setMessages([])
    } finally {
      setLoadingMsgs(false)
    }
  }

  function toggleExpanded(i) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const activeSession = sessions.find(s => s.id === activeId)

  return (
    <div className="config-layout">

      {/* ── Left: session list ── */}
      <div className="agent-list-pane">
        <div className="pane-header">
          <span className="pane-title">Sessions</span>
        </div>

        <div className="history-agent-pick">
          <select
            className="select-input"
            value={agentSlug}
            onChange={e => pickAgent(e.target.value)}
          >
            <option value="">Select agent…</option>
            {agents.map(a => (
              <option key={a.slug} value={a.slug}>{a.display_name}</option>
            ))}
          </select>
        </div>

        <div className="agent-scroll">
          {!agentSlug && (
            <div className="pane-empty">Pick an agent to view its sessions.</div>
          )}
          {agentSlug && loadingSess && (
            <div className="pane-empty">Loading…</div>
          )}
          {agentSlug && !loadingSess && sessions.length === 0 && (
            <div className="pane-empty">No sessions yet for this agent.</div>
          )}
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => pickSession(s.id)}
              className={`session-btn ${activeId === s.id ? 'active' : ''}`}
            >
              <div className="session-btn-id">{s.id.slice(0, 8)}…</div>
              <div className="session-btn-date">{fmt(s.created_at)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: message transcript ── */}
      <div className="form-pane">
        <div className="pane-header">
          <span className="pane-title">Transcript</span>
          {activeSession && (
            <span className="usage-mono">{activeSession.id.slice(0, 8)}… · {fmt(activeSession.created_at)}</span>
          )}
        </div>

        {!activeId && (
          <div className="hist-placeholder">Select a session to view its messages.</div>
        )}

        {activeId && loadingMsgs && (
          <div className="hist-placeholder">Loading…</div>
        )}

        {activeId && !loadingMsgs && (
          <div className="session-messages">
            {messages.length === 0 && (
              <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>No messages in this session.</div>
            )}
            {messages.map((msg, i) => (
              <MessageItem
                key={i}
                msg={msg}
                index={i}
                expanded={expanded.has(i)}
                onToggle={toggleExpanded}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

    </div>
  )
}
