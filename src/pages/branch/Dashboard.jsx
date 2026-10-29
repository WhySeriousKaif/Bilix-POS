import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { orderAPI, refundAPI, customerAPI, shiftReportAPI, userAPI } from '@/services/api'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  CreditCard,
  RefreshCw,
  Package,
  Activity,
  ArrowUpRight,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalSales: 0,
    todaySales: 0,
    totalOrders: 0,
    todayOrders: 0,
    totalCustomers: 0,
    activeCashiers: 0,
    totalRefunds: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [salesData, setSalesData] = useState([])
  const [paymentData, setPaymentData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [branchId, setBranchId] = useState(null)
  const [branchInfo, setBranchInfo] = useState(null)

  useEffect(() => {
    fetchBranchId()
  }, [])

  useEffect(() => {
    if (branchId) {
      fetchDashboardData()
    }
  }, [branchId])

  const fetchBranchId = async () => {
    try {
      const profile = await userAPI.getProfile()
      if (profile?.branchId) {
        setBranchId(profile.branchId)
      } else {
        setBranchId(1) // fallback to 1 if default
      }
    } catch (error) {
      console.error('Error fetching branch ID:', error)
      setBranchId(1)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      const [allOrders, todayOrders, customers, refunds, shiftReports] = await Promise.all([
        orderAPI.getByBranch(branchId).catch(() => []),
        orderAPI.getTodayByBranch(branchId).catch(() => []),
        customerAPI.getAll().catch(() => []),
        refundAPI.getByBranch(branchId).catch(() => []),
        shiftReportAPI.getByBranch(branchId).catch(() => []),
      ])

      const totalSales = allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      const todaySales = todayOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      const totalRefundsAmount = refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0)

      const today = new Date()
      const activeCashiersSet = new Set()
      shiftReports.forEach((shift) => {
        if (shift.shiftStart) {
          const shiftDate = new Date(shift.shiftStart)
          if (
            shiftDate.toDateString() === today.toDateString() &&
            !shift.shiftEnd
          ) {
            activeCashiersSet.add(shift.cashier?.id)
          }
        }
      })

      setStats({
        totalSales: Math.max(0, totalSales - totalRefundsAmount),
        todaySales,
        totalOrders: allOrders.length,
        todayOrders: todayOrders.length,
        totalCustomers: customers.length || 0,
        activeCashiers: activeCashiersSet.size || (allOrders.length > 0 ? 1 : 0),
        totalRefunds: refunds.length,
      })

      const recent = await orderAPI.getRecentByBranch(branchId).catch(() => [])
      setRecentOrders(recent.length > 0 ? recent.slice(0, 5) : allOrders.slice(-5).reverse())

      const salesByDay = {}
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = format(date, 'MMM dd')
        salesByDay[dateStr] = 0
        return dateStr
      })

      allOrders.forEach((order) => {
        if (order.createdAt) {
          const orderDate = new Date(order.createdAt)
          const dateStr = format(orderDate, 'MMM dd')
          if (salesByDay.hasOwnProperty(dateStr)) {
            salesByDay[dateStr] += order.totalAmount || 0
          }
        }
      })

      setSalesData(
        last7Days.map((day) => ({
          date: day,
          sales: salesByDay[day] || 0,
        }))
      )

      const paymentMethods = {}
      allOrders.forEach((order) => {
        const method = order.paymentType || 'CASH'
        paymentMethods[method] = (paymentMethods[method] || 0) + (order.totalAmount || 0)
      })

      setPaymentData(
        Object.entries(paymentMethods).map(([name, value]) => ({
          name,
          value,
        }))
      )

      const productSales = {}
      allOrders.forEach((order) => {
        order.orderItems?.forEach((item) => {
          const productId = item.product?.id || item.id
          const productName = item.product?.name || item.name || 'Product'
          if (!productSales[productId]) {
            productSales[productId] = {
              name: productName,
              quantity: 0,
              revenue: 0,
            }
          }
          productSales[productId].quantity += item.quantity || 1
          productSales[productId].revenue += (item.price || 0) * (item.quantity || 1)
        })
      })

      setTopProducts(
        Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="size-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Loading branch metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page heading — shared admin-panel visual language */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Live operations</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Branch Manager Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Real-time performance, transactions, and staff overview.</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm" className="gap-2 cursor-pointer">
          <RefreshCw className="size-3.5" /> Refresh Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Sales */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
              <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <DollarSign className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-black text-slate-900 dark:text-white">₹{stats.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-[11px] text-slate-500 mt-1">Net revenue after refunds</p>
            </div>
          </CardContent>
        </Card>

        {/* Today Sales */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Sales</span>
              <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-black text-slate-900 dark:text-white">₹{stats.todaySales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">{stats.todayOrders} orders processed today</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
              <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <ShoppingCart className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-black text-slate-900 dark:text-white">{stats.totalOrders}</div>
              <p className="text-[11px] text-slate-500 mt-1">All time branch orders</p>
            </div>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customers</span>
              <div className="size-8 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Users className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-black text-slate-900 dark:text-white">{stats.totalCustomers}</div>
              <p className="text-[11px] text-slate-500 mt-1">Registered branch clients</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Staff */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Staff</span>
              <div className="size-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Activity className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-black text-slate-900 dark:text-white">{stats.activeCashiers}</div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-1">Cashiers currently on shift</p>
            </div>
          </CardContent>
        </Card>

        {/* Refunds */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Refunds</span>
              <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <RefreshCw className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-black text-slate-900 dark:text-white">{stats.totalRefunds}</div>
              <p className="text-[11px] text-slate-500 mt-1">Processed refund requests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Area Chart */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Revenue Performance (7 Days)</CardTitle>
              <p className="text-xs text-slate-500">Daily sales revenue trends across this branch.</p>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip formatter={(val) => [`₹${val}`, 'Sales']} />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Payment Types</CardTitle>
            <p className="text-xs text-slate-500">Breakdown by cash, card & digital payments.</p>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [`₹${val}`, 'Volume']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {paymentData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row: Recent Orders & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Recent Branch Orders</CardTitle>
              <p className="text-xs text-slate-500">Latest completed sales transactions.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/branch/orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 gap-1"
            >
              View All <ChevronRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-xs">
                        #{order.id}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">Order #{order.id}</p>
                        <p className="text-[11px] text-slate-500">
                          {order.createdAt ? format(new Date(order.createdAt), 'MMM d, h:mm a') : 'Recently'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900 dark:text-white">₹{order.totalAmount?.toFixed(2) || '0.00'}</p>
                      <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {order.paymentType || 'CASH'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">No orders recorded yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Quick Branch Operations */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Quick Actions</CardTitle>
            <p className="text-xs text-slate-500">Fast access to manager shortcuts.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => navigate('/branch/orders')}
              variant="outline"
              className="w-full justify-between h-11 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 text-xs font-semibold"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-4 text-blue-600" />
                <span>Process / View Orders</span>
              </div>
              <ArrowUpRight className="size-4" />
            </Button>

            <Button
              onClick={() => navigate('/branch/inventory')}
              variant="outline"
              className="w-full justify-between h-11 border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 text-xs font-semibold"
            >
              <div className="flex items-center gap-2">
                <Package className="size-4 text-emerald-600" />
                <span>Manage Stock Inventory</span>
              </div>
              <ArrowUpRight className="size-4" />
            </Button>

            <Button
              onClick={() => navigate('/branch/employees')}
              variant="outline"
              className="w-full justify-between h-11 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 text-xs font-semibold"
            >
              <div className="flex items-center gap-2">
                <Users className="size-4 text-indigo-600" />
                <span>Staff & Cashiers</span>
              </div>
              <ArrowUpRight className="size-4" />
            </Button>

            <Button
              onClick={() => navigate('/branch/reports')}
              variant="outline"
              className="w-full justify-between h-11 border-slate-200 dark:border-slate-700 hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 text-xs font-semibold"
            >
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-violet-600" />
                <span>Shift & Sales Reports</span>
              </div>
              <ArrowUpRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
