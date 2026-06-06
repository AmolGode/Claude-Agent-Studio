import { useState, useEffect } from 'react'
import api from '../api'

function fmt(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function modelChipClass(model) {
  if (model?.includes('opus'))   return 'model-chip model-opus'
  if (model?.includes('sonnet')) return 'model-chip model-sonnet'
  if (model?.includes('haiku'))  return 'model-chip model-haiku'
  return 'model-chip model-other'
}

function modelLabel(model) {
  if (model?.includes('opus'))   return 'Opus 4.8'
  if (model?.includes('sonnet')) return 'Sonnet 4.6'
  if (model?.includes('haiku'))  return 'Haiku 4.5'
  return model ?? '—'
}

function fmtNum(n) {
  if (!n && n !== 0) return '—'
  return n.toLocaleString()
}

export default function UsageSection() {
  const [agents,  setAgents]  = useState([])
  const [filter,  setFilter]  = useState('')
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getAgents().then(setAgents).catch(() => {})
  }, [])

  useEffect(() => {
    loadLogs(filter)
  }, [filter])

  async function loadLogs(slug) {
    setLoading(true)
    try   { setLogs(await api.getUsage(slug)) }
    catch { setLogs([]) }
    finally { setLoading(false) }
  }

  // Summary stats computed from current logs
  const totalRuns    = logs.length
  const totalIn      = logs.reduce((s, l) => s + (l.input_tokens  || 0), 0)
  const totalOut     = logs.reduce((s, l) => s + (l.output_tokens || 0), 0)
  const avgLatencyMs = totalRuns > 0
    ? logs.reduce((s, l) => s + (l.latency_ms || 0), 0) / totalRuns
    : 0

  return (
    <div className="usage-layout">

      {/* ── Filter bar ── */}
      <div className="usage-topbar">
        <span className="usage-filter-label">Agent</span>
        <select
          className="select-input"
          style={{ width: 220 }}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          <option value="">All agents</option>
          {agents.map(a => (
            <option key={a.slug} value={a.slug}>{a.display_name}</option>
          ))}
        </select>
      </div>

      {/* ── Summary cards ── */}
      <div className="usage-stats-row">
        <div className="stat-card">
          <div className="stat-label">Runs</div>
          <div className="stat-value">{fmtNum(totalRuns)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Input Tokens</div>
          <div className="stat-value">{fmtNum(totalIn)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Output Tokens</div>
          <div className="stat-value">{fmtNum(totalOut)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Latency</div>
          <div className="stat-value">
            {totalRuns > 0 ? (avgLatencyMs / 1000).toFixed(1) : '—'}
            {totalRuns > 0 && <span className="stat-unit">s</span>}
          </div>
        </div>
      </div>

      {/* ── Logs table ── */}
      <div className="usage-table-wrap">
        {loading && (
          <div className="usage-empty">Loading…</div>
        )}
        {!loading && logs.length === 0 && (
          <div className="usage-empty">No usage logs yet. Send some messages in the Chatbot tab.</div>
        )}
        {!loading && logs.length > 0 && (
          <table className="usage-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Model</th>
                <th>Input Tokens</th>
                <th>Output Tokens</th>
                <th>Latency</th>
                <th>Session</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td className="usage-mono">{fmt(log.created_at)}</td>
                  <td>
                    <span className={modelChipClass(log.model_used)}>
                      {modelLabel(log.model_used)}
                    </span>
                  </td>
                  <td className="usage-mono">{fmtNum(log.input_tokens)}</td>
                  <td className="usage-mono">{fmtNum(log.output_tokens)}</td>
                  <td className="usage-mono">
                    {log.latency_ms != null ? `${(log.latency_ms / 1000).toFixed(2)}s` : '—'}
                  </td>
                  <td className="usage-mono" title={log.session}>
                    {log.session ? log.session.slice(0, 8) + '…' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
