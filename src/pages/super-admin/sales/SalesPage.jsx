import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  Search,
  Download,
  Store,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  orderAPI,
  branchAPI,
  storeAPI,
  refundAPI,
} from '@/services/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const Card = ({ className = '', children }) => <div className={`rounded-xl border bg-white dark:bg-slate-900 ${className}`}>{children}</div>
const CardHeader = ({ children }) => <div className="p-4 pb-2">{children}</div>
const CardContent = ({ className = '', children }) => <div className={`p-4 ${className}`}>{children}</div>
const CardTitle = ({ children }) => <h2 className="text-lg font-bold">{children}</h2>
const Input = ({ className = '', ...props }) => <input {...props} className={`rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/15 dark:bg-[#111c35] dark:text-white ${className}`} />
const Button = ({ children, className = '', ...props }) => <button {...props} className={`inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 cursor-pointer dark:border-white/15 dark:bg-slate-900 ${className}`}>{children}</button>
const Table = ({ children }) => <table className="w-full text-sm">{children}</table>
const TableHeader = ({ children }) => <thead>{children}</thead>
const TableBody = ({ children }) => <tbody>{children}</tbody>
const TableRow = ({ children }) => <tr className="border-b border-slate-100 dark:border-white/10">{children}</tr>
const TableHead = ({ children, className = '' }) => <th className={`p-3 text-left text-slate-500 ${className}`}>{children}</th>
const TableCell = ({ children, className = '' }) => <td className={`p-3 ${className}`}>{children}</td>

