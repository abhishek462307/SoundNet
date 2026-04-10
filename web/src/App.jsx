import { useEffect, useMemo, useState } from 'react'
import {
  acknowledgeMessage,
  apiRequest,
  loadAgents,
  loadAuditLogs,
  loadCapabilities,
  loadCurrentUser,
  loadDashboardData,
  loadDeliveryQueue,
  loadExecutionLogs,
  loadInbox,
  loadMcpServers,
  loadSchedulerStatus,
  loadTenantPolicy,
  loadThread,
  loadUsers,
  processDeliveryQueue,
  registerAgent,
  registerCapability,
  registerUser,
  revokeUserToken,
  rotateUserToken,
  runRepairBackfill,
  runServerAction,
  sendMessage,
  updateTenantPolicy,
} from './lib/api'
import './App.css'

const defaultConfig = {
  name: 'Local Dev',
  baseUrl: 'http://127.0.0.1:3001',
  apiKey: '',
  adminKey: '',
  userToken: '',
  tenantId: 'default',
}

const navItems = [
  { id: 'overview', label: 'Overview' },
  { id: 'capabilities', label: 'Capabilities' },
  { id: 'servers', label: 'MCP Servers' },
  { id: 'policy', label: 'Tenant Policy' },
  { id: 'agents', label: 'Agents & Messages' },
  { id: 'admin', label: 'Users & Ops' },
  { id: 'next', label: 'Next Phase' },
]

