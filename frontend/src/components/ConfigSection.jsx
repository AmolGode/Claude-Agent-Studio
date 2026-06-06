import { useState, useEffect } from 'react'
import api from '../api'

const MODELS = [
  { value: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'claude-opus-4-8',           label: 'Claude Opus 4.8' },
]

const BLANK = { slug: '', display_name: '', model: 'claude-sonnet-4-6', system_prompt: '', tools: [] }

export default function ConfigSection() {
  const [agents,   setAgents]   = useState([])
  const [tools,    setTools]    = useState([])
  const [selected, setSelected] = useState(null)   // slug of active agent
  const [form,     setForm]     = useState(BLANK)
  const [saving,   setSaving]   = useState(false)
  const [feedback, setFeedback] = useState(null)    // { type: 'success'|'error', msg }

  useEffect(() => {
    loadAgents()
    loadTools()
  }, [])

  function flash(type, msg) {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 3000)
  }

  async function loadAgents() {
    try   { setAgents(await api.getAgents()) }
    catch { flash('error', 'Could not load agents.') }
  }

  async function loadTools() {
    try   { setTools(await api.getTools()) }
    catch {}
  }

  function pickAgent(agent) {
    setSelected(agent.slug)
    setForm({
      slug:          agent.slug,
      display_name:  agent.display_name,
      model:         agent.model,
      system_prompt: agent.system_prompt,
      // normalize: the API may return IDs or objects
      tools: (agent.tools || []).map(t => typeof t === 'object' ? t.id : t),
    })
    setFeedback(null)
  }

  function newAgent() {
    setSelected(null)
    setForm(BLANK)
    setFeedback(null)
  }

  const field = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  function toggleTool(id) {
    setForm(f => ({
      ...f,
      tools: f.tools.includes(id) ? f.tools.filter(t => t !== id) : [...f.tools, id],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (selected) {
        await api.updateAgent(selected, form)
        flash('success', 'Agent updated.')
      } else {
        await api.createAgent(form)
        setSelected(form.slug)
        flash('success', 'Agent created.')
      }
      await loadAgents()
    } catch (err) {
      flash('error', err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete agent "${selected}"?`)) return
    try {
      await api.deleteAgent(selected)
      newAgent()
      await loadAgents()
    } catch {
      flash('error', 'Delete failed.')
    }
  }

  async function handleSyncTools() {
    try {
      await api.syncTools()
      await loadTools()
      flash('success', 'Tools synced from code.')
    } catch {
      flash('error', 'Sync failed.')
    }
  }

  return (
    <div className="config-layout">

      {/* ── Left: agent list ── */}
      <div className="agent-list-pane">
        <div className="pane-header">
          <span className="pane-title">Agents</span>
          <button onClick={newAgent} className="btn-sm btn-sm-ghost">+ New</button>
        </div>
        <div className="agent-scroll">
          {agents.length === 0 && (
            <div className="pane-empty">No agents yet.<br />Hit + New to create one.</div>
          )}
          {agents.map(a => (
            <button
              key={a.slug}
              onClick={() => pickAgent(a)}
              className={`agent-btn ${selected === a.slug ? 'active' : ''}`}
            >
              <div className="agent-btn-name">{a.display_name}</div>
              <div className="agent-btn-slug">{a.slug}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="form-pane">
        <div className="pane-header">
          <span className="pane-title">{selected ? 'Edit Agent' : 'New Agent'}</span>
          {selected && (
            <button onClick={handleDelete} className="btn-sm btn-sm-danger">Delete</button>
          )}
        </div>

        <div className="form-scroll">
          <form onSubmit={handleSubmit}>

            <div className="field">
              <label className="field-label">Slug</label>
              <input
                className="input mono-input"
                value={form.slug}
                onChange={field('slug')}
                disabled={!!selected}
                placeholder="e.g. customer-support"
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Display Name</label>
              <input
                className="input"
                value={form.display_name}
                onChange={field('display_name')}
                placeholder="e.g. Customer Support"
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Model</label>
              <select className="select-input" value={form.model} onChange={field('model')}>
                {MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label">System Prompt</label>
              <textarea
                className="textarea-input"
                value={form.system_prompt}
                onChange={field('system_prompt')}
                placeholder="You are a helpful e-commerce support agent..."
                rows={6}
              />
            </div>

            <div className="field">
              <div className="tools-header-row">
                <label className="field-label" style={{ marginBottom: 0 }}>Tools</label>
                <button type="button" onClick={handleSyncTools} className="btn-sm btn-sm-ghost">
                  ↻ Sync
                </button>
              </div>
              <div className="tools-box" style={{ marginTop: 6 }}>
                {tools.length === 0 && (
                  <div className="tools-empty">No tools registered — click Sync to import from code.</div>
                )}
                {tools.map(t => (
                  <label key={t.id} className="tool-row">
                    <input
                      type="checkbox"
                      className="tool-check"
                      checked={form.tools.includes(t.id)}
                      onChange={() => toggleTool(t.id)}
                    />
                    <div>
                      <div className="tool-name">{t.name}</div>
                      {t.description && <div className="tool-desc">{t.description}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {feedback && (
              <div className={`feedback feedback-${feedback.type}`}>{feedback.msg}</div>
            )}

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : selected ? 'Update Agent' : 'Create Agent'}
            </button>

          </form>
        </div>
      </div>

    </div>
  )
}
