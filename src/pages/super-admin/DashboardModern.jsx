import React, { useEffect, useState } from 'react'
import { Activity, ArrowRight, Building2, CheckCircle2, Clock, IndianRupee, PackageCheck, RefreshCw, RotateCcw, ShoppingBag, Store, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { orderAPI, storeAPI, userAPI } from '@/services/api'

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
        <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 truncate text-xl font-black">{currency ? money(value) : number(value)}</p></div>
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

const DashboardModern = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const load = async () => {
    setLoading(true); setError('')
    try {
      const [stores, users, summary, recentPage] = await Promise.all([
        storeAPI.getAll(), userAPI.getAll(), orderAPI.getSystemSummary(), orderAPI.getSystemPaged({ page: 0, size: 5 }),
      ])
      const storeById = Object.fromEntries((stores || []).map((store) => [String(store.id), store]))
      const topStores = (summary.storeSales || []).map((entry) => ({ ...entry, name: storeById[String(entry.id)]?.brand || `Store #${entry.id}` })).sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0)).slice(0, 5)
      setData({ stores: stores || [], users: users || [], summary, recentOrders: recentPage?.content || [], topStores })
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
  const salesData = (summary.dailySales || []).map((entry) => ({ date: entry.name.slice(5), sales: entry.amount }))

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 dark:bg-[#0B1220] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1700px] space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-3xl font-black tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Platform performance, moderation, and operational overview</p></div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold shadow-sm dark:border-white/10 dark:bg-slate-900"><RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{cards.map((item) => <StatCard key={item[0]} item={item} value={values[item[0]]} />)}</div>

        <div className="grid gap-6 xl:grid-cols-5">
          <Panel title="Sales Overview" className="xl:col-span-3" action={<span className="text-xs text-slate-400">Last 7 days</span>}>
            <ResponsiveContainer width="100%" height={300}><LineChart data={salesData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => money(value)} /><Legend /><Line type="monotone" dataKey="sales" name="Sales" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer>
          </Panel>
          <Panel title="Top Performing Stores" className="xl:col-span-2" action={<Link to="/super-admin/stores" className="text-xs font-semibold text-blue-600">View all</Link>}>
            <div className="divide-y divide-slate-100 dark:divide-white/5">{(data?.topStores || []).map((store, index) => <div key={store.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-bold text-blue-600">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{store.name}</p><p className="text-xs text-slate-400">{number(store.orders)} orders</p></div><span className="text-sm font-bold">{money(store.sales)}</span></div>)}{!data?.topStores?.length && <p className="py-10 text-center text-sm text-slate-400">No store sales yet</p>}</div>
          </Panel>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Panel title="Recent Orders" action={<Link to="/super-admin/sales" className="text-xs font-semibold text-blue-600">View all</Link>}>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-slate-100 text-left text-xs text-slate-400 dark:border-white/10"><th className="pb-3">Order</th><th className="pb-3">Branch</th><th className="pb-3">Amount</th><th className="pb-3">Status</th></tr></thead><tbody>{(data?.recentOrders || []).map((order) => <tr key={order.id} className="border-b border-slate-50 last:border-0 dark:border-white/5"><td className="py-3 font-semibold">#{order.id}</td><td className="py-3 text-slate-500">{order.branch?.name || `Branch #${order.branchId || '—'}`}</td><td className="py-3 font-semibold">{money(order.totalAmount)}</td><td className="py-3"><span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-600">{order.status}</span></td></tr>)}</tbody></table></div>
          </Panel>
          <Panel title="Platform Health"><div className="space-y-3">{[[Activity, 'API & database', 'Operational', 'text-emerald-600'], [CheckCircle2, 'Active stores', number(active), 'text-emerald-600'], [Clock, 'Pending approvals', number(pending), 'text-amber-600'], [Building2, 'Blocked stores', number(blocked), 'text-rose-600']].map(([Icon, label, value, color]) => <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-white/10">{React.createElement(Icon, { className: `size-4 ${color}` })}<span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{label}</span><span className={`text-sm font-bold ${color}`}>{value}</span></div>)}</div></Panel>
        </div>

        <Panel title="Quick Actions"><div className="flex flex-wrap gap-3">{[['/super-admin/stores', Store, 'Review Stores'], ['/super-admin/users', Users, 'Manage Users'], ['/super-admin/pending-requests', Clock, 'Pending Requests'], ['/super-admin/sales', ShoppingBag, 'View Sales'], ['/super-admin/assistant', Activity, 'Ask AI Insights']].map(([path, Icon, label]) => <Link key={path} to={path} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-white/5 dark:text-slate-200">{React.createElement(Icon, { className: 'size-4' })}{label}<ArrowRight className="size-3.5" /></Link>)}</div></Panel>
      </div>
    </div>
  )
}

export default DashboardModern
