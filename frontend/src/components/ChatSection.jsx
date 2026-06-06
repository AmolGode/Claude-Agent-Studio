import { useState, useEffect, useRef } from 'react'
import api from '../api'

export default function ChatSection() {
  const [agents,    setAgents]    = useState([])
  const [agentSlug, setAgentSlug] = useState('')
  const [email,     setEmail]     = useState('')
  const [started,   setStarted]   = useState(false)
  const [messages,  setMessages]  = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    api.getAgents().then(setAgents).catch(() => {})
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function startChat(e) {
    e.preventDefault()
    setMessages([])
    setSessionId(null)
    setInput('')
    setStarted(true)
  }

  function resetChat() {
    setStarted(false)
    setMessages([])
    setSessionId(null)
    setInput('')
  }

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    // On the very first turn, prepend the user's email so the agent can look them up
    const fullMessage = sessionId === null ? `I am ${email}. ${text}` : text
    setMessages(m => [...m, { role: 'user', text: fullMessage }])
    setLoading(true)

    try {
      const res = await api.chat(agentSlug, {
        message: fullMessage,
        ...(sessionId && { session_id: sessionId }),
      })
      setSessionId(res.session_id)
      setMessages(m => [...m, { role: 'assistant', text: res.reply }])
    } catch {
      setMessages(m => [...m, {
        role: 'error',
        text: 'Failed to get a response. Check that the backend is running.',
      }])
    } finally {
      setLoading(false)
    }
  }

  const agentName = agents.find(a => a.slug === agentSlug)?.display_name ?? agentSlug

  /* ── Start screen ── */
  if (!started) {
    return (
      <div className="chat-start-wrap">
        <div className="chat-card">
          <h2>Start a Chat</h2>
          <p className="chat-card-sub">Select an agent and identify yourself to begin.</p>

          <form onSubmit={startChat}>
            <div className="field">
              <label className="field-label">Agent</label>
              <select
                className="select-input"
                value={agentSlug}
                onChange={e => setAgentSlug(e.target.value)}
                required
              >
                <option value="">Select agent…</option>
                {agents.map(a => (
                  <option key={a.slug} value={a.slug}>{a.display_name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label">Your Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="alice@example.com"
                required
              />
              <div className="hint-text">
                Demo accounts: alice@example.com<br />
                bob@example.com · carol@example.com
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 4 }}>
              Start Chat →
            </button>
          </form>
        </div>
      </div>
    )
  }

  /* ── Active chat ── */
  return (
    <div className="chat-layout">

      <div className="chat-topbar">
        <div className="chat-info">
          <span className="chat-agent-name">{agentName}</span>
          <span className="dot-sep">·</span>
          <span className="chat-user-email">{email}</span>
        </div>
        <button onClick={resetChat} className="btn-sm btn-sm-ghost">New Chat</button>
      </div>

      <div className="messages-area">
        <div className="chat-notice">
          Your email is included in the first message so the agent can identify you.
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={`msg-wrap msg-wrap-${msg.role}`}>
            <div className="msg-author">
              {msg.role === 'user' ? email : msg.role === 'assistant' ? agentSlug : 'system'}
            </div>
            <div className={`msg-bubble msg-bubble-${msg.role}`}>{msg.text}</div>
          </div>
        ))}

        {loading && (
          <div className="msg-wrap msg-wrap-assistant">
            <div className="msg-author">{agentSlug}</div>
            <div className="typing-indicator">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="chat-input-row">
        <input
          className="chat-text-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={loading}
          autoFocus
        />
        <button type="submit" className="btn-send" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>

    </div>
  )
}
