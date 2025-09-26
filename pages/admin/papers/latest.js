import { useEffect, useMemo, useState } from 'react'

// 最新方案：
// 1) 仅上载PDF并入库（此页以已有 paperId 进行后续步骤；创建与直传仍走你现有入口）
// 2) 展示应发送的 Phase 1 Prompt（不发送）
// 3) 粘贴 Phase1 JSON → commit → 触发裁剪
// 4) 粘贴 Phase2 JSON → commit（答案+Bab/Subtopic+课文片段）

const defaultBackendBase =
  typeof window !== 'undefined'
    ? (localStorage.getItem('backendBase') || process.env.NEXT_PUBLIC_BACKEND_BASE || '')
    : (process.env.NEXT_PUBLIC_BACKEND_BASE || '')

export default function LatestPlan() {
  const [backendBase, setBackendBase] = useState(defaultBackendBase)
  const [paperId, setPaperId] = useState('')

  const [phase1Prompt, setPhase1Prompt] = useState('')
  const [phase1Loading, setPhase1Loading] = useState(false)
  const [phase1JsonText, setPhase1JsonText] = useState('')
  const [phase1Errors, setPhase1Errors] = useState([])
  const [commit1Loading, setCommit1Loading] = useState(false)

  const [rebuildTriggered, setRebuildTriggered] = useState(false)
  const [rebuildStatus, setRebuildStatus] = useState('')

  const [phase2JsonText, setPhase2JsonText] = useState('')
  const [phase2Errors, setPhase2Errors] = useState([])
  const [commit2Loading, setCommit2Loading] = useState(false)

  const [debugUrls, setDebugUrls] = useState({ phase1: '', phase2: '' })
  const [log, setLog] = useState([])

  useEffect(() => {
    // persist backend base to localStorage
    try { localStorage.setItem('backendBase', backendBase || '') } catch {}
  }, [backendBase])

  const api = useMemo(() => {
    const base = (backendBase || '').replace(/\/$/, '')
    const build = (p) => `${base}${p}`
    return {
      promptV1: (id) => build(`/api/admin/papers/${encodeURIComponent(id)}/gemini/build-phase1-prompt`),
      commitV1: (id) => build(`/api/admin/papers/${encodeURIComponent(id)}/gemini/commit-phase1`),
      rebuild: (id) => build(`/api/admin/papers/${encodeURIComponent(id)}/images/rebuild`),
      commitV2: (id) => build(`/api/admin/papers/${encodeURIComponent(id)}/gemini/commit-phase2`),
      debug: (id) => build(`/api/admin/papers/${encodeURIComponent(id)}/gemini/debug`),
      rebuildStatus: (id) => build(`/api/admin/papers/${encodeURIComponent(id)}/images/rebuild/status`),
    }
  }, [backendBase])

  function appendLog(message) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  async function fetchPrompt() {
    if (!backendBase || !paperId) {
      alert('请先填写 Backend Base 与 paperId')
      return
    }
    setPhase1Loading(true)
    appendLog('请求 Phase 1 Prompt ...')
    try {
      const res = await fetch(api.promptV1(paperId))
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setPhase1Prompt(data.prompt || '')
      appendLog('已获取 Prompt 文本（不发送）')
    } catch (err) {
      console.error(err)
      alert('获取 Prompt 失败: ' + err.message)
      appendLog('获取 Prompt 失败: ' + err.message)
    } finally {
      setPhase1Loading(false)
    }
  }

  // very lightweight client-side checks (do not block submit)
  function validatePhase1(json) {
    const errs = []
    if (!json || !Array.isArray(json.questions)) {
      errs.push('缺少 questions 数组')
      return errs
    }
    for (const q of json.questions) {
      if (typeof q.number !== 'number') errs.push(`题号非数字: ${q.number}`)
      if (!q.content || typeof q.content !== 'string') errs.push(`content 缺失: #${q.number}`)
      if (!q.position || (q.position.page !== null && typeof q.position.page !== 'number')) {
        errs.push(`position.page 异常: #${q.number}`)
      }
    }
    return errs.slice(0, 10)
  }

  async function commitPhase1() {
    if (!backendBase || !paperId) {
      alert('请先填写 Backend Base 与 paperId')
      return
    }
    let payload
    try {
      payload = JSON.parse(phase1JsonText)
    } catch (e) {
      alert('Phase 1 JSON 不是有效的 JSON')
      return
    }
    const errs = validatePhase1(payload)
    setPhase1Errors(errs)
    if (errs.length) {
      if (!confirm('检测到若干问题，仍要继续入库吗？')) return
    }
    setCommit1Loading(true)
    appendLog('提交 Phase 1 JSON 入库 ...')
    try {
      const res = await fetch(api.commitV1(paperId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
      appendLog('Phase 1 入库成功，触发插图重建 ...')
      setRebuildTriggered(true)
      // fire-and-forget rebuild
      fetch(api.rebuild(paperId), { method: 'POST' }).catch(() => {})
      // try fetch debug urls
      refreshDebug()
    } catch (err) {
      console.error(err)
      alert('Phase 1 入库失败: ' + err.message)
      appendLog('Phase 1 入库失败: ' + err.message)
    } finally {
      setCommit1Loading(false)
    }
  }

  async function refreshDebug() {
    if (!backendBase || !paperId) return
    try {
      const res = await fetch(api.debug(paperId))
      if (!res.ok) return
      const data = await res.json()
      const latest = data.latest || {}
      setDebugUrls({ phase1: latest.phase1?.signedUrl || '', phase2: latest.phase2?.signedUrl || '' })
      appendLog('已刷新 Debug 链接')
    } catch (_) {}
  }

  // optional: poll rebuild status if endpoint exists
  useEffect(() => {
    if (!rebuildTriggered || !backendBase || !paperId) return
    let stop = false
    const t = setInterval(async () => {
      try {
        const res = await fetch(api.rebuildStatus(paperId))
        if (!res.ok) return
        const data = await res.json()
        if (stop) return
        setRebuildStatus(data.status || '')
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(t)
          stop = true
          appendLog(`插图重建 ${data.status}`)
        }
      } catch (_) {}
    }, 3000)
    return () => clearInterval(t)
  }, [rebuildTriggered, backendBase, paperId, api])

  function validatePhase2(json) {
    const errs = []
    if (!json || !Array.isArray(json.questions)) {
      errs.push('缺少 questions 数组')
      return errs
    }
    for (const q of json.questions) {
      if (!q.answerKey || !['A', 'B', 'C', 'D'].includes(q.answerKey)) errs.push(`答案非法: #${q.number}`)
      if (!q.babCode) errs.push(`缺少 babCode: #${q.number}`)
      if (!q.textbook || !Array.isArray(q.textbook.snippets)) errs.push(`缺少 textbook.snippets: #${q.number}`)
    }
    return errs.slice(0, 10)
  }

  async function commitPhase2() {
    if (!backendBase || !paperId) {
      alert('请先填写 Backend Base 与 paperId')
      return
    }
    let payload
    try {
      payload = JSON.parse(phase2JsonText)
    } catch (e) {
      alert('Phase 2 JSON 不是有效的 JSON')
      return
    }
    const errs = validatePhase2(payload)
    setPhase2Errors(errs)
    if (errs.length) {
      if (!confirm('检测到若干问题，仍要继续入库吗？')) return
    }
    setCommit2Loading(true)
    appendLog('提交 Phase 2 JSON 入库 ...')
    try {
      const res = await fetch(api.commitV2(paperId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`)
      appendLog('Phase 2 入库成功')
      refreshDebug()
    } catch (err) {
      console.error(err)
      alert('Phase 2 入库失败: ' + err.message)
      appendLog('Phase 2 入库失败: ' + err.message)
    } finally {
      setCommit2Loading(false)
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <h1>最新方案（仅手动）</h1>
      <p style={{ color: '#666' }}>
        流程：上载PDF并入库（另页完成或已有 paperId）→ 仅查看 Phase 1 Prompt（不发送）→ 粘贴 Phase1 JSON 入库 → 自动触发插图重建 → 粘贴 Phase2 JSON 入库。
      </p>

      <section style={{ marginBottom: 24 }}>
        <h3>基础设置</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ minWidth: 140 }}>Backend Base：</label>
          <input
            value={backendBase}
            onChange={(e) => setBackendBase(e.target.value)}
            placeholder="https://your-domain.com"
            style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
        </div>
        <div style={{ height: 8 }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ minWidth: 140 }}>paperId：</label>
          <input
            value={paperId}
            onChange={(e) => setPaperId(e.target.value)}
            placeholder="输入已创建的 paperId"
            style={{ width: 280, padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <button onClick={refreshDebug}>刷新 Debug 链接</button>
        </div>
        {debugUrls.phase1 || debugUrls.phase2 ? (
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div>latest.phase1: {debugUrls.phase1 ? <a href={debugUrls.phase1} target="_blank" rel="noreferrer">打开</a> : '（暂无）'}</div>
            <div>latest.phase2: {debugUrls.phase2 ? <a href={debugUrls.phase2} target="_blank" rel="noreferrer">打开</a> : '（暂无）'}</div>
          </div>
        ) : null}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>Phase 1 Prompt（仅展示，不发送）</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchPrompt} disabled={phase1Loading}>{phase1Loading ? '生成中…' : '生成 Prompt 预览'}</button>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(phase1Prompt || '')
            }}
            disabled={!phase1Prompt}
          >复制</button>
          <button
            onClick={() => {
              const blob = new Blob([phase1Prompt || ''], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `paper-${paperId}-phase1-prompt.txt`
              a.click()
              URL.revokeObjectURL(url)
            }}
            disabled={!phase1Prompt}
          >下载 .txt</button>
        </div>
        <div style={{ marginTop: 8 }}>
          <textarea
            value={phase1Prompt}
            readOnly
            placeholder="点击上方生成以查看应发送的 Prompt（不发送）"
            style={{ width: '100%', height: 200, padding: 8, borderRadius: 6, border: '1px solid #ddd', fontFamily: 'monospace' }}
          />
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>粘贴 Phase 1 JSON → 入库结构</h3>
        <textarea
          value={phase1JsonText}
          onChange={(e) => setPhase1JsonText(e.target.value)}
          placeholder='{"questions": [{"number":1,"type":"mcq","content":"...","options":["A","B","C","D"],"position":{"page":2,"bbox":null}}]}'
          style={{ width: '100%', height: 220, padding: 8, borderRadius: 6, border: '1px solid #ddd', fontFamily: 'monospace' }}
        />
        {phase1Errors.length > 0 && (
          <div style={{ color: '#b45309', marginTop: 6, fontSize: 13 }}>
            发现问题：{phase1Errors.join('；')}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <button onClick={commitPhase1} disabled={commit1Loading}>{commit1Loading ? '提交中…' : '入库结构（Phase 1）'}</button>
        </div>
        {rebuildTriggered && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>
            已触发插图重建：{rebuildStatus || '后台进行中…（无状态接口则不显示进度）'}
          </div>
        )}
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3>粘贴 Phase 2 JSON → 入库答案与分类</h3>
        <textarea
          value={phase2JsonText}
          onChange={(e) => setPhase2JsonText(e.target.value)}
          placeholder='{"questions": [{"number":1,"answerKey":"B","confidence":0.74,"babCode":"F4-Bab2","subtopicCodes":["F4-2-1"],"textbook":{"snippets":[{"page":12,"text":"..."}]}}]}'
          style={{ width: '100%', height: 220, padding: 8, borderRadius: 6, border: '1px solid #ddd', fontFamily: 'monospace' }}
        />
        {phase2Errors.length > 0 && (
          <div style={{ color: '#b45309', marginTop: 6, fontSize: 13 }}>
            发现问题：{phase2Errors.join('；')}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <button onClick={commitPhase2} disabled={commit2Loading}>{commit2Loading ? '提交中…' : '入库答案与分类（Phase 2）'}</button>
        </div>
      </section>

      <section>
        <h3>日志</h3>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 8, borderRadius: 6, border: '1px solid #eee', maxHeight: 200, overflow: 'auto' }}>
{log.join('\n')}
        </pre>
      </section>
    </div>
  )
}

