import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { dashboardAPI, storeAPI, userAPI } from '@/services/api'
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

/* ------------------------------------------------------------------ *
 * Static presentation config only — every figure rendered below is
 * fetched from GET /api/dashboard/store/{storeId}.
 * ------------------------------------------------------------------ */

const PERIODS = [
  { key: 'TODAY', label: 'Today', comparison: 'yesterday' },
  { key: '7D', label: '7D', comparison: 'previous 7 days' },
  { key: '30D', label: '30D', comparison: 'previous 30 days' },
  { key: '3M', label: '3M', comparison: 'previous 3 months' },
  { key: '1Y', label: '1Y', comparison: 'previous year' },
]

const TONES = {
  emerald: {
    tile: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
    stroke: '#10b981',
  },
  blue: {
    tile: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
    stroke: '#3b82f6',
  },
  purple: {
    tile: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
    stroke: '#8b5cf6',
  },
  amber: {
    tile: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
    stroke: '#f97316',
  },
}

const METRICS = [
  { key: 'totalSales', label: 'Total Sales', icon: ShoppingBag, tone: 'emerald', format: 'currency' },
  { key: 'totalOrders', label: 'Total Orders', icon: ClipboardList, tone: 'blue', format: 'number' },
  { key: 'uniqueCustomers', label: 'Unique Customers', icon: Users, tone: 'purple', format: 'number' },
  { key: 'averageOrderValue', label: 'Average Order Value', icon: Package, tone: 'amber', format: 'currency' },
]

