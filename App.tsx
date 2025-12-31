import { useState } from 'react'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export default function App() {
  const [message, setMessage] = useState<string>('Welcome to StockLog Pro')
  const [loading, setLoading] = useState(false)

  const handleAiAnalyze = async () => {
    if (!GEMINI_API_KEY) {
      alert('Gemini API key is not configured')
      return
    }

    try {
      setLoading(true)

      // 👉 Replace this with your real AI / stock analysis logic
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setMessage('AI Analysis Complete ✅')
    } catch (error) {
      console.error(error)
      alert('AI analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    if (window.confirm('Permanently delete this stock log?')) {
      alert('Deleted successfully')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="glass rounded-xl shadow-lg p-8 max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-bold">StockLog Pro</h1>

        <p className="text-slate-600">{message}</p>

        <button
          onClick={handleAiAnalyze}
          disabled={loading}
          className="w-full px-4 py-2 rounded-lg bg-black text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Run AI Analysis'}
        </button>

        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 rounded-lg border border-red-500 text-red-600 hover:bg-red-50"
        >
          Delete Log
        </button>
      </div>
    </div>
  )
}