function App() {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('soundnet-dashboard-config')
    return saved ? JSON.parse(saved) : defaultConfig
  })
  const [savedEnvironments, setSavedEnvironments] = useState(() => {
    const saved = localStorage.getItem('soundnet-dashboard-environments')
    return saved ? JSON.parse(saved) : []
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [capabilities, setCapabilities] = useState([])
  const [executionLogs, setExecutionLogs] = useState([])
  const [servers, setServers] = useState([])
  const [tenantPolicy, setTenantPolicy] = useState(null)
  const [agents, setAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [inbox, setInbox] = useState([])
  const [selectedThreadId, setSelectedThreadId] = useState('')
  const [threadMessages, setThreadMessages] = useState([])
  const [deliveryQueue, setDeliveryQueue] = useState([])
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [schedulerStatus, setSchedulerStatus] = useState(null)
  const [preview, setPreview] = useState(null)
  const [actionState, setActionState] = useState('')

  useEffect(() => {
    localStorage.setItem('soundnet-dashboard-config', JSON.stringify(config))
  }, [config])

  useEffect(() => {
    localStorage.setItem('soundnet-dashboard-environments', JSON.stringify(savedEnvironments))
  }, [savedEnvironments])

  const configReady = useMemo(() => Boolean(config.baseUrl), [config.baseUrl])

  async function refreshAll() {
    if (!configReady) return
    setLoading(true)
    setError('')
    try {
      const [
        dashboardData,
        capabilityData,
        executionLogData,
        serverData,
        policyData,
        agentData,
        queueData,
        meData,
        userData,
        auditData,
        schedulerData,
      ] = await Promise.all([
        loadDashboardData(config),
        loadCapabilities(config),
        loadExecutionLogs(config),
        loadMcpServers(config),
        loadTenantPolicy(config),
        loadAgents(config),
        loadDeliveryQueue(config),
        loadCurrentUser(config).catch(() => null),
        loadUsers(config).catch(() => []),
        loadAuditLogs(config).catch(() => []),
        loadSchedulerStatus(config).catch(() => null),
      ])
      setDashboard(dashboardData)
      setCapabilities(capabilityData)
      setExecutionLogs(executionLogData)
      setServers(serverData)
      setTenantPolicy(policyData)
      setAgents(agentData)
      setDeliveryQueue(queueData)
      setCurrentUser(meData)
      setUsers(userData)
      setAuditLogs(auditData)
      setSchedulerStatus(schedulerData)

      if (!selectedAgentId && agentData[0]?.id) {
        setSelectedAgentId(agentData[0].id)
      }
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshAll()
  }, [])

  useEffect(() => {
    if (!selectedAgentId) return
    loadInbox(config, selectedAgentId)
      .then((messages) => {
        setInbox(messages)
        if (!selectedThreadId && messages[0]?.thread_id) {
          setSelectedThreadId(messages[0].thread_id)
        }
      })
      .catch((nextError) => setError(nextError.message))
  }, [selectedAgentId])

  useEffect(() => {
    if (!selectedThreadId) return
    loadThread(config, selectedThreadId)
      .then(setThreadMessages)
      .catch((nextError) => setError(nextError.message))
  }, [selectedThreadId])

  function saveEnvironment() {
    const nextEntry = {
      ...config,
      name: config.name || `Environment ${savedEnvironments.length + 1}`,
    }

    setSavedEnvironments((current) => {
      const remaining = current.filter((item) => item.name !== nextEntry.name)
      return [...remaining, nextEntry]
    })
  }

  function loadEnvironment(name) {
    const selected = savedEnvironments.find((item) => item.name === name)
    if (selected) {
      setConfig(selected)
    }
  }

  function deleteEnvironment(name) {
    setSavedEnvironments((current) => current.filter((item) => item.name !== name))
  }

  async function handlePreview(capability) {
    setError('')
    try {
      const result = await apiRequest({
        ...config,
        path: '/execute/preview',
        method: 'POST',
        body: {
          capability_id: capability.id,
          payload: {},
        },
      })
      setPreview({ capability, result })
    } catch (nextError) {
      setError(nextError.message)
    }
  }

  async function handleRegisterCapability(payload) {
    setError('')
    setActionState('capability:register')
    try {
      await registerCapability(config, payload)
      await refreshAll()
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleRepairBackfill() {
    setError('')
    setActionState('repair:backfill')
    try {
      await runRepairBackfill(config)
      await refreshAll()
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleServerAction(serverId, action, body) {
    setError('')
    setActionState(`${action}:${serverId}`)
    try {
      await runServerAction(config, serverId, action, body)
      await refreshAll()
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handlePolicySave(nextPolicy) {
    setError('')
    setActionState('policy:save')
    try {
      const saved = await updateTenantPolicy(config, nextPolicy)
      setTenantPolicy(saved)
      await refreshAll()
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleRegisterAgent(payload) {
    setError('')
    setActionState('agent:register')
    try {
      await registerAgent(config, payload)
      await refreshAll()
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleSendMessage(payload) {
    setError('')
    setActionState('message:send')
    try {
      const message = await sendMessage(config, payload)
      setSelectedThreadId(message.thread_id)
      await refreshAll()
      if (payload.to_agent_id) {
        const nextInbox = await loadInbox(config, payload.to_agent_id)
        setInbox(nextInbox)
      }
      const nextThread = await loadThread(config, message.thread_id)
      setThreadMessages(nextThread)
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleAcknowledge(messageId) {
    setError('')
    setActionState(`ack:${messageId}`)
    try {
      await acknowledgeMessage(config, messageId)
      if (selectedAgentId) {
        setInbox(await loadInbox(config, selectedAgentId))
      }
      if (selectedThreadId) {
        setThreadMessages(await loadThread(config, selectedThreadId))
      }
      setDeliveryQueue(await loadDeliveryQueue(config))
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleProcessQueue() {
    setError('')
    setActionState('queue:process')
    try {
      await processDeliveryQueue(config)
      setDeliveryQueue(await loadDeliveryQueue(config))
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleRegisterUser(payload) {
    setError('')
    setActionState('user:register')
    try {
      const user = await registerUser(config, payload)
      if (user.api_token) {
        setConfig((current) => ({ ...current, userToken: user.api_token }))
      }
      await refreshAll()
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleRotateUser(userId) {
    setError('')
    setActionState(`user:rotate:${userId}`)
    try {
      const rotated = await rotateUserToken(config, userId)
      if (rotated.api_token && currentUser?.id === userId) {
        setConfig((current) => ({ ...current, userToken: rotated.api_token }))
      }
      await refreshAll()
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  async function handleRevokeUser(userId) {
    setError('')
    setActionState(`user:revoke:${userId}`)
    try {
      await revokeUserToken(config, userId)
      await refreshAll()
    } catch (nextError) {
      setError(nextError.message)
    } finally {
      setActionState('')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Sound Net</p>
          <h1>Operator Console</h1>
          <p className="muted">Control plane for capabilities, MCP servers, analytics, and policy-aware operations.</p>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={item.id === activeTab ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section className="config-panel">
          <h2>Connection</h2>
          <label>
            Environment name
            <input value={config.name} onChange={(event) => setConfig({ ...config, name: event.target.value })} placeholder="Local Dev" />
          </label>
          <label>
            Base URL
            <input value={config.baseUrl} onChange={(event) => setConfig({ ...config, baseUrl: event.target.value })} placeholder="https://sound-net.onrender.com" />
          </label>
          <label>
            API Key
            <input value={config.apiKey} onChange={(event) => setConfig({ ...config, apiKey: event.target.value })} placeholder="x-api-key" />
          </label>
          <label>
            Admin Key
            <input value={config.adminKey} onChange={(event) => setConfig({ ...config, adminKey: event.target.value })} placeholder="x-admin-key" />
          </label>
          <label>
            User Token
            <input value={config.userToken} onChange={(event) => setConfig({ ...config, userToken: event.target.value })} placeholder="x-user-token" />
          </label>
          <label>
            Tenant
            <input value={config.tenantId} onChange={(event) => setConfig({ ...config, tenantId: event.target.value })} placeholder="default" />
          </label>
          <div className="action-row">
            <button className="primary-button" onClick={refreshAll} disabled={loading || !configReady}>
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>
            <button className="secondary-button" onClick={saveEnvironment}>Save preset</button>
          </div>
          <div className="preset-list">
            {savedEnvironments.map((environment) => (
              <div key={environment.name} className="preset-row">
                <button className="nav-item" onClick={() => loadEnvironment(environment.name)}>{environment.name}</button>
                <button className="secondary-button" onClick={() => deleteEnvironment(environment.name)}>Delete</button>
              </div>
            ))}
            {!savedEnvironments.length ? <p className="tiny">No saved presets yet.</p> : null}
          </div>
          <p className="tiny">Uses `x-api-key`, `x-admin-key`, `x-user-token`, and `x-tenant-id` headers against the live Sound Net API.</p>
        </section>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phase 5</p>
            <h2>Capability registration and environment presets</h2>
          </div>
          <div className="status-row">
            <span className="status-pill">API-first</span>
            <span className="status-pill">Policy-aware</span>
            <span className="status-pill">Tenant-ready</span>
          </div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        {activeTab === 'overview' ? <Overview dashboard={dashboard} /> : null}
        {activeTab === 'capabilities' ? (
          <Capabilities
            capabilities={capabilities}
            executionLogs={executionLogs}
            onPreview={handlePreview}
            onRegisterCapability={handleRegisterCapability}
            onRepairBackfill={handleRepairBackfill}
            preview={preview}
            actionState={actionState}
          />
        ) : null}
        {activeTab === 'servers' ? <Servers servers={servers} dashboard={dashboard} onAction={handleServerAction} actionState={actionState} /> : null}
        {activeTab === 'policy' ? <PolicyEditor tenantPolicy={tenantPolicy} onSave={handlePolicySave} actionState={actionState} /> : null}
        {activeTab === 'agents' ? (
          <AgentsAndMessages
            agents={agents}
            inbox={inbox}
            selectedAgentId={selectedAgentId}
            selectedThreadId={selectedThreadId}
            threadMessages={threadMessages}
            deliveryQueue={deliveryQueue}
            actionState={actionState}
            onSelectAgent={setSelectedAgentId}
            onSelectThread={setSelectedThreadId}
            onRegisterAgent={handleRegisterAgent}
            onSendMessage={handleSendMessage}
            onAcknowledge={handleAcknowledge}
            onProcessQueue={handleProcessQueue}
          />
        ) : null}
        {activeTab === 'admin' ? (
          <UsersAndOps
            currentUser={currentUser}
            users={users}
            auditLogs={auditLogs}
            schedulerStatus={schedulerStatus}
            actionState={actionState}
            onRegisterUser={handleRegisterUser}
            onRotateUser={handleRotateUser}
            onRevokeUser={handleRevokeUser}
          />
        ) : null}
        {activeTab === 'next' ? <NextPhase /> : null}
      </main>
    </div>
  )
}

function Overview({ dashboard }) {
  const cards = [
    { label: 'Health', value: dashboard?.health?.status || 'unknown' },
    { label: 'Readiness', value: dashboard?.ready?.status || 'unknown' },
    { label: 'Capabilities', value: dashboard?.summary?.total_capabilities ?? '—' },
    { label: 'Executions', value: dashboard?.summary?.total_executions ?? '—' },
    { label: 'Queries', value: dashboard?.summary?.total_queries ?? '—' },
    { label: 'Servers', value: dashboard?.summary?.total_servers ?? '—' },
  ]

  return (
    <section className="panel-stack">
      <div className="card-grid">
        {cards.map((card) => (
          <article key={card.label} className="metric-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="two-column">
        <section className="panel">
          <h3>Top tools</h3>
          <ul className="list">
            {(dashboard?.topTools || []).map((item) => (
              <li key={item.capability_id || item.name}>
                <span>{item.name || item.capability_id}</span>
                <strong>{item.usage_count ?? item.count ?? 0}</strong>
              </li>
            ))}
            {!(dashboard?.topTools || []).length ? <li className="empty">No tool analytics yet.</li> : null}
          </ul>
        </section>

        <section className="panel">
          <h3>Policy analytics</h3>
          <div className="policy-grid">
            <article>
              <span>Spend 24h</span>
              <strong>${Number(dashboard?.policy?.rolling_24h_spend_usd || 0).toFixed(2)}</strong>
            </article>
            <article>
              <span>Spend 7d</span>
              <strong>${Number(dashboard?.policy?.rolling_7d_spend_usd || 0).toFixed(2)}</strong>
            </article>
          </div>
          <h4>Mode usage</h4>
          <ul className="list compact">
            {Object.entries(dashboard?.policy?.execution_mode_counts || {}).map(([mode, count]) => (
              <li key={mode}>
                <span>{mode}</span>
                <strong>{count}</strong>
              </li>
            ))}
            {!Object.keys(dashboard?.policy?.execution_mode_counts || {}).length ? <li className="empty">No policy activity yet.</li> : null}
          </ul>
        </section>
      </div>
    </section>
  )
}

function Capabilities({ capabilities, executionLogs, onPreview, onRegisterCapability, onRepairBackfill, preview, actionState }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    endpoint: '',
    method: 'POST',
    auth_type: 'none',
    tags: 'custom',
    provider: 'custom',
    category: 'utility',
    cost_class: 'free',
    risk_level: 'low',
    execution_mode_default: 'full_auto',
  })

  function submit(event) {
    event.preventDefault()
    onRegisterCapability({
      ...form,
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
      tags: form.tags.split(',').map((value) => value.trim()).filter(Boolean),
    })
    setForm({
      name: '',
      description: '',
      endpoint: '',
      method: 'POST',
      auth_type: 'none',
      tags: 'custom',
      provider: 'custom',
      category: 'utility',
      cost_class: 'free',
      risk_level: 'low',
      execution_mode_default: 'full_auto',
    })
  }

  return (
    <section className="panel-stack">
      <div className="two-column">
        <section className="panel">
          <h3>Register capability</h3>
          <form className="policy-form" onSubmit={submit}>
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Description
              <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <label>
              Endpoint
              <input value={form.endpoint} onChange={(event) => setForm({ ...form, endpoint: event.target.value })} placeholder="https://tool.example.com/run" />
            </label>
            <label>
              Tags
              <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="search, custom" />
            </label>
            <div className="two-column compact-grid">
              <label>
                Method
                <select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </label>
              <label>
                Auth
                <select value={form.auth_type} onChange={(event) => setForm({ ...form, auth_type: event.target.value })}>
                  <option value="none">none</option>
                  <option value="api_key">api_key</option>
                </select>
              </label>
            </div>
            <div className="two-column compact-grid">
              <label>
                Cost
                <select value={form.cost_class} onChange={(event) => setForm({ ...form, cost_class: event.target.value })}>
                  <option value="free">free</option>
                  <option value="metered">metered</option>
                  <option value="paid">paid</option>
                </select>
              </label>
              <label>
                Risk
                <select value={form.risk_level} onChange={(event) => setForm({ ...form, risk_level: event.target.value })}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
            </div>
            <label>
              Default mode
              <select value={form.execution_mode_default} onChange={(event) => setForm({ ...form, execution_mode_default: event.target.value })}>
                <option value="full_auto">full_auto</option>
                <option value="bounded_auto">bounded_auto</option>
                <option value="manual">manual</option>
              </select>
            </label>
            <div className="action-row">
              <button className="primary-button" type="submit" disabled={actionState === 'capability:register'}>
                {actionState === 'capability:register' ? 'Creating…' : 'Create capability'}
              </button>
              <button className="secondary-button" type="button" disabled={actionState === 'repair:backfill'} onClick={onRepairBackfill}>
                {actionState === 'repair:backfill' ? 'Repairing…' : 'Run backfill repair'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h3>Policy preview</h3>
          {preview ? (
            <pre className="json-box">{JSON.stringify(preview.result, null, 2)}</pre>
          ) : (
            <p className="muted">Select a capability below and click Preview to inspect the current execution decision.</p>
          )}
        </section>
      </div>

      <section className="panel">
        <h3>Capabilities</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Provider</th>
                <th>Risk</th>
                <th>Cost</th>
                <th>Mode</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {capabilities.map((capability) => (
                <tr key={capability.id}>
                  <td>
                    <strong>{capability.name}</strong>
                    <div className="table-subtext">{capability.description || 'No description'}</div>
                  </td>
                  <td>{capability.provider || '—'}</td>
                  <td>{capability.risk_level || '—'}</td>
                  <td>{capability.cost_class || '—'}</td>
                  <td>{capability.execution_mode_default || '—'}</td>
                  <td>
                    <button className="secondary-button" onClick={() => onPreview(capability)}>Preview</button>
                  </td>
                </tr>
              ))}
              {!capabilities.length ? (
                <tr>
                  <td colSpan="6" className="empty-row">No capabilities found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Recent execution logs</h3>
        <pre className="json-box">{JSON.stringify(executionLogs.slice(0, 20), null, 2)}</pre>
      </section>
    </section>
  )
}

function Servers({ servers, dashboard, onAction, actionState }) {
  return (
    <section className="panel-stack">
      <section className="panel">
        <h3>MCP servers</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Trusted</th>
                <th>Public</th>
                <th>Endpoint</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((server) => {
                const busy = actionState.endsWith(`:${server.id}`)
                return (
                  <tr key={server.id}>
                    <td>{server.name}</td>
                    <td>{server.status}</td>
                    <td>{server.is_trusted ? 'Yes' : 'No'}</td>
                    <td>{server.is_public ? 'Yes' : 'No'}</td>
                    <td className="endpoint-cell">{server.endpoint}</td>
                    <td>
                      <div className="action-row">
                        <button className="secondary-button" disabled={busy} onClick={() => onAction(server.id, 'health')}>Health</button>
                        <button className="secondary-button" disabled={busy} onClick={() => onAction(server.id, 'sync')}>Sync</button>
                        <button className="secondary-button" disabled={busy} onClick={() => onAction(server.id, 'trust', { is_trusted: !server.is_trusted })}>
                          {server.is_trusted ? 'Untrust' : 'Trust'}
                        </button>
                        <button className="secondary-button" disabled={busy} onClick={() => onAction(server.id, server.status === 'disabled' ? 'enable' : 'disable')}>
                          {server.status === 'disabled' ? 'Enable' : 'Disable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!servers.length ? (
                <tr>
                  <td colSpan="6" className="empty-row">No MCP servers registered.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Server analytics</h3>
        <pre className="json-box">{JSON.stringify(dashboard?.servers || [], null, 2)}</pre>
      </section>
    </section>
  )
}

function PolicyEditor({ tenantPolicy, onSave, actionState }) {
  const [form, setForm] = useState({
    max_execution_mode: 'full_auto',
    rolling_budget_limit_usd: '',
    safest_selection_default: false,
    blocked_risk_levels: '',
  })

  useEffect(() => {
    if (!tenantPolicy) return
    setForm({
      max_execution_mode: tenantPolicy.max_execution_mode || 'full_auto',
      rolling_budget_limit_usd: tenantPolicy.rolling_budget_limit_usd ?? '',
      safest_selection_default: Boolean(tenantPolicy.safest_selection_default),
      blocked_risk_levels: Array.isArray(tenantPolicy.blocked_risk_levels)
        ? tenantPolicy.blocked_risk_levels.join(', ')
        : '',
    })
  }, [tenantPolicy])

  function submit(event) {
    event.preventDefault()
    onSave({
      max_execution_mode: form.max_execution_mode,
      rolling_budget_limit_usd: form.rolling_budget_limit_usd === '' ? null : Number(form.rolling_budget_limit_usd),
      safest_selection_default: form.safest_selection_default,
      blocked_risk_levels: form.blocked_risk_levels
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    })
  }

  return (
    <section className="panel-stack">
      <section className="panel">
        <h3>Tenant policy editor</h3>
        <form className="policy-form" onSubmit={submit}>
          <label>
            Max execution mode
            <select value={form.max_execution_mode} onChange={(event) => setForm({ ...form, max_execution_mode: event.target.value })}>
              <option value="full_auto">full_auto</option>
              <option value="bounded_auto">bounded_auto</option>
              <option value="manual">manual</option>
            </select>
          </label>

          <label>
            Rolling budget limit USD
            <input type="number" min="0" step="0.01" value={form.rolling_budget_limit_usd} onChange={(event) => setForm({ ...form, rolling_budget_limit_usd: event.target.value })} />
          </label>

          <label>
            Blocked risk levels
            <input value={form.blocked_risk_levels} onChange={(event) => setForm({ ...form, blocked_risk_levels: event.target.value })} placeholder="high, critical" />
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={form.safest_selection_default} onChange={(event) => setForm({ ...form, safest_selection_default: event.target.checked })} />
            Prefer safest tool by default
          </label>

          <button className="primary-button" type="submit" disabled={actionState === 'policy:save'}>
            {actionState === 'policy:save' ? 'Saving…' : 'Save policy'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Current policy</h3>
        <pre className="json-box">{JSON.stringify(tenantPolicy || {}, null, 2)}</pre>
      </section>
    </section>
  )
}

function AgentsAndMessages({
  agents,
  inbox,
  selectedAgentId,
  selectedThreadId,
  threadMessages,
  deliveryQueue,
  actionState,
  onSelectAgent,
  onSelectThread,
  onRegisterAgent,
  onSendMessage,
  onAcknowledge,
  onProcessQueue,
}) {
  const [agentForm, setAgentForm] = useState({
    name: '',
    description: '',
    endpoint: '',
    protocol: 'http',
  })
  const [messageForm, setMessageForm] = useState({
    from_agent_id: '',
    to_agent_id: '',
    subject: '',
    body: '',
  })

  useEffect(() => {
    if (!agents.length) return
    setMessageForm((current) => ({
      ...current,
      from_agent_id: current.from_agent_id || agents[0].id,
      to_agent_id: current.to_agent_id || agents[Math.min(1, agents.length - 1)].id,
    }))
  }, [agents])

  function submitAgent(event) {
    event.preventDefault()
    onRegisterAgent(agentForm)
    setAgentForm({ name: '', description: '', endpoint: '', protocol: 'http' })
  }

  function submitMessage(event) {
    event.preventDefault()
    onSendMessage(messageForm)
    setMessageForm((current) => ({ ...current, subject: '', body: '' }))
  }

  return (
    <section className="panel-stack">
      <div className="three-column">
        <section className="panel">
          <h3>Register agent</h3>
          <form className="policy-form" onSubmit={submitAgent}>
            <label>
              Name
              <input value={agentForm.name} onChange={(event) => setAgentForm({ ...agentForm, name: event.target.value })} />
            </label>
            <label>
              Description
              <input value={agentForm.description} onChange={(event) => setAgentForm({ ...agentForm, description: event.target.value })} />
            </label>
            <label>
              Endpoint
              <input value={agentForm.endpoint} onChange={(event) => setAgentForm({ ...agentForm, endpoint: event.target.value })} placeholder="https://agent.example.com/webhook" />
            </label>
            <button className="primary-button" type="submit" disabled={actionState === 'agent:register'}>
              {actionState === 'agent:register' ? 'Registering…' : 'Register agent'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>Send message</h3>
          <form className="policy-form" onSubmit={submitMessage}>
            <label>
              From agent
              <select value={messageForm.from_agent_id} onChange={(event) => setMessageForm({ ...messageForm, from_agent_id: event.target.value })}>
                <option value="">Select agent</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </label>
            <label>
              To agent
              <select value={messageForm.to_agent_id} onChange={(event) => setMessageForm({ ...messageForm, to_agent_id: event.target.value })}>
                <option value="">Select agent</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </label>
            <label>
              Subject
              <input value={messageForm.subject} onChange={(event) => setMessageForm({ ...messageForm, subject: event.target.value })} />
            </label>
            <label>
              Body
              <textarea value={messageForm.body} onChange={(event) => setMessageForm({ ...messageForm, body: event.target.value })} rows="4" />
            </label>
            <button className="primary-button" type="submit" disabled={actionState === 'message:send'}>
              {actionState === 'message:send' ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>Agents</h3>
          <div className="list selector-list">
            {agents.map((agent) => (
              <button key={agent.id} className={agent.id === selectedAgentId ? 'nav-item active' : 'nav-item'} onClick={() => onSelectAgent(agent.id)}>
                {agent.name}
              </button>
            ))}
            {!agents.length ? <div className="empty">No agents yet.</div> : null}
          </div>
        </section>
      </div>

      <div className="two-column">
        <section className="panel">
          <h3>Inbox</h3>
          <div className="list selector-list">
            {inbox.map((message) => (
              <button key={message.id} className={message.thread_id === selectedThreadId ? 'nav-item active' : 'nav-item'} onClick={() => onSelectThread(message.thread_id)}>
                <span>{message.subject || 'No subject'}</span>
                <span className="table-subtext">{message.status}</span>
              </button>
            ))}
            {!inbox.length ? <div className="empty">No inbox messages.</div> : null}
          </div>
        </section>

        <section className="panel">
          <h3>Thread</h3>
          <div className="thread-list">
            {threadMessages.map((message) => (
              <article key={message.id} className="thread-card">
                <div className="thread-head">
                  <strong>{message.subject || 'No subject'}</strong>
                  <span>{message.status}</span>
                </div>
                <p className="muted">{message.body}</p>
                {message.status !== 'acknowledged' ? (
                  <button className="secondary-button" disabled={actionState === `ack:${message.id}`} onClick={() => onAcknowledge(message.id)}>
                    {actionState === `ack:${message.id}` ? 'Acknowledging…' : 'Acknowledge'}
                  </button>
                ) : null}
              </article>
            ))}
            {!threadMessages.length ? <div className="empty">No thread selected.</div> : null}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Delivery queue</h3>
            <p className="muted">Admin-only queue view and manual processing trigger.</p>
          </div>
          <button className="primary-button" disabled={actionState === 'queue:process'} onClick={onProcessQueue}>
            {actionState === 'queue:process' ? 'Processing…' : 'Process queue'}
          </button>
        </div>
        <pre className="json-box">{JSON.stringify(deliveryQueue, null, 2)}</pre>
      </section>
    </section>
  )
}

function UsersAndOps({ currentUser, users, auditLogs, schedulerStatus, actionState, onRegisterUser, onRotateUser, onRevokeUser }) {
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'user' })

  function submitUser(event) {
    event.preventDefault()
    onRegisterUser(userForm)
    setUserForm({ name: '', email: '', role: 'user' })
  }

  return (
    <section className="panel-stack">
      <div className="three-column">
        <section className="panel">
          <h3>Current user</h3>
          <pre className="json-box">{JSON.stringify(currentUser || {}, null, 2)}</pre>
        </section>

        <section className="panel">
          <h3>Register user</h3>
          <form className="policy-form" onSubmit={submitUser}>
            <label>
              Name
              <input value={userForm.name} onChange={(event) => setUserForm({ ...userForm, name: event.target.value })} />
            </label>
            <label>
              Email
              <input value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
            </label>
            <label>
              Role
              <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={actionState === 'user:register'}>
              {actionState === 'user:register' ? 'Creating…' : 'Create user'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>Scheduler</h3>
          <pre className="json-box">{JSON.stringify(schedulerStatus || {}, null, 2)}</pre>
        </section>
      </div>

      <section className="panel">
        <h3>Users</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Tenant</th>
                <th>Token</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.tenant_id}</td>
                  <td>{user.token_last_four || '—'}</td>
                  <td>
                    <div className="action-row">
                      <button className="secondary-button" disabled={actionState === `user:rotate:${user.id}`} onClick={() => onRotateUser(user.id)}>
                        {actionState === `user:rotate:${user.id}` ? 'Rotating…' : 'Rotate token'}
                      </button>
                      <button className="secondary-button" disabled={actionState === `user:revoke:${user.id}`} onClick={() => onRevokeUser(user.id)}>
                        {actionState === `user:revoke:${user.id}` ? 'Revoking…' : 'Revoke token'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td colSpan="6" className="empty-row">No users available.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h3>Audit log</h3>
        <pre className="json-box">{JSON.stringify(auditLogs, null, 2)}</pre>
      </section>
    </section>
  )
}

function NextPhase() {
  return (
    <section className="panel-stack">
      <section className="panel">
        <h3>Next UI roadmap</h3>
        <ul className="roadmap-list">
          <li>Audit filtering and pagination</li>
          <li>MCP and capability creation forms with richer validation</li>
          <li>System repair history and task status</li>
          <li>Multi-page routing and auth guards</li>
          <li>Charts and richer analytics visuals</li>
        </ul>
      </section>

      <section className="panel">
        <h3>Why this phase matters</h3>
        <p className="muted">
          Sound Net now supports saved environments, direct capability registration, and system repair actions, which makes the operator console much closer to a complete control plane.
        </p>
      </section>
    </section>
  )
}

export default App
