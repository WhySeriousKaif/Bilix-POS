import React, { useEffect, useState } from 'react'
import { Activity, ArrowRight, Building2, CheckCircle2, Clock, IndianRupee, PackageCheck, RefreshCw, RotateCcw, ShoppingBag, Store, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { orderAPI, storeAPI, userAPI } from '@/services/api'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TablePagination } from '@/components/ui/page'

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0))
const number = (value) => new Intl.NumberFormat('en-IN').format(Number(value || 0))

const cards = [
  ['totalSales', 'Total Sales', ShoppingBag, 'bg-blue-500/10 text-blue-600'],
  ['totalStores', 'Total Stores', Store, 'bg-emerald-500/10 text-emerald-600'],
  ['totalUsers', 'Total Users', Users, 'bg-purple-500/10 text-purple-600'],
  ['ordersToday', 'Orders Today', PackageCheck, 'bg-orange-500/10 text-orange-600'],
  ['netSales', 'Net Sales', IndianRupee, 'bg-violet-500/10 text-violet-600'],
  ['refundAmount', 'Refund Amount', RotateCcw, 'bg-rose-500/10 text-rose-600'],
]

const StatCard = ({ item, value }) => {
  const [key, label, Icon, tone] = item
  const currency = ['totalSales', 'netSales', 'refundAmount'].includes(key)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
        <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 truncate text-base font-black leading-tight sm:text-lg" title={String(currency ? money(value) : number(value))}>{currency ? money(value) : number(value)}</p></div>
      </div>
      <p className="mt-3 text-[11px] text-slate-400">Live platform total</p>
    </div>
  )
}

const Panel = ({ title, action, children, className = '' }) => (
  <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 ${className}`}>
    <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-white/10"><h2 className="font-bold">{title}</h2>{action}</header>
    <div className="p-5">{children}</div>
  </section>
)

const SalesOverview = ({ refreshKey }) => {
  const [days, setDays] = useState(7)
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    orderAPI.getSystemSummary({ days })
      .then((response) => {
        if (!cancelled) setPoints((response.dailySales || []).map((entry) => ({ date: entry.name, sales: Number(entry.amount || 0) })))
      })
      .catch((failure) => { if (!cancelled) setError(failure.message || 'Could not load sales.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days, refreshKey])

  const dateLabel = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const total = points.reduce((sum, point) => sum + point.sales, 0)
  return <Panel title="Sales Overview" className="xl:col-span-3" action={
    <select aria-label="Sales overview period" value={days} onChange={(event) => setDays(Number(event.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-white/15 dark:bg-slate-900">
      <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option>
    </select>
  }>
    {loading ? <p role="status" className="flex h-[300px] items-center justify-center text-sm text-slate-500">Loading sales…</p>
      : error ? <p role="alert" className="flex h-[300px] items-center justify-center text-sm text-rose-500">{error}</p>
        : <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div><p className="text-xs text-slate-500 dark:text-slate-400">Sales in the last {days} days</p><p className="mt-1 text-xl font-bold tracking-tight">{money(total)}</p></div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Daily totals across all stores</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#94a3b8" strokeOpacity={0.18} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="date" tickFormatter={dateLabel} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={28} tickMargin={10} />
              <YAxis width={65} tickFormatter={(value) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/15 dark:bg-slate-800"><p className="text-slate-500 dark:text-slate-400">{dateLabel(label)}</p><p className="mt-1 font-semibold text-slate-900 dark:text-white">{money(payload[0].value)}</p></div> : null} />
              <Line type="monotone" dataKey="sales" name="Sales" stroke="#3b82f6" strokeWidth={2.5} dot={days === 7 ? { r: 3 } : false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </>}
  </Panel>
}

const RecentOrdersDialog = ({ open, onOpenChange }) => {
  const [page, setPage] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError('')
    orderAPI.getSystemPaged({ page, size: 10, sortBy: 'createdAt', direction: 'desc' })
      .then((response) => { if (!cancelled) setResult(response) })
      .catch((failure) => { if (!cancelled) setError(failure.message || 'Could not load orders.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, page])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen) setPage(0) }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Recent Orders</DialogTitle>
          <DialogDescription>Orders across all stores, newest first.</DialogDescription>
        </DialogHeader>
        {loading ? <p role="status" className="py-10 text-center text-sm text-slate-500">Loading orders…</p>
          : error ? <p role="alert" className="py-6 text-sm text-rose-500">{error}</p>
            : !result?.content?.length ? <p className="py-10 text-center text-sm text-slate-500">No orders yet.</p>
              : <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-xs text-slate-500"><tr>{['Order', 'Date', 'Branch', 'Amount', 'Status'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
                    <tbody>{result.content.map((order) => <tr key={order.id} className="border-b border-slate-100 dark:border-white/10">
                      <td className="px-3 py-3 font-semibold">#{order.id}</td>
                      <td className="px-3 py-3 text-slate-500">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</td>
                      <td className="px-3 py-3">{order.branch?.name || `Branch #${order.branchId || '—'}`}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold">{money(order.totalAmount)}</td>
                      <td className="px-3 py-3">{order.status}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
                <TablePagination page={page} pageSize={10} total={result.totalElements} totalPages={result.totalPages} onPageChange={setPage} unit="orders" />
              </>}
      </DialogContent>
    </Dialog>
  )
}

