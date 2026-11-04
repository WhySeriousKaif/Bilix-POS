import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { dashboardAPI, storeAPI, userAPI, orderAPI, refundAPI, customerAPI, shiftReportAPI, branchAPI } from '@/services/api'
import { cn } from '@/lib/utils'
import {
  ArrowRight,
  Boxes,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Inbox,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const PERIODS = [
  { key: 'TODAY', label: 'Today' },
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: '3M', label: '3M' },
  { key: '1Y', label: '1Y' },
]

const TONES = {
  emerald: { tile: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20', stroke: '#10b981' },
  blue: { tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20', stroke: '#3b82f6' },
  purple: { tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20', stroke: '#8b5cf6' },
  amber: { tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20', stroke: '#f97316' },
}

const METRICS = [
  { key: 'totalSales', label: 'Total Sales', icon: ShoppingBag, tone: 'emerald', format: 'currency' },
  { key: 'totalOrders', label: 'Total Orders', icon: ClipboardList, tone: 'blue', format: 'number' },
  { key: 'uniqueCustomers', label: 'Unique Customers', icon: Users, tone: 'purple', format: 'number' },
  { key: 'averageOrderValue', label: 'Average Order Value', icon: Package, tone: 'amber', format: 'currency' },
]

const BRANCH_TONES = [
  { bar: 'bg-blue-500', chip: 'bg-blue-500/10 text-blue-600', dot: '#3b82f6' },
  { bar: 'bg-orange-500', chip: 'bg-orange-500/10 text-orange-600', dot: '#f97316' },
  { bar: 'bg-purple-500', chip: 'bg-purple-500/10 text-purple-600', dot: '#8b5cf6' },
  { bar: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600', dot: '#10b981' },
  { bar: 'bg-cyan-500', chip: 'bg-cyan-500/10 text-cyan-600', dot: '#06b6d4' },
]

const branchTone = (index) => BRANCH_TONES[index % BRANCH_TONES.length]

const STATUS_COLORS = {
  COMPLETED: '#10b981',
  PENDING: '#3b82f6',
  CANCELLED: '#f97316',
  REFUNDED: '#f43f5e',
  PARTIALLY_REFUNDED: '#8b5cf6',
}

const STATUS_CHIPS = {
  COMPLETED: 'bg-emerald-500/10 text-emerald-600',
  PENDING: 'bg-blue-500/10 text-blue-600',
  CANCELLED: 'bg-orange-500/10 text-orange-600',
  REFUNDED: 'bg-rose-500/10 text-rose-600',
  PARTIALLY_REFUNDED: 'bg-purple-500/10 text-purple-600',
}

const QUICK_ACTIONS = [
  { label: 'Process Orders', description: 'View & manage branch sales', href: '/branch/orders', icon: ClipboardList, tone: 'bg-blue-500/10 text-blue-600 ring-blue-500/20' },
  { label: 'Manage Stock', description: 'Check inventory levels', href: '/branch/inventory', icon: Boxes, tone: 'bg-orange-500/10 text-orange-600 ring-orange-500/20' },
  { label: 'Staff & Cashiers', description: 'Manage branch employees', href: '/branch/employees', icon: Users, tone: 'bg-purple-500/10 text-purple-600 ring-purple-500/20' },
  { label: 'View Reports', description: 'Detailed analytics', href: '/branch/reports', icon: FileText, tone: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20' },
]

const formatCurrency = (value, decimals = 0) => {
  const amount = Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return `₹${amount}`
}

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN')

const formatMetric = (value, kind) => kind === 'currency' ? formatCurrency(value) : formatNumber(value)

const relativeTime = (iso) => {
  if (!iso) return ''
  try {
    const date = parseISO(iso)
    if (!isValid(date)) return ''
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return ''
  }
}

const formatRange = (start, end) => {
  if (!start || !end) return null
  try {
    const startDate = parseISO(start)
    const endDate = parseISO(end)
    if (!isValid(startDate) || !isValid(endDate)) return null
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
  } catch {
    return null
  }
}

const Panel = ({ title, subtitle, action, children, className, bodyClassName }) => (
  <Card className={cn('gap-0 overflow-hidden py-0', className)}>
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-white/10">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className={cn('p-5', bodyClassName)}>{children}</div>
  </Card>
)

const PanelLink = ({ href, children }) => (
  <a href={href} className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
    {children}
    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
  </a>
)

const Sparkline = ({ values, color }) => {
  const data = (values || []).map((value) => ({ value }))
  if (data.length < 2) return <div className="h-12 w-20" />
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const EmptyState = ({ icon, title, hint }) => {
  const Icon = icon || Inbox
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

const MetricCard = ({ metric, value, change, sparkline }) => {
  const tone = TONES[metric.tone]
  const Icon = metric.icon
  const hasChange = typeof change === 'number' && Number.isFinite(change)
  const direction = hasChange ? (change > 0 ? 'up' : change < 0 ? 'down' : 'flat') : null

  return (
    <Card className="gap-3 px-5 py-5">
      <div className="flex items-center gap-2.5">
        <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg ring-1', tone.tile)}>
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-slate-500 dark:text-slate-400">{metric.label}</span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">{formatMetric(value, metric.format)}</p>
          <p className="mt-1.5 flex items-center gap-1 text-xs">
            {direction === 'up' && (
              <>
                <TrendingUp className="size-3.5 text-emerald-500" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{change.toFixed(1)}%</span>
              </>
            )}
            {direction === 'down' && (
              <>
                <TrendingDown className="size-3.5 text-rose-500" />
                <span className="font-semibold text-rose-600 dark:text-rose-400">{Math.abs(change).toFixed(1)}%</span>
              </>
            )}
            {direction === 'flat' && <span className="font-semibold text-slate-500 dark:text-slate-400">0.0%</span>}
            {!direction && <span className="font-medium text-slate-400 dark:text-slate-500">No prior data</span>}
            {direction && <span className="font-normal text-slate-400 dark:text-slate-500"> vs previous</span>}
          </p>
        </div>
        <div className="w-20 shrink-0">
          <Sparkline values={sparkline} color={tone.stroke} />
        </div>
      </div>
    </Card>
  )
}

const BranchManagerDashboard = () => {
  const [branchId, setBranchId] = useState(null)
  const [branchInfo, setBranchInfo] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [period, setPeriod] = useState('7D')
  const [granularity, setGranularity] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const resolveBranch = async () => {
      try {
        const profile = await userAPI.getProfile().catch(() => null)
        let id = profile?.branchId || profile?.branch?.id || null
        if (!id) {
          const branches = await branchAPI.getAll().catch(() => [])
          id = branches?.[0]?.id || null
        }
        if (!cancelled) setBranchId(id || null)
      } catch (err) {
        console.error('Error resolving branch for dashboard:', err)
        if (!cancelled) setBranchId(null)
      }
    }
    resolveBranch()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!branchId) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [dashData, branchData] = await Promise.all([
          dashboardAPI.getBranchDashboard(branchId, { period, granularity }).catch(() => null),
          branchAPI.getById(branchId).catch(() => null),
        ])
        if (!cancelled) {
          setDashboard(dashData)
          setBranchInfo(branchData)
          setError(null)
        }
      } catch (err) {
        console.error('Error loading branch dashboard:', err)
        if (!cancelled) setError(err.message || 'Could not load dashboard data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [branchId, period, granularity, refreshTick])

  const metrics = dashboard?.metrics
  const sparklines = dashboard?.sparklines || {}
  const salesTrend = dashboard?.salesTrend || []
  const paymentBreakdown = dashboard?.paymentBreakdown || []
  const activeStaff = dashboard?.activeStaff || 0
  const totalRefunds = dashboard?.totalRefunds || 0
  const refundAmount = dashboard?.refundAmount || 0
  const recentSales = dashboard?.recentSales || []
  const orderStatus = dashboard?.orderStatus || []
  const granularityOptions = dashboard?.granularityOptions || ['DAILY', 'WEEKLY', 'MONTHLY']

  const salesData = salesTrend.map((point) => ({ date: point.label, sales: point.total || 0 }))

  const paymentDonut = paymentBreakdown.map((entry) => ({
    name: entry.method,
    value: entry.amount,
    fill: entry.method === 'CASH' ? '#f59e0b' : entry.method === 'CARD' ? '#3b82f6' : '#10b981',
  }))

  const statusDonut = orderStatus.map((entry) => ({
    name: entry.label,
    value: entry.count,
    status: entry.status,
    color: STATUS_COLORS[entry.status] || '#64748b',
  }))

  if (branchId === null) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md gap-4 p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400">
            <Building2 className="size-6" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No branch yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Link a branch to this manager account so the dashboard can report on its orders, refunds and staff.</p>
          <Button href="/branch/settings" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Building2 className="size-4" /> Link Branch
          </Button>
        </Card>
      </div>
    )
  }

  if (loading && !dashboard) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 size-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading branch dashboard data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Branch Manager Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {branchInfo ? `Real-time performance, transactions and staff overview for ${branchInfo.name}.` : 'Real-time performance, transactions and staff overview.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {period === '7D' && (
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 md:flex">
                <Calendar className="size-3.5 text-slate-400" />
                {formatRange(dashboard?.startDate, dashboard?.endDate) || ''}
              </div>
            )}
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
              {PERIODS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => { setPeriod(entry.key); setGranularity('') }}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    period === entry.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setError(null); setRefreshTick((tick) => tick + 1) }}
              className="text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
            <span className="min-w-0 truncate">{error}</span>
            <button type="button" onClick={() => setError(null)} className="shrink-0 font-semibold underline underline-offset-2">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((metric) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              value={metrics?.[metric.key] ?? 0}
              change={metrics?.[`${metric.key}ChangePct`]}
              sparkline={sparklines[metric.key]}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel title="Sales Trend" subtitle="Total sales for this branch" className="xl:col-span-2" action={
            <select
              value={dashboard?.granularity || ''}
              onChange={(event) => setGranularity(event.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
            >
              {granularityOptions.map((option) => (
                <option key={option} value={option}>{option.charAt(0) + option.slice(1).toLowerCase()}</option>
              ))}
            </select>
          }>
            {salesData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value, 2)} />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} name="Sales" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Inbox} title="No sales in this period" hint="Pick a wider timeframe or record your first order." />
            )}
          </Panel>

          <Panel title="Payment Types" subtitle="Breakdown by cash, card & digital payments">
            {paymentDonut.length ? (
              <div className="flex flex-col items-center gap-5">
                <div className="relative h-[170px] w-[170px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={paymentDonut} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="100%" paddingAngle={2} stroke="none">
                        {paymentDonut.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value, 2)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(metrics?.totalSales)}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Sales</span>
                  </div>
                </div>
                <ul className="w-full min-w-0 space-y-2.5">
                  {paymentBreakdown.map((entry) => (
                    <li key={entry.method} className="flex items-center gap-3 rounded-lg border border-slate-200/70 px-3 py-2 dark:border-white/10">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.method === 'CASH' ? '#f59e0b' : entry.method === 'CARD' ? '#3b82f6' : '#10b981' }} />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">{entry.method}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(entry.amount)}</span>
                      <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">{Number(entry.percentage || 0).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState icon={ClipboardList} title="No payment data yet" hint="The payment breakdown appears once orders are placed." />
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <Panel title="Recent Branch Orders" subtitle="Latest sales transactions" className="xl:col-span-2" action={<PanelLink href="/branch/orders">View All</PanelLink>}>
            {recentSales.length ? (
              <div className="-my-1 divide-y divide-slate-100 dark:divide-white/5">
                {recentSales.map((sale) => (
                  <div key={sale.orderId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-slate-900/5 dark:ring-white/10 bg-slate-500/10 text-slate-600 dark:text-slate-400">
                      <ShoppingBag className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Order #{sale.orderId}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{sale.branchId ? `Branch #${sale.branchId}` : 'Branch'}</span>
                        <span>{relativeTime(sale.createdAt) || '—'}</span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', STATUS_CHIPS[sale.status] || 'bg-slate-500/10 text-slate-500 dark:text-slate-400')}>
                          {(sale.status || '').replace(/_/g, ' ')}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(sale.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={ShoppingBag} title="No recent sales" hint="New orders will show up here as they are recorded." />
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <a key={action.label} href={action.href} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-colors hover:border-blue-500/40 hover:bg-blue-500/5 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-500/40">
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg ring-1', action.tone)}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{action.label}</span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{action.description}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
                  </a>
                )
              })}
            </div>
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <Panel title="Order Status" className="lg:col-span-2 xl:col-span-1">
            {statusDonut.length ? (
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="relative h-[170px] w-[170px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDonut} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" paddingAngle={2} stroke="none">
                        {statusDonut.map((entry) => <Cell key={entry.status} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{formatNumber(metrics?.totalOrders || 0)}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Total Orders</span>
                  </div>
                </div>
                <ul className="w-full min-w-0 space-y-2.5">
                  {orderStatus.map((entry) => (
                    <li key={entry.status} className="flex items-center gap-3 rounded-lg border border-slate-200/70 px-3 py-2 dark:border-white/10">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.status] || '#64748b' }} />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">{entry.label}</span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatNumber(entry.count)}</span>
                      <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">{Number(entry.percentage || 0).toFixed(0)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState icon={ClipboardList} title="No orders yet" hint="The status breakdown appears once orders are placed." />
            )}
          </Panel>

          <Panel title="Refunds" subtitle="Processed refund requests in this period">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total refunds</span>
                <span className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{totalRefunds}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Refund value</span>
                <span className="text-sm font-bold tabular-nums text-rose-600 dark:text-rose-400">{formatCurrency(refundAmount, 2)}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-900">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Active staff</span>
                <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{activeStaff}</span>
              </div>
              <a href="/branch/refunds" className="group inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                View all refunds
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default BranchManagerDashboard
