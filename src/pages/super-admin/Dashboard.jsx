import React, { useState, useEffect } from 'react'
import { RefreshCw, Store, TrendingUp, Clock, Undo2 } from 'lucide-react'
import { format } from 'date-fns'
import { storeAPI, branchAPI, orderAPI, refundAPI } from '@/services/api'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const STATUS_COLORS = { Pending: '#F59E0B', Active: '#2563EB', Blocked: '#EF4444' }
const STORE_SALES_COLORS = ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#0EA5E9']

const StatCard = ({ label, value, sublabel, icon: Icon, colorClass }) => (
  <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</p>
        {sublabel && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sublabel}</p>}
      </div>
      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="size-5" />
      </div>
    </div>
  </div>
)

const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStores: 0,
    pendingRequests: 0,
    totalSales: 0,
    totalRefunds: 0,
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [storeSalesData, setStoreSalesData] = useState([])
  const [topProducts, setTopProducts] = useState([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const allStores = await storeAPI.getAll()

      const totalStores = allStores.length
      const activeStores = allStores.filter((s) => s.storeStatus === 'ACTIVE').length
      const blockedStores = allStores.filter((s) => s.storeStatus === 'BLOCKED').length
      const pendingRequests = allStores.filter((s) => s.storeStatus === 'PENDING').length

      setStatusData([
        { name: 'Pending', value: pendingRequests, color: STATUS_COLORS.Pending },
        { name: 'Active', value: activeStores, color: STATUS_COLORS.Active },
        { name: 'Blocked', value: blockedStores, color: STATUS_COLORS.Blocked },
      ])

      // Fetch branches for every store, then orders/refunds for every branch
      const allBranches = []
      for (const store of allStores) {
        const branches = await branchAPI.getByStoreId(store.id).catch(() => [])
        allBranches.push(...branches)
      }

      const ordersArrays = await Promise.all(
        allBranches.map((branch) => orderAPI.getByBranch(branch.id).catch(() => []))
      )
      const orders = ordersArrays.flat()

      const refundsArrays = await Promise.all(
        allBranches.map((branch) => refundAPI.getByBranch(branch.id).catch(() => []))
      )
      const refunds = refundsArrays.flat()

      const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
      const totalRefunds = refunds.reduce((sum, r) => sum + (r.amount || 0), 0)

      setStats({ totalStores, pendingRequests, totalSales, totalRefunds })

      // Sales vs Refunds for the last 12 months
      // Pin the day to 1 before subtracting months — setMonth() on a date like the
      // 31st rolls over into the next month for any target month with fewer than
      // 31 days (Apr/Jun/Sep/Nov/Feb), which produced duplicate/skipped labels.
      const now = new Date()
      // Key by year-month (not just "MMM") so orders from a different year never
      // collide with the current year's same-named month.
      const last12Months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
        return { key: format(date, 'yyyy-MM'), label: format(date, 'MMM') }
      })
      const salesByMonth = {}
      const refundsByMonth = {}
      last12Months.forEach(({ key }) => {
        salesByMonth[key] = 0
        refundsByMonth[key] = 0
      })
      orders.forEach((order) => {
        if (order.createdAt) {
          const key = format(new Date(order.createdAt), 'yyyy-MM')
          if (salesByMonth.hasOwnProperty(key)) salesByMonth[key] += order.totalAmount || 0
        }
      })
      refunds.forEach((refund) => {
        if (refund.createdAt) {
          const key = format(new Date(refund.createdAt), 'yyyy-MM')
          if (refundsByMonth.hasOwnProperty(key)) refundsByMonth[key] += refund.amount || 0
        }
      })
      setMonthlyData(
        last12Months.map(({ key, label }) => ({ month: label, sales: salesByMonth[key], refunds: refundsByMonth[key] }))
      )

      // Sales by store (top 5)
      const salesByStore = {}
      orders.forEach((order) => {
        const storeId = order.branch?.store?.id
        if (!storeId) return
        salesByStore[storeId] = (salesByStore[storeId] || 0) + (order.totalAmount || 0)
      })
      setStoreSalesData(
        Object.entries(salesByStore)
          .map(([storeId, sales]) => {
            const store = allStores.find((s) => String(s.id) === String(storeId))
            return { name: store?.brand || store?.name || `Store ${storeId}`, value: sales }
          })
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      )

      // Top selling products (by quantity), aggregated across every order item
      const productTotals = {}
      orders.forEach((order) => {
        (order.orderItems || []).forEach((item) => {
          const name = item.product?.name
          if (!name) return
          if (!productTotals[name]) productTotals[name] = { name, qty: 0, revenue: 0 }
          productTotals[name].qty += item.quantity || 0
          productTotals[name].revenue += (item.price || 0) * (item.quantity || 0)
        })
      })
      setTopProducts(
        Object.values(productTotals)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)
      )
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="size-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{format(new Date(), 'd MMMM, yyyy')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Sales Overview chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sales Overview</h2>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Last 12 months</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-white/5" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
              <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
              <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="sales" fill="#2563EB" name="Sales" radius={[4, 4, 0, 0]} />
              <Bar dataKey="refunds" fill="#93C5FD" name="Refunds" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Stores"
            value={stats.totalStores}
            sublabel="registered on Bilix"
            icon={Store}
            colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            label="Total Sales"
            value={`₹${stats.totalSales.toFixed(2)}`}
            sublabel="across all stores"
            icon={TrendingUp}
            colorClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
          />
          <StatCard
            label="Pending Requests"
            value={stats.pendingRequests}
            sublabel="awaiting approval"
            icon={Clock}
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatCard
            label="Total Refunds"
            value={`₹${stats.totalRefunds.toFixed(2)}`}
            sublabel="sales returns"
            icon={Undo2}
            colorClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top selling products */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Top Selling Products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No sales data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/10">
                    <th className="pb-2 font-medium">Product Name</th>
                    <th className="pb-2 font-medium">Total Sold</th>
                    <th className="pb-2 font-medium">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name} className="border-b border-slate-50 dark:border-white/5 last:border-0">
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{p.qty}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">₹{p.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Donuts */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Store Status</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip /><Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Sales by Store</h3>
            {storeSalesData.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No sales data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={storeSalesData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {storeSalesData.map((entry, i) => <Cell key={i} fill={STORE_SALES_COLORS[i % STORE_SALES_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} /><Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminDashboard
