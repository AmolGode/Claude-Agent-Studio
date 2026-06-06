import { useState } from 'react'
import ConfigSection from './components/ConfigSection'
import ChatSection from './components/ChatSection'
import HistorySection from './components/HistorySection'
import UsageSection from './components/UsageSection'

export default function App() {
  const [tab, setTab] = useState('config')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-tag">Agent Control</div>
          <div className="brand-name">Plane</div>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${tab === 'config'  ? 'active' : ''}`} onClick={() => setTab('config')}>
            <span className="nav-icon">⚙</span>Configuration
          </button>
          <button className={`nav-btn ${tab === 'chat'    ? 'active' : ''}`} onClick={() => setTab('chat')}>
            <span className="nav-icon">◎</span>Chatbot
          </button>
          <button className={`nav-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            <span className="nav-icon">◫</span>History
          </button>
          <button className={`nav-btn ${tab === 'usage'   ? 'active' : ''}`} onClick={() => setTab('usage')}>
            <span className="nav-icon">≋</span>Usage
          </button>
        </nav>
        <div className="sidebar-footer">v1.0 · ACP</div>
      </aside>
      <main className="main-content">
        {tab === 'config'  && <ConfigSection />}
        {tab === 'chat'    && <ChatSection />}
        {tab === 'history' && <HistorySection />}
        {tab === 'usage'   && <UsageSection />}
      </main>
    </div>
  )
}
