import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  RefreshCw,
  Search,
  Download,
  Edit,
  Store,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  orderAPI,
  branchAPI,
  storeAPI,
  userAPI,
  shiftReportAPI,
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
import { useSearchParams } from 'react-router-dom'

const SalesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [storeId, setStoreId] = useState(null)
  const [branches, setBranches] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [page, setPage] = useState(() => Math.max(Number(searchParams.get('page') || 0), 0))
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('size') || 10))
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || 'createdAt')
  const [direction, setDirection] = useState(() => searchParams.get('direction') || 'desc')

  // Statistics
  const [stats, setStats] = useState({
    totalSales: 0,
    ordersToday: 0,
    activeCashiers: 0,
    avgOrderValue: 0,
  })

  // Chart data
  const [salesData, setSalesData] = useState([])
  const [paymentData, setPaymentData] = useState([])
  const [branchSalesData, setBranchSalesData] = useState([])

  useEffect(() => {
    fetchStoreId()
  }, [])

  useEffect(() => {
    if (storeId) {
      fetchSalesData()
    }
  }, [storeId])

  useEffect(() => {
    filterOrders()
  }, [searchQuery, statusFilter, paymentMethodFilter, branchFilter, allOrders, sortBy, direction])

  useEffect(() => {
    setPage(0)
  }, [searchQuery, statusFilter, paymentMethodFilter, branchFilter, pageSize, sortBy, direction])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(page)); next.set('size', String(pageSize))
    next.set('sortBy', sortBy); next.set('direction', direction)
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, sortBy, direction])

  const fetchStoreId = async () => {
    try {
      const profile = await userAPI.getProfile()
      if (profile?.storeId) {
        setStoreId(profile.storeId)
      } else {
        const stores = await storeAPI.getByAdmin()
        if (stores && stores.length > 0) {
          setStoreId(stores[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching store ID:', error)
    }
  }

  const fetchSalesData = async () => {
    try {
      setLoading(true)

      // Fetch branches
      const branchesData = await branchAPI.getByStoreId(storeId).catch(() => [])
      setBranches(branchesData)

      // Fetch orders from all branches
      const ordersPromises = branchesData.map(branch =>
        orderAPI.getByBranch(branch.id).catch(() => [])
      )
      const ordersArrays = await Promise.all(ordersPromises)
      const orders = ordersArrays.flat()
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
      const ordersToday = todayOrders.length
      const avgOrderValue = orders.length > 0 ? totalSales / orders.length : 0

      // Get active cashiers (cashiers with active shifts today)
      const cashierRoles = ['ROLE_BRANCH_CASHIER', 'ROLE_CASHIER']
      const allUsers = await userAPI.getAll().catch(() => [])
      const storeCashiers = allUsers.filter(user =>
        (user.storeId === storeId || user.store?.id === storeId) &&
        cashierRoles.includes(user.role)
      )

      const activeCashiersSet = new Set()
      for (const branch of branchesData) {
        try {
          const shifts = await shiftReportAPI.getByBranch(branch.id).catch(() => [])
          shifts.forEach((shift) => {
            if (shift.shiftStart && !shift.shiftEnd) {
              const shiftDate = new Date(shift.shiftStart)
              if (shiftDate.toDateString() === today.toDateString()) {
                activeCashiersSet.add(shift.cashier?.id)
              }
            }
          })
        } catch (error) {
          console.error(`Error fetching shifts for branch ${branch.id}:`, error)
        }
      }

      setStats({
        totalSales,
        ordersToday,
        activeCashiers: activeCashiersSet.size,
        avgOrderValue,
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

      // Convert to array format dynamically - supports any payment method from backend
      const getPaymentMethodLabel = (method) => {
        const methodMap = {
          CASH: 'Cash',
          CARD: 'Card',
          UPI: 'UPI',
          DEBIT_CARD: 'Debit Card',
          CREDIT_CARD: 'Credit Card',
        }
        return methodMap[method] || method
      }

      setPaymentData(
        Object.entries(paymentMethods).map(([name, value]) => ({
          name: getPaymentMethodLabel(name),
          value,
        }))
      )

      // Sales broken down by branch — this is what makes it possible to see whether
      // one branch is carrying the store or several are contributing evenly.
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

      setBranchSalesData(
        branchesData.map((branch) => ({
          name: branch.name || `Branch ${branch.id}`,
          sales: salesByBranch[branch.id]?.sales || 0,
          orders: salesByBranch[branch.id]?.orders || 0,
        }))
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
        return (
          customerName.toLowerCase().includes(query) ||
          cashierName.toLowerCase().includes(query)
        )
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter((order) => order.paymentType === paymentMethodFilter)
    }

    // Branch filter
    if (branchFilter !== 'all') {
      filtered = filtered.filter((order) => order.branch?.id?.toString() === branchFilter)
    }

    filtered.sort((a, b) => {
      const left = sortBy === 'totalAmount' ? Number(a.totalAmount || 0) : new Date(a.createdAt || 0).getTime()
      const right = sortBy === 'totalAmount' ? Number(b.totalAmount || 0) : new Date(b.createdAt || 0).getTime()
      return direction === 'asc' ? left - right : right - left
    })

    setFilteredOrders(filtered)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return format(date, 'MMM d')
  }

  const getPaymentMethodLabel = (method) => {
    if (!method) return 'N/A'
    const methodMap = {
      CASH: 'Cash',
      CARD: 'Card',
      UPI: 'UPI',
    }
    return methodMap[method] || method
  }

  const getStatusLabel = (status) => {
    if (!status) return 'N/A'
    const statusMap = {
      PENDING: 'Pending',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      PARTIALLY_REFUNDED: 'Partially Refunded',
      REFUNDED: 'Refunded',
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status) => {
    const colorMap = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-800',
      REFUNDED: 'bg-orange-100 text-orange-800',
    }
    return colorMap[status] || 'bg-gray-100 text-gray-800'
  }

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Branch', 'Customer', 'Cashier', 'Amount', 'Payment Method', 'Status']
    const rows = filteredOrders.map(order => [
      formatDate(order.createdAt),
      order.branch?.name || 'Unknown',
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

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sales-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const visibleOrders = filteredOrders.slice(page * pageSize, (page + 1) * pageSize)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="size-8 animate-spin text-slate-500 dark:text-slate-400" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Sales Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View and manage all sales transactions</p>
        </div>
        <Button>
          <Store className="size-4 mr-2" />
          + New Sale
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Sales</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalSales)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">+0% from last week</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="size-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Orders Today</p>
                <p className="text-2xl font-bold mt-1">{stats.ordersToday}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">+0% from yesterday</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="size-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Cashiers</p>
                <p className="text-2xl font-bold mt-1">{stats.activeCashiers}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Same as yesterday</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="size-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg. Order Value</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.avgOrderValue)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">+0% from last week</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="size-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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

      {/* Branch Comparison */}
      {branchSalesData.length > 1 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sales by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchSalesData} layout="vertical" margin={{ left: 24, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="sales" fill="#f59e0b" name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle>Sales Report</CardTitle>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500 dark:text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by customer or cashier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                </SelectContent>
              </Select>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={`${sortBy}:${direction}`} onValueChange={(value) => { const [field, order] = value.split(':'); setSortBy(field); setDirection(order) }}>
                <SelectTrigger className="w-full sm:w-[155px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt:desc">Newest first</SelectItem>
                  <SelectItem value="createdAt:asc">Oldest first</SelectItem>
                  <SelectItem value="totalAmount:desc">Amount high–low</SelectItem>
                  <SelectItem value="totalAmount:asc">Amount low–high</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-full sm:w-[125px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="size-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <ShoppingCart className="size-12 mx-auto mb-2 opacity-50" />
              <p>No sales found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>{order.branch?.name || 'Unknown'}</TableCell>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              // View order details - can be expanded to show full order dialog
                              toast('Order Details', {
                                description: `Order ID: ${order.id}\nCustomer: ${order.customer?.name || order.customer?.fullName || 'Unknown'}\nAmount: ${formatCurrency(order.totalAmount || 0)}\nStatus: ${getStatusLabel(order.status)}`,
                              })
                            }}
                            title="View Order Details"
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              // Generate and download PDF invoice
                              import('@/utils/invoiceGenerator').then(({ downloadInvoicePDF }) => {
                                downloadInvoicePDF(order)
                              })
                            }}
                            title="Download Invoice PDF"
                          >
                            <Download className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 0 && (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                  <span>Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredOrders.length)} of {filteredOrders.length} sales · Page {page + 1} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SalesPage
