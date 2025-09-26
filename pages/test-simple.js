import { useState } from 'react'
import Layout from '../components/Layout'

export default function TestSimple() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [testType, setTestType] = useState('auth') // auth 或 bypass
  
  const testRecord = async () => {
    setLoading(true)
    try {
      const endpoint = testType === 'auth' ? '/api/simple-record-test' : '/api/simple-auth-bypass'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          group: 'A',
          category: 'food',
          amount: '10.00',
          date: new Date().toISOString().slice(0, 10),
          note: '简陋测试记录'
        })
      })
      
      const data = await response.json()
      setResult(data)
      console.log('🧪 简陋测试结果:', data)
      
    } catch (error) {
      console.error('🧪 测试失败:', error)
      setResult({
        success: false,
        step: 'fetch_error',
        error: error.message
      })
    }
    setLoading(false)
  }
  
  return (
    <Layout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">🧪 简陋版本测试</h1>
        
        <div className="mb-4 space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="auth"
              checked={testType === 'auth'}
              onChange={(e) => setTestType(e.target.value)}
              className="mr-2"
            />
            <span>测试带认证</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="bypass"
              checked={testType === 'bypass'}
              onChange={(e) => setTestType(e.target.value)}
              className="mr-2"
            />
            <span>绕过认证测试</span>
          </label>
        </div>
        
        <button
          onClick={testRecord}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? '测试中...' : `🚀 ${testType === 'auth' ? '测试带认证' : '绕过认证测试'}`}
        </button>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="font-bold mb-2">测试结果:</h2>
            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Layout>
  )
}