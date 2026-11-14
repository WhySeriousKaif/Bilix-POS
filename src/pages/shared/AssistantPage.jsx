import React, { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Bot, CheckCircle2, Loader2, Search, Send, ShieldCheck, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { assistantAPI, branchAPI, userAPI } from '@/services/api'

const SUGGESTIONS = [
  'What products sell with coffee?',
  'Is the recommended product currently in stock?',
  'Can opened food be returned?',
  'When does a discount require manager approval?',
]

const SYSTEM_SUGGESTIONS = [
  'Summarise platform performance.',
  'How many stores are active, pending, or blocked?',
  'What are total sales, refunds, and net sales?',
  'Which stores have the strongest sales performance?',
]

const sourceLabel = (source) => {
  if (source.document && source.section) {
    return `${source.document} · ${source.section}`
  }
  return source.label
}

const TOOL_LABELS = {
  search_products: 'Product catalogue searched',
  get_inventory: 'Live inventory checked',
  get_recommendations: 'Recommendations generated',
  get_dashboard_summary: 'Dashboard analysed',
  search_policies: 'Store policies searched',
}

const AssistantMessageContent = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>,
      ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-blue-500">{children}</ul>,
      ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-blue-500">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      h1: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold text-slate-950 first:mt-0 dark:text-white">{children}</h3>,
      h2: ({ children }) => <h3 className="mb-2 mt-4 text-base font-bold text-slate-950 first:mt-0 dark:text-white">{children}</h3>,
      h3: ({ children }) => <h4 className="mb-2 mt-4 font-semibold text-slate-950 first:mt-0 dark:text-white">{children}</h4>,
      code: ({ children }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-blue-700 dark:bg-white/10 dark:text-blue-300">{children}</code>,
      blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-blue-500 pl-3 text-slate-500 dark:text-slate-400">{children}</blockquote>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 dark:text-blue-400">{children}</a>,
      table: ({ children }) => <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-white/10"><table className="w-full border-collapse text-left text-xs">{children}</table></div>,
      th: ({ children }) => <th className="border-b border-slate-200 bg-slate-50 px-3 py-2 font-semibold dark:border-white/10 dark:bg-white/5">{children}</th>,
      td: ({ children }) => <td className="border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-white/5">{children}</td>,
    }}
  >
    {content}
  </ReactMarkdown>
)

const AssistantPage = ({ mode = 'branch' }) => {
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const initialize = async () => {
      try {
        if (mode === 'system') {
          if (!cancelled) setBranchId('system')
          return
        }
        const profile = await userAPI.getProfile()

        if (mode === 'branch') {
          if (!profile?.branchId) {
            throw new Error('No branch is assigned to this manager account.')
          }
          const branch = await branchAPI.getById(profile.branchId)
          if (!cancelled) {
            setBranches([branch])
            setBranchId(String(profile.branchId))
          }
        } else {
          if (!profile?.storeId) {
            throw new Error('No store is assigned to this manager account.')
          }
          const availableBranches = await branchAPI.getByStoreId(profile.storeId)
          if (!availableBranches?.length) {
            throw new Error('Create a branch before using the manager copilot.')
          }
          if (!cancelled) {
            setBranches(availableBranches)
            setBranchId(String(availableBranches[0].id))
          }
        }
      } catch (initializationError) {
        if (!cancelled) {
          setError(initializationError.message || 'Could not load manager context.')
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    initialize()
    return () => { cancelled = true }
  }, [mode])

  const conversation = useMemo(
    () => messages
      .filter((message) => !message.error)
      .slice(-10)
      .map(({ role, content }) => ({ role, content })),
    [messages],
  )

  const sendMessage = async (text = input) => {
    const cleaned = text.trim()
    if (!cleaned || !branchId || loading) return

    const userMessage = { role: 'user', content: cleaned }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setError('')
    setLoading(true)

    try {
      const response = mode === 'system'
        ? await assistantAPI.systemChat({ message: cleaned, conversation })
        : await assistantAPI.chat({
            branchId: Number(branchId),
            message: cleaned,
            conversation,
          })

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.answer,
          toolsUsed: response.toolsUsed || [],
          sources: response.sources || [],
          requestId: response.requestId,
          unavailable: response.available === false,
        },
      ])
    } catch (requestError) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: requestError.message || 'The assistant is unavailable.',
          error: true,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage()
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Billix Copilot
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {mode === 'system'
              ? 'Ask about platform sales, stores, users, refunds, and moderation.'
              : 'Ask about products, recommendations, inventory, and store policies.'}
          </p>
        </div>

        {mode === 'store' && (
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Branch
            <select
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value)
                setMessages([])
              }}
              disabled={initializing || loading}
              className="mt-1 block min-w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <Card className="flex h-[min(660px,calc(100dvh-13rem))] min-h-[360px] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Bot className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {mode === 'system' ? 'Platform assistant' : branches.find((branch) => String(branch.id) === branchId)?.name || 'Branch assistant'}
            </p>
            <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              View insights · No changes to your data
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          {!messages.length && !error && (
            <div className="mx-auto flex max-w-xl flex-col items-center py-6 text-center sm:py-8">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {mode === 'system' ? 'What would you like to know about your platform?' : 'What would you like to know about this branch?'}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ask a question or start with one below.
              </p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {(mode === 'system' ? SYSTEM_SUGGESTIONS : SUGGESTIONS).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    disabled={!branchId || initializing}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-left text-xs leading-5 text-slate-600 transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300 dark:hover:bg-blue-500/5"
                  >
                    <span>{suggestion}</span><ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-slate-400 group-hover:text-blue-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Bot className="size-4" />
                </span>
              )}
              <div className={`max-w-[82%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`break-words rounded-xl px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-slate-900 text-white dark:bg-blue-600'
                      : message.error || message.unavailable
                        ? 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                        : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {message.role === 'assistant' && !message.error && !message.unavailable
                    ? <AssistantMessageContent content={message.content} />
                    : message.content}
                </div>

                {!!message.toolsUsed?.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.toolsUsed.map((tool) => (
                      <span key={tool} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                        <CheckCircle2 className="size-3" />
                        {TOOL_LABELS[tool] || tool.replaceAll('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}

                {!!message.sources?.length && (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white/70 p-2 dark:border-white/10 dark:bg-white/5">
                    <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <Search className="size-3" /> Sources used
                    </p>
                    {message.sources.map((source, sourceIndex) => (
                      <p key={`${source.label}-${sourceIndex}`} className="flex items-start gap-1.5 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                        <span className="mt-2 size-1 shrink-0 rounded-full bg-blue-500" />
                        {sourceLabel(source)}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white/10">
                  <User className="size-4" />
                </span>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Loader2 className="size-4 animate-spin" />
              </span>
              Checking Billix data…
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-end gap-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  sendMessage()
                }
              }}
              placeholder={mode === 'system' ? 'Ask about sales, stores, users, or refunds…' : 'Ask about products, stock, or policies…'}
              disabled={!branchId || loading || initializing}
              maxLength={2000}
              aria-label="Message Copilot"
              className="min-h-11 max-h-28 resize-none rounded-xl bg-white text-sm dark:bg-slate-900"
            />
            <Button type="submit" disabled={!input.trim() || !branchId || loading} className="h-11 px-4">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            AI-generated answers can be wrong. Verify important business decisions.
          </p>
        </form>
      </Card>
    </div>
  )
}

export default AssistantPage