const BRANCH_TONES = [
  { bar: 'bg-blue-500', chip: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', dot: '#3b82f6' },
  { bar: 'bg-orange-500', chip: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', dot: '#f97316' },
  { bar: 'bg-purple-500', chip: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', dot: '#8b5cf6' },
  { bar: 'bg-emerald-500', chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: '#10b981' },
  { bar: 'bg-cyan-500', chip: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', dot: '#06b6d4' },
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
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  PENDING: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  CANCELLED: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  REFUNDED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  PARTIALLY_REFUNDED: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
}

const QUICK_ACTIONS = [
  {
    label: 'Add Product',
    description: 'Create new product',
    href: '/store/products',
    icon: Plus,
    tone: 'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:text-blue-400',
  },
  {
    label: 'Manage Branches',
    description: 'View & edit branches',
    href: '/store/branches',
    icon: Building2,
    tone: 'bg-orange-500/10 text-orange-600 ring-orange-500/20 dark:text-orange-400',
  },
  {
    label: 'View Reports',
    description: 'Detailed analytics',
    href: '/store/reports',
    icon: FileText,
    tone: 'bg-purple-500/10 text-purple-600 ring-purple-500/20 dark:text-purple-400',
  },
  {
    label: 'Inventory',
    description: 'Check stock levels',
    href: '/store/products',
    icon: Boxes,
    tone: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
  },
]

/* ------------------------------------------------------------------ *
 * Formatting helpers
 * ------------------------------------------------------------------ */

const formatCurrency = (value, decimals = 0) => {
  const amount = Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `₹${amount}`
}

const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN')

const formatMetric = (value, kind) =>
  kind === 'currency' ? formatCurrency(value) : formatNumber(value)

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

/* ------------------------------------------------------------------ *
 * Small building blocks
 * ------------------------------------------------------------------ */

const Panel = ({ title, subtitle, action, children, className, bodyClassName }) => (
  <Card className={cn('gap-0 overflow-hidden py-0', className)}>
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-white/10">
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
    <div className={cn('p-5', bodyClassName)}>{children}</div>
  </Card>
)

const PanelLink = ({ href, children }) => (
  <a
    href={href}
    className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
  >
    {children}
    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
  </a>
)

const Sparkline = ({ values, color }) => {
  const data = (values || []).map((value) => ({ value }))
  if (data.length < 2) {
    return <div className="h-12 w-20" />
  }
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
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

const MetricCard = ({ metric, value, change, sparkline, comparison }) => {
  const tone = TONES[metric.tone]
  const Icon = metric.icon
  const hasChange = typeof change === 'number' && Number.isFinite(change)
  const direction = hasChange ? (change > 0 ? 'up' : change < 0 ? 'down' : 'flat') : null

  return (
    <Card className="gap-3 px-5 py-5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1',
            tone.tile
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
          {metric.label}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
            {formatMetric(value, metric.format)}
          </p>
          <p className="mt-1.5 flex items-center gap-1 text-xs">
            {direction === 'up' && (
              <>
                <TrendingUp className="size-3.5 text-emerald-500" />
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {change.toFixed(1)}%
                </span>
              </>
            )}
            {direction === 'down' && (
              <>
                <TrendingDown className="size-3.5 text-rose-500" />
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  {Math.abs(change).toFixed(1)}%
                </span>
              </>
            )}
            {direction === 'flat' && (
              <span className="font-semibold text-slate-500 dark:text-slate-400">0.0%</span>
            )}
            {!direction && (
              <span className="font-medium text-slate-400 dark:text-slate-500">No prior data</span>
            )}
            {direction && (
              <span className="font-normal text-slate-400 dark:text-slate-500">
                vs {comparison}
              </span>
            )}
          </p>
        </div>
        <div className="w-20 shrink-0">
          <Sparkline values={sparkline} color={tone.stroke} />
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

const StoreAdminDashboard = () => {
  // undefined = still resolving which store this admin owns
  const [storeId, setStoreId] = useState(undefined)
  const [dashboard, setDashboard] = useState(null)
  const [period, setPeriod] = useState('7D')
  const [granularity, setGranularity] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const resolveStore = async () => {
      try {
        const profile = await userAPI.getProfile().catch(() => null)
        let id = profile?.storeId || profile?.store?.id || null
        if (!id) {
          const stores = await storeAPI.getByAdmin().catch(() => [])
          id = stores?.[0]?.id || null
        }
        if (!cancelled) setStoreId(id || null)
      } catch (err) {
        console.error('Error resolving store for dashboard:', err)
        if (!cancelled) setStoreId(null)
      }
    }
    resolveStore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (storeId === undefined || !storeId) return undefined
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const data = await dashboardAPI.getStoreDashboard(storeId, { period, granularity })
        if (!cancelled) {
          setDashboard(data)
          setError(null)
        }
      } catch (err) {
        console.error('Error loading dashboard:', err)
        if (!cancelled) setError(err.message || 'Could not load dashboard data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [storeId, period, granularity, refreshTick])

  const comparison =
    PERIODS.find((entry) => entry.key === period)?.comparison || 'previous period'
  const rangeLabel = dashboard ? formatRange(dashboard.startDate, dashboard.endDate) : null
  const metrics = dashboard?.metrics
  const sparklines = dashboard?.sparklines || {}
  const salesTrend = dashboard?.salesTrend || []
  const branchWiseSales = dashboard?.branchWiseSales || []
  const branchPerformance = dashboard?.branchPerformance || []
  const recentSales = dashboard?.recentSales || []
  const topProducts = dashboard?.topProducts || []
  const orderStatus = dashboard?.orderStatus || []
  const granularityOptions = dashboard?.granularityOptions || ['DAILY', 'WEEKLY', 'MONTHLY']

  const salesData = salesTrend.map((point) => ({ date: point.label, sales: point.total || 0 }))

  const statusDonut = orderStatus.map((entry) => ({
    name: entry.label,
    value: entry.count,
    status: entry.status,
    color: STATUS_COLORS[entry.status] || '#64748b',
  }))

  const branchMaxSales = branchWiseSales.length ? branchWiseSales[0].sales || 0 : 0

  if (storeId === null) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md gap-4 p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400">
            <Building2 className="size-6" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No store yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create a store first — the dashboard reports on the branches, products and orders
            belonging to it.
          </p>
          <a
            href="/store/stores"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="size-4" />
            Create store
          </a>
        </Card>
      </div>
    )
  }

  if (loading && !dashboard) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 size-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading dashboard data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Overview of your store performance across all branches
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rangeLabel && (
              <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 md:flex">
                <Calendar className="size-3.5 text-slate-400" />
                {rangeLabel}
              </div>
            )}

            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
              {PERIODS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => {
                    setPeriod(entry.key)
                    // bucketing options depend on the period, so start from its default
                    setGranularity('')
                  }}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                    period === entry.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null)
                setRefreshTick((tick) => tick + 1)
              }}
              title="Refresh dashboard"
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
            <span className="min-w-0 truncate">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Headline metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((metric) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              value={metrics?.[metric.key] ?? 0}
              change={metrics?.[`${metric.key}ChangePct`]}
              sparkline={sparklines[metric.key]}
              comparison={comparison}
            />
          ))}
        </div>

        {/* Sales trend + recent sales */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel
            title="Sales Trend"
            subtitle="Total sales across all branches"
            className="xl:col-span-2"
            action={
              <select
                value={dashboard?.granularity || ''}
                onChange={(event) => {
                  const nextGranularity = event.target.value
                  if (nextGranularity === 'WEEKLY' && ['TODAY', '7D'].includes(period)) {
                    setPeriod('30D')
                  }
                  if (nextGranularity === 'MONTHLY' && ['TODAY', '7D', '30D'].includes(period)) {
                    setPeriod('3M')
                  }
                  setGranularity(nextGranularity)
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              >
                {granularityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0) + option.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            }
          >
            {salesData.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(value, 2)
                    }
                    labelStyle={{ color: '#000' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Inbox}
                title="No sales in this period"
                hint="Pick a wider timeframe or record your first order."
              />
            )}
          </Panel>

          <Panel
            title="Recent Sales"
            action={<PanelLink href="/store/transactions">View All</PanelLink>}
          >
            {recentSales.length ? (
              <div className="-my-1 divide-y divide-slate-100 dark:divide-white/5">
                {recentSales.map((sale, index) => {
                  const tone = branchTone(index)
                  const chip =
                    STATUS_CHIPS[sale.status] || 'bg-slate-500/10 text-slate-500 dark:text-slate-400'
                  return (
                    <div
                      key={sale.orderId}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span
                        className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-slate-900/5 dark:ring-white/10',
                            tone.chip
                          )}
                        >
                          <ShoppingBag className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {sale.branchName}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{relativeTime(sale.createdAt) || '—'}</span>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              chip
                            )}
                          >
                            {(sale.status || '').replace(/_/g, ' ')}
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(sale.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={ShoppingBag}
                title="No recent sales"
                hint="New orders will show up here as they are recorded."
              />
            )}
          </Panel>
        </div>

        {/* Branch breakdowns + order status */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <Panel title="Branch Wise Sales" subtitle={`Share of total · ${comparison}`}>
            {branchWiseSales.length ? (
              <div className="space-y-5">
                {branchWiseSales.map((branch, index) => {
                  const tone = branchTone(index)
                  const width =
                    branchMaxSales > 0 ? Math.max(3, (branch.sales / branchMaxSales) * 100) : 0
                  return (
                    <div key={branch.branchId ?? branch.name}>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-slate-900/5 dark:ring-white/10',
                            tone.chip
                          )}
                        >
                          <Building2 className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                          {branch.name}
                        </span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(branch.sales)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div
                            className={cn('h-full rounded-full', tone.bar)}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                          {Number(branch.sharePct || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No branches yet"
                hint="Add branches to compare their performance side by side."
              />
            )}
          </Panel>

          <Panel
            title="Branch Performance"
            action={<PanelLink href="/store/branches">View All</PanelLink>}
            bodyClassName="p-0"
          >
            {branchPerformance.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10">
                      <th className="px-5 py-2.5 text-left font-semibold">Branch</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Sales</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Orders</th>
                      <th className="px-5 py-2.5 text-right font-semibold">AOV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {branchPerformance.map((branch, index) => {
                      const tone = branchTone(index)
                      return (
                        <tr
                          key={branch.branchId ?? branch.name}
                          className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                        >
                          <td className="px-5 py-3">
                            <span className="flex items-center gap-2.5">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: tone.dot }}
                              />
                              <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                                {branch.name}
                              </span>
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(branch.sales)}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {formatNumber(branch.orders)}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {formatCurrency(branch.averageOrderValue)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Building2}
                title="No branch data yet"
                hint="Branch figures appear once orders are recorded."
              />
            )}
          </Panel>

          <Panel title="Order Status" className="lg:col-span-2 xl:col-span-1">
            {statusDonut.length ? (
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <div className="relative h-[170px] w-[170px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDonut}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="70%"
                        outerRadius="100%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {statusDonut.map((entry) => (
                          <Cell key={entry.status} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [formatNumber(value), name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatNumber(metrics?.totalOrders || 0)}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total Orders
                    </span>
                  </div>
                </div>

                <ul className="w-full min-w-0 space-y-2.5">
                  {orderStatus.map((entry) => (
                    <li
                      key={entry.status}
                      className="flex items-center gap-3 rounded-lg border border-slate-200/70 px-3 py-2 dark:border-white/10"
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[entry.status] || '#64748b' }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
                        {entry.label}
                      </span>
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatNumber(entry.count)}
                      </span>
                      <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                        {Number(entry.percentage || 0).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="No orders yet"
                hint="The status breakdown appears once orders are placed."
              />
            )}
          </Panel>
        </div>

        {/* Top products + quick actions */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Panel
            title="Top Products"
            subtitle="Ranked by revenue in this period"
            action={<PanelLink href="/store/products">View All</PanelLink>}
            className="xl:col-span-2"
            bodyClassName="p-0"
          >
            {topProducts.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 dark:border-white/10">
                      <th className="w-10 px-5 py-2.5 text-left font-semibold">#</th>
                      <th className="px-5 py-2.5 text-left font-semibold">Product</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Units Sold</th>
                      <th className="px-5 py-2.5 text-right font-semibold">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {topProducts.map((product, index) => (
                      <tr
                        key={product.productId ?? `${product.name}-${index}`}
                        className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <td className="px-5 py-3 text-xs font-bold tabular-nums text-slate-400 dark:text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-3">
                            <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-white/5">
                              {product.image && (
                                <img
                                  src={product.image}
                                  alt=""
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none'
                                  }}
                                />
                              )}
                              <Package className="size-4 text-slate-400" />
                            </span>
                            <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                              {product.name}
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {formatNumber(product.unitsSold)}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title="No product sales yet"
                hint="Products you sell will be ranked here automatically."
              />
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <a
                    key={action.label}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-colors hover:border-blue-500/40 hover:bg-blue-500/5 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-500/40"
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg ring-1',
                        action.tone
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {action.label}
                      </span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {action.description}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
                  </a>
                )
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default StoreAdminDashboard
