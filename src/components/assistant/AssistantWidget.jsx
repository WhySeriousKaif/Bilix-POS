import React, { useEffect, useMemo, useState } from 'react'
import { Bot, ExternalLink, Loader2, MessageCircle, Send, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { assistantAPI, branchAPI, userAPI } from '@/services/api'

const TOOL_LABELS = {
  search_products: 'Catalogue searched',
  get_inventory: 'Inventory checked',
  get_recommendations: 'Recommendations generated',
  get_dashboard_summary: 'Dashboard analysed',
  get_system_summary: 'Platform summary analysed',
  search_policies: 'Policies searched',
}

const AssistantWidget = ({ mode = 'branch' }) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [branchId, setBranchId] = useState('')
  const [branchName, setBranchName] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadContext = async () => {
      try {
        if (mode === 'system') {
          if (!cancelled) {
            setBranchId('system')
            setBranchName('Platform oversight')
          }
          return
        }
        const profile = await userAPI.getProfile()
        let branch
        if (mode === 'branch') {
          branch = await branchAPI.getById(profile.branchId)
        } else {
          const branches = await branchAPI.getByStoreId(profile.storeId)
          branch = branches?.[0]
        }
        if (!branch) throw new Error('No branch is available for Copilot.')
        if (!cancelled) {
          setBranchId(String(branch.id))
          setBranchName(branch.name)
        }
      } catch (contextError) {
        if (!cancelled) setError(contextError.message || 'Could not load Copilot context.')
      }
    }
    loadContext()
    return () => { cancelled = true }
  }, [mode])

  const conversation = useMemo(
    () => messages.slice(-10).map(({ role, content }) => ({ role, content })),
    [messages],
  )

  const send = async (text = input) => {
    const message = text.trim()
    if (!message || !branchId || loading) return
    setMessages((current) => [...current, { role: 'user', content: message }])
    setInput('')
    setError('')
    setLoading(true)
    try {
      const response = mode === 'system'
        ? await assistantAPI.systemChat({ message, conversation })
        : await assistantAPI.chat({ branchId: Number(branchId), message, conversation })
      setMessages((current) => [...current, {
        role: 'assistant',
        content: response.answer,
        toolsUsed: response.toolsUsed || [],
      }])
    } catch (requestError) {
      setError(requestError.message || 'Copilot is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const fullPath = mode === 'system'
    ? '/super-admin/assistant'
    : mode === 'store' ? '/store/assistant' : '/branch/assistant'
  const suggestions = mode === 'system'
    ? ['Summarise platform performance.', 'How many stores need approval?', 'What are total sales and refunds?']
    : ['Summarise this week’s performance.', 'What were total sales and orders?', 'Which products performed best?']

  return (
    <>
      {open && (
        <section className="fixed bottom-24 right-4 z-40 flex h-[min(590px,calc(100vh-8rem))] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white"><Bot className="size-4.5" /></span>
              <div>
                <p className="text-sm font-bold">Billix Copilot</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{branchName || 'Loading branch…'} · read only</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => navigate(fullPath)} title="Open full Copilot" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><ExternalLink className="size-4" /></button>
              <button type="button" onClick={() => setOpen(false)} title="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="size-4" /></button>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-white/[0.02]">
            {!messages.length && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Ask about this dashboard</p>
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => send(suggestion)} className="block w-full rounded-xl border border-slate-200 bg-white p-2.5 text-left text-xs text-slate-600 hover:border-blue-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'}`}>
                  {message.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-4 marker:text-blue-500">{children}</ul>,
                      ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-4 marker:text-blue-500">{children}</ol>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>,
                    }}>{message.content}</ReactMarkdown>
                  ) : message.content}
                  {!!message.toolsUsed?.length && (
                    <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-200 pt-2 dark:border-white/10">
                      {message.toolsUsed.map((tool) => <span key={tool} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{TOOL_LABELS[tool] || tool}</span>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="size-4 animate-spin" /> Analysing Billix data…</div>}
            {error && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); send() }} className="flex gap-2 border-t border-slate-200 p-3 dark:border-white/10">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about sales, orders, stock…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/10" />
            <button type="submit" disabled={!input.trim() || loading || !branchId} className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-40"><Send className="size-4" /></button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setOpen((current) => !current)} className="fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 hover:bg-blue-700" title="Ask Billix Copilot">
        {open ? <X className="size-5" /> : <MessageCircle className="size-6" />}
      </button>
    </>
  )
}

export default AssistantWidget
