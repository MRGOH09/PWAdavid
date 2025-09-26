import { useEffect, useState } from 'react'

export default function DebugConnect() {
  const [session, setSession] = useState(null)
  const [results, setResults] = useState([])
  const [version, setVersion] = useState(null)
  const [envInfo, setEnvInfo] = useState(null)
  const [action, setAction] = useState('dashboard')

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
      } catch (e) {
        log('init', 'error', e.message)
      }
      try {
        const r = await fetch('/api/pwa/version'); setVersion(await r.json())
      } catch {}
      try {
        const r = await fetch('/api/pwa/debug-env'); setEnvInfo(await r.json())
      } catch {}
    })()
  }, [])

  function log(title, status, data) {
    setResults(prev => [{ ts: new Date().toLocaleTimeString(), title, status, data }, ...prev])
  }

  async function testPost(act) {
    try {
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const res = await fetch('/api/pwa/data', { method: 'POST', headers, body: JSON.stringify({ action: act }) })
      const txt = await res.text()
      log(`POST ${act}`, res.status, safeParse(txt))
    } catch (e) { log(`POST ${act}`, 'error', e.message) }
  }

  async function testGet(act) {
    try {
      const headers = { 'Accept': 'application/json' }
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const url = `/api/pwa/data?action=${encodeURIComponent(act)}&_=${Date.now()}`
      const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
      const txt = await res.text()
      log(`GET ${act}`, res.status, safeParse(txt))
    } catch (e) { log(`GET ${act}`, 'error', e.message) }
  }

  function safeParse(txt) { try { return JSON.parse(txt) } catch { return txt } }

  async function unregisterSW() {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map(r => r.unregister()))
      log('SW', 'unregistered', `count=${regs.length}`)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif', padding: 16 }}>
      <h1>Debug Connect</h1>
      <p>Quickly test /api/pwa/data with POST/GET and show env/session.</p>

      <section style={{ margin: '12px 0', padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <h3>Session</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify({ hasSession: !!session, user: session?.user?.email }, null, 2)}</pre>
        <button onClick={unregisterSW}>Unregister Service Workers</button>
      </section>

      <section style={{ margin: '12px 0', padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <h3>Version</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(version, null, 2)}</pre>
        <h3>Env (server)</h3>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(envInfo, null, 2)}</pre>
      </section>

      <section style={{ margin: '12px 0', padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <h3>Run Tests</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={action} onChange={e => setAction(e.target.value)}>
            <option>dashboard</option>
            <option>profile</option>
            <option>history</option>
            <option>getProfile</option>
            <option>getRecentRecords</option>
            <option>getDashboard</option>
          </select>
          <button onClick={() => testPost(action)}>Test POST</button>
          <button onClick={() => testGet(action)}>Test GET</button>
          <button onClick={() => { testPost('dashboard'); testGet('dashboard') }}>POST/GET dashboard</button>
          <button onClick={() => { testPost('profile'); testGet('profile') }}>POST/GET profile</button>
          <button onClick={() => { testPost('history'); testGet('history') }}>POST/GET history</button>
        </div>
      </section>

      <section style={{ margin: '12px 0', padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
        <h3>Results</h3>
        <div>
          {results.map((r, i) => (
            <div key={i} style={{ marginBottom: 8, padding: 8, background: '#f8fafc', borderRadius: 6 }}>
              <div><strong>{r.ts}</strong> — {r.title} — <em>{r.status}</em></div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