const StorePerformanceDialog = ({ open, onOpenChange, stores }) => {
  const [page, setPage] = useState(0)
  const totalSales = stores.reduce((total, store) => total + Number(store.sales || 0), 0)
  const totalOrders = stores.reduce((total, store) => total + Number(store.orders || 0), 0)

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen) setPage(0) }}>
      <DialogContent className="max-h-[80vh] gap-3 overflow-y-auto rounded-2xl border-slate-200 bg-white p-0 dark:border-white/10 dark:bg-slate-900 sm:max-w-3xl">
        <DialogHeader className="border-b border-slate-100 p-4 pr-10 dark:border-white/10">
          <DialogTitle className="text-base">Store Performance</DialogTitle>
          <DialogDescription className="text-xs">All-time sales and orders by store, ranked by total sales. Stores with recorded orders are shown.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 px-4 sm:grid-cols-3">
          {[[ 'Total sales', money(totalSales)], ['Recorded orders', number(totalOrders)], ['Average order value', money(totalOrders ? totalSales / totalOrders : 0)]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-1 text-lg font-bold tracking-tight">{value}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto px-4 pb-4">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-white/10">
              {['Store', 'Sales', 'Orders', 'Avg. order value', 'Sales share'].map((label) => <th key={label} className="whitespace-nowrap px-2 py-3 first:pl-0">{label}</th>)}
            </tr></thead>
            <tbody>{stores.slice(page * 10, (page + 1) * 10).map((store, index) => {
              const sales = Number(store.sales || 0)
              const orders = Number(store.orders || 0)
              const share = totalSales > 0 ? sales / totalSales * 100 : 0
              return <tr key={store.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                <td className="py-3 pr-2"><div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-500">{page * 10 + index + 1}</span>
                  <div><p className="font-semibold">{store.name}</p><p className="mt-1 text-xs text-slate-500">Store #{store.id}</p></div>
                </div></td>
                <td className="whitespace-nowrap px-2 py-3 font-semibold">{money(sales)}</td>
                <td className="px-2 py-3 tabular-nums">{number(orders)}</td>
                <td className="whitespace-nowrap px-2 py-3">{money(orders ? sales / orders : 0)}</td>
                <td className="min-w-24 px-2 py-3"><p className="mb-1 text-xs tabular-nums text-slate-500">{share.toFixed(1)}%</p><div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.max(0, share))}%` }} /></div></td>
              </tr>
            })}</tbody>
          </table>
          {!stores.length && <p className="py-12 text-center text-sm text-slate-500">No store sales recorded yet.</p>}
        </div>
        <TablePagination page={page} pageSize={10} total={stores.length} totalPages={Math.ceil(stores.length / 10)} onPageChange={setPage} unit="stores" />
      </DialogContent>
    </Dialog>
  )
}

const DashboardModern = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [storesOpen, setStoresOpen] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [stores, users, summary, recentPage] = await Promise.all([
        storeAPI.getAll(), userAPI.getAll(), orderAPI.getSystemSummary(), orderAPI.getSystemPaged({ page: 0, size: 5 }),
      ])
      const storeById = Object.fromEntries((stores || []).map((store) => [String(store.id), store]))
      const storePerformance = (summary.storeSales || []).map((entry) => ({ ...entry, name: storeById[String(entry.id)]?.brand || `Store #${entry.id}` })).sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))
      setData({ stores: stores || [], users: users || [], summary, recentOrders: recentPage?.content || [], topStores: storePerformance.slice(0, 5), storePerformance })
    } catch (loadError) {
      setError(loadError.message || 'Could not load the platform dashboard.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  if (loading && !data) return <div className="flex h-full items-center justify-center"><RefreshCw className="size-8 animate-spin text-blue-600" /></div>

  const stores = data?.stores || []
  const summary = data?.summary || {}
  const values = { ...summary, totalStores: stores.length, totalUsers: data?.users?.length || 0 }
  const pending = stores.filter((store) => store.storeStatus === 'PENDING').length
  const active = stores.filter((store) => store.storeStatus === 'ACTIVE').length
  const blocked = stores.filter((store) => store.storeStatus === 'BLOCKED').length

  return (
    <div className="super-admin-dashboard h-full overflow-y-auto bg-slate-50 p-4 dark:bg-[#0B1220] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-3xl font-black tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Platform performance, moderation, and operational overview</p></div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm dark:border-white/10 dark:bg-slate-900"><RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{cards.map((item) => <StatCard key={item[0]} item={item} value={values[item[0]]} />)}</div>

        <div className="grid gap-6 xl:grid-cols-5">
          <SalesOverview refreshKey={data} />
          <Panel title="Top Performing Stores" className="xl:col-span-2" action={<button type="button" onClick={() => setStoresOpen(true)} className="text-xs font-semibold text-blue-600">View all</button>}>
            <div className="divide-y divide-slate-100 dark:divide-white/5">{(data?.topStores || []).map((store, index) => <div key={store.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-bold text-blue-600">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{store.name}</p><p className="text-xs text-slate-400">{number(store.orders)} orders</p></div><span className="text-sm font-bold">{money(store.sales)}</span></div>)}{!data?.topStores?.length && <p className="py-10 text-center text-sm text-slate-400">No store sales yet</p>}</div>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Recent Orders" action={<button type="button" onClick={() => setOrdersOpen(true)} className="text-xs font-semibold text-blue-600">View all</button>}>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-100 text-left text-xs text-slate-400 dark:border-white/10"><th className="pb-3">Order</th><th className="pb-3">Branch</th><th className="pb-3">Amount</th><th className="pb-3">Status</th></tr></thead><tbody>{(data?.recentOrders || []).map((order) => <tr key={order.id} className="border-b border-slate-50 last:border-0 dark:border-white/5"><td className="py-3 font-semibold">#{order.id}</td><td className="py-3 text-slate-500">{order.branch?.name || `Branch #${order.branchId || '—'}`}</td><td className="py-3 font-semibold">{money(order.totalAmount)}</td><td className="py-3"><span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-600">{order.status}</span></td></tr>)}</tbody></table></div>
          </Panel>
          <Panel title="Platform Health"><div className="space-y-3">{[[Activity, 'API & database', 'Operational', 'text-emerald-600'], [CheckCircle2, 'Active stores', number(active), 'text-emerald-600'], [Clock, 'Pending approvals', number(pending), 'text-amber-600'], [Building2, 'Blocked stores', number(blocked), 'text-rose-600']].map(([Icon, label, value, color]) => <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/10">{React.createElement(Icon, { className: `size-4 ${color}` })}<span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{label}</span><span className={`text-sm font-bold ${color}`}>{value}</span></div>)}</div></Panel>
        </div>

        <Panel title="Quick Actions"><div className="flex flex-wrap gap-3">{[['/super-admin/stores', Store, 'Review Stores'], ['/super-admin/users', Users, 'Manage Users'], ['/super-admin/pending-requests', Clock, 'Pending Requests'], ['/super-admin/sales', ShoppingBag, 'View Sales'], ['/super-admin/assistant', Activity, 'Ask AI Insights']].map(([path, Icon, label]) => <Link key={path} to={path} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-white/5 dark:text-slate-200">{React.createElement(Icon, { className: 'size-4' })}{label}<ArrowRight className="size-3.5" /></Link>)}</div></Panel>
      </div>
      <RecentOrdersDialog open={ordersOpen} onOpenChange={setOrdersOpen} />
      <StorePerformanceDialog open={storesOpen} onOpenChange={setStoresOpen} stores={data?.storePerformance || []} />
    </div>
  )
}

export default DashboardModern