const SuperAdminSalesPage = () => {
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [storeFilter, setStoreFilter] = useState('all')
  const [allOrders, setAllOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [stores, setStores] = useState([])
  
  // Statistics
  const [stats, setStats] = useState({
    totalSales: 0,
    ordersToday: 0,
    totalRefunds: 0,
    netSales: 0,
  })
  
  // Chart data
  const [salesData, setSalesData] = useState([])
  const [paymentData, setPaymentData] = useState([])
  const [storeSalesData, setStoreSalesData] = useState([])
  const [adminBreakdown, setAdminBreakdown] = useState([])

  useEffect(() => {
    fetchSalesData()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [searchQuery, statusFilter, storeFilter, allOrders])

  const fetchSalesData = async () => {
    try {
      setLoading(true)

      // Fetch all stores
      const allStores = await storeAPI.getAll()
      setStores(allStores)

      // Fetch orders from all branches of all stores. Track which store (and therefore
      // which Store Admin) each branch belongs to, so sales can be broken down by admin.
      const allBranches = []
      const branchToStore = {}
      for (const store of allStores) {
        try {
          const branches = await branchAPI.getByStoreId(store.id).catch(() => [])
          branches.forEach((branch) => {
            branchToStore[branch.id] = store
          })
          allBranches.push(...branches)
        } catch (error) {
          console.error(`Error fetching branches for store ${store.id}:`, error)
        }
      }

      // Fetch orders from all branches
      const ordersArrays = await Promise.all(
        allBranches.map(branch => orderAPI.getByBranch(branch.id).catch(() => []))
      )
      const orders = ordersArrays.flat()

      // Fetch refunds
      const refundsArrays = await Promise.all(
        allBranches.map(branch => refundAPI.getByBranch(branch.id).catch(() => []))
      )
      const allRefunds = refundsArrays.flat()

      setAllOrders(orders)

      // Calculate statistics
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayOrders = orders.filter(order => {
        if (!order.createdAt) return false
        const orderDate = new Date(order.createdAt)
        return orderDate >= today && orderDate < tomorrow
      })

      const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
      const totalRefunds = allRefunds.reduce((sum, refund) => sum + (refund.amount || 0), 0)
      const netSales = totalSales - totalRefunds

      setStats({
        totalSales,
        ordersToday: todayOrders.length,
        totalRefunds: allRefunds.length,
        netSales,
      })

      // Prepare sales data for last 7 days
      const salesByDay = {}
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const dateStr = format(date, 'MMM dd')
        salesByDay[dateStr] = 0
        return dateStr
      })

      orders.forEach((order) => {
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

      // Calculate payment method distribution (dynamic from backend)
      const paymentMethods = {}
      orders.forEach((order) => {
        const method = order.paymentType || 'CASH'
        if (!paymentMethods[method]) {
          paymentMethods[method] = 0
        }
        paymentMethods[method] += order.totalAmount || 0
      })

      // Convert to array format dynamically
      setPaymentData(
        Object.entries(paymentMethods).map(([name, value]) => ({
          name: getPaymentMethodLabel(name),
          value,
        }))
      )

      // Calculate sales by store
      const salesByStore = {}
      orders.forEach((order) => {
        const storeId = order.branch?.store?.id || order.storeId
        if (storeId) {
          if (!salesByStore[storeId]) {
            salesByStore[storeId] = { storeId, sales: 0, orders: 0 }
          }
          salesByStore[storeId].sales += order.totalAmount || 0
          salesByStore[storeId].orders += 1
        }
      })

      const storeSales = Object.values(salesByStore)
        .map(item => {
          const store = allStores.find(s => s.id === item.storeId)
          return {
            name: store?.brand || store?.name || `Store ${item.storeId}`,
            sales: item.sales,
            orders: item.orders,
          }
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10)

      setStoreSalesData(storeSales)

      // Break sales down by Store Admin -> Store -> Branch, so the platform owner can see
      // which admin/brand is driving revenue and which of their branches carry it.
      const salesByBranch = {}
      orders.forEach((order) => {
        const branchId = order.branch?.id
        if (!branchId) return
        if (!salesByBranch[branchId]) {
          salesByBranch[branchId] = { branchId, sales: 0, orders: 0 }
        }
        salesByBranch[branchId].sales += order.totalAmount || 0
        salesByBranch[branchId].orders += 1
      })

      const branchRows = allBranches.map((branch) => {
        const store = branchToStore[branch.id]
        const agg = salesByBranch[branch.id] || { sales: 0, orders: 0 }
        return {
          storeAdminId: store?.storeAdmin?.id ?? 'unknown',
          storeAdminName: store?.storeAdmin?.fullName || 'Unassigned',
          storeAdminEmail: store?.storeAdmin?.email || '',
          storeName: store?.brand || 'Unknown Store',
          branchName: branch.name || `Branch ${branch.id}`,
          sales: agg.sales,
          orders: agg.orders,
        }
      })

      // Group rows under each Store Admin, with a running total per admin, so the UI
      // can show "this admin made X, split across these branches" instead of one flat list.
      const grouped = {}
      branchRows.forEach((row) => {
        if (!grouped[row.storeAdminId]) {
          grouped[row.storeAdminId] = {
            storeAdminId: row.storeAdminId,
            storeAdminName: row.storeAdminName,
            storeAdminEmail: row.storeAdminEmail,
            storeName: row.storeName,
            totalSales: 0,
            totalOrders: 0,
            branches: [],
          }
        }
        grouped[row.storeAdminId].totalSales += row.sales
        grouped[row.storeAdminId].totalOrders += row.orders
        grouped[row.storeAdminId].branches.push(row)
      })

      setAdminBreakdown(
        Object.values(grouped).sort((a, b) => b.totalSales - a.totalSales)
      )
    } catch (error) {
      console.error('Error fetching sales data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = [...allOrders]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((order) => {
        const customerName = order.customer?.name || order.customer?.fullName || 'Unknown Customer'
        const cashierName = order.cashier?.fullName || order.cashier?.email || 'Unknown Cashier'
        const storeName = order.branch?.store?.brand || order.branch?.store?.name || ''
        return (
          customerName.toLowerCase().includes(query) ||
          cashierName.toLowerCase().includes(query) ||
          storeName.toLowerCase().includes(query)
        )
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Store filter
    if (storeFilter !== 'all') {
      filtered = filtered.filter((order) => {
        const storeId = order.branch?.store?.id || order.storeId
        return storeId?.toString() === storeFilter
      })
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
      return dateB - dateA
    })

    setFilteredOrders(filtered)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return format(date, 'MMM d, yyyy')
  }

  const getPaymentMethodLabel = (method) => {
    if (!method) return 'Cash'
    const methodMap = {
      CASH: 'Cash',
      CARD: 'Card',
      UPI: 'UPI',
      DEBIT_CARD: 'Debit Card',
      CREDIT_CARD: 'Credit Card',
    }
    return methodMap[method] || method
  }

  const getStatusLabel = (status) => {
    if (!status) return 'N/A'
    const statusMap = {
      PENDING: 'Pending',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      REFUNDED: 'Refunded',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status) => {
    const colorMap = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-orange-100 text-orange-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  const handleExport = () => {
    const headers = ['Date', 'Store', 'Customer', 'Cashier', 'Amount', 'Payment Method', 'Status']
    const rows = filteredOrders.map(order => [
      formatDate(order.createdAt),
      order.branch?.store?.brand || order.branch?.store?.name || 'Unknown',
      order.customer?.name || order.customer?.fullName || 'Unknown',
      order.cashier?.fullName || order.cashier?.email || 'Unknown',
      order.totalAmount || 0,
      getPaymentMethodLabel(order.paymentType),
      getStatusLabel(order.status),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `super-admin-sales-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">System-Wide Sales</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View sales across all stores</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="size-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalSales)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Orders Today</p>
                <p className="text-2xl font-bold mt-1">{stats.ordersToday}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Refunds</p>
                <p className="text-2xl font-bold mt-1">{stats.totalRefunds}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Sales</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.netSales)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="value" fill="#10b981" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Store Sales Comparison */}
      {storeSalesData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top Stores by Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={storeSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sales by Store Admin & Branch */}
      {adminBreakdown.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sales by Store Admin & Branch</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Every store admin on the platform, and how their sales split across their branches
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store Admin</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminBreakdown.map((admin) => (
                    <React.Fragment key={admin.storeAdminId}>
                      {admin.branches.map((branch, idx) => (
                        <TableRow key={`${admin.storeAdminId}-${branch.branchName}-${idx}`}>
                          {idx === 0 ? (
                            <TableCell rowSpan={admin.branches.length} className="align-top font-medium border-r">
                              <div>{admin.storeAdminName}</div>
                              <div className="text-xs text-muted-foreground">{admin.storeAdminEmail}</div>
                            </TableCell>
                          ) : null}
                          {idx === 0 ? (
                            <TableCell rowSpan={admin.branches.length} className="align-top border-r">
                              {admin.storeName}
                            </TableCell>
                          ) : null}
                          <TableCell>{branch.branchName}</TableCell>
                          <TableCell>{branch.orders}</TableCell>
                          <TableCell className="text-right">{formatCurrency(branch.sales)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50 font-semibold dark:bg-white/5">
                        <TableCell colSpan={3} className="text-right text-slate-600 dark:text-slate-300">
                          Total for {admin.storeAdminName}
                        </TableCell>
                        <TableCell>{admin.totalOrders}</TableCell>
                        <TableCell className="text-right">{formatCurrency(admin.totalSales)}</TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>All Sales</CardTitle>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-md border bg-white px-3 py-2 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-[140px]">
                <option value="all">All Status</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="REFUNDED">Refunded</option>
              </select>
              <select value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)} className="w-full rounded-md border bg-white px-3 py-2 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-[140px]">
                <option value="all">All Stores</option>
                {stores.map((store) => <option key={store.id} value={store.id.toString()}>{store.brand || store.name}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="size-12 mx-auto mb-2 opacity-50" />
              <p>No sales found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        {order.branch?.store?.brand || order.branch?.store?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.customer?.name || order.customer?.fullName || 'Unknown Customer'}
                      </TableCell>
                      <TableCell>
                        {order.cashier?.fullName || order.cashier?.email || 'Unknown Cashier'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(order.totalAmount || 0)}
                      </TableCell>
                      <TableCell>{getPaymentMethodLabel(order.paymentType)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SuperAdminSalesPage
