import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  orderAPI,
  refundAPI,
  branchAPI,
  storeAPI,
  userAPI,
  productAPI,
  employeeAPI,
} from '@/services/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { exportTabularReportPDF } from '@/utils/reportPdfGenerator'

const ReportsPage = () => {
  const [storeId, setStoreId] = useState(null)
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('sales')
  const [dateRange, setDateRange] = useState('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [exportFormat, setExportFormat] = useState('csv')
  
  // Report data
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    fetchStoreId()
  }, [])

  useEffect(() => {
    if (storeId) {
      fetchBranches()
      generateReport()
    }
  }, [storeId, reportType, dateRange, selectedBranch, startDate, endDate])

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

  const fetchBranches = async () => {
    try {
      const data = await branchAPI.getByStoreId(storeId)
      setBranches(data || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
      setBranches([])
    }
  }

  const getDateRange = () => {
    const now = new Date()
    let start = new Date()
    let end = new Date()

    if (startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate),
      }
    }

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        end = new Date(now)
        break
      case 'week':
        start.setDate(start.getDate() - 7)
        break
      case 'month':
        start.setMonth(start.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(start.getMonth() - 3)
        break
      case 'year':
        start.setFullYear(start.getFullYear() - 1)
        break
      default:
        start.setDate(start.getDate() - 7)
    }

    return { start, end }
  }

  const generateReport = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      // Get branches to fetch data from
      const branchesToFetch = selectedBranch === 'all' 
        ? branches 
        : branches.filter(b => b.id.toString() === selectedBranch)

      if (branchesToFetch.length === 0) {
        setReportData(null)
        setLoading(false)
        return
      }

      // Fetch orders and refunds
      const [ordersArrays, refundsArrays] = await Promise.all([
        Promise.all(
          branchesToFetch.map(branch => orderAPI.getByBranch(branch.id).catch(() => []))
        ),
        Promise.all(
          branchesToFetch.map(branch => refundAPI.getByBranch(branch.id).catch(() => []))
        ),
      ])

      const allOrders = ordersArrays.flat()
      const allRefunds = refundsArrays.flat()

      // Filter by date range
      const filteredOrders = allOrders.filter(order => {
        if (!order.createdAt) return false
        const orderDate = new Date(order.createdAt)
        return orderDate >= start && orderDate <= end
      })

      const filteredRefunds = allRefunds.filter(refund => {
        if (!refund.createdAt) return false
        const refundDate = new Date(refund.createdAt)
        return refundDate >= start && refundDate <= end
      })

      // Generate report based on type
      switch (reportType) {
        case 'sales':
          setReportData(generateSalesReport(filteredOrders, filteredRefunds))
          break
        case 'products':
          const productReport = await generateProductReport(filteredOrders)
          setReportData(productReport)
          break
        case 'employees':
          const employeeReport = await generateEmployeeReport(filteredOrders, branchesToFetch)
          setReportData(employeeReport)
          break
        case 'financial':
          setReportData(generateFinancialReport(filteredOrders, filteredRefunds))
          break
        default:
          setReportData(generateSalesReport(filteredOrders, filteredRefunds))
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateSalesReport = (orders, refunds) => {
    const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    const totalRefunds = refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0)
    const netSales = totalSales - totalRefunds
    const totalOrders = orders.length
    const totalRefundCount = refunds.length
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // Sales by day
    const salesByDay = {}
    orders.forEach(order => {
      if (order.createdAt) {
        const date = format(new Date(order.createdAt), 'MMM dd')
        salesByDay[date] = (salesByDay[date] || 0) + (order.totalAmount || 0)
      }
    })

    // Payment method distribution (dynamic from backend)
    const paymentMethods = {}
    orders.forEach(order => {
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

    return {
      type: 'sales',
      summary: {
        totalSales,
        totalRefunds,
        netSales,
        totalOrders,
        totalRefundCount,
        avgOrderValue,
      },
      charts: {
        salesByDay: Object.entries(salesByDay).map(([date, sales]) => ({ date, sales })),
        paymentMethods: Object.entries(paymentMethods).map(([name, value]) => ({
          name: getPaymentMethodLabel(name),
          value,
        })),
      },
    }
  }

  const generateProductReport = async (orders) => {
    // Get all products
    const products = await productAPI.getByStoreId(storeId).catch(() => [])
    
    // Calculate product sales
    const productSales = {}
    orders.forEach(order => {
      if (order.orderItems) {
        order.orderItems.forEach(item => {
          const productId = item.productId || item.product?.id
          const productName = item.product?.name || 'Unknown Product'
          if (!productSales[productId]) {
            productSales[productId] = {
              id: productId,
              name: productName,
              quantity: 0,
              revenue: 0,
            }
          }
          productSales[productId].quantity += item.quantity || 0
          productSales[productId].revenue += (item.price || 0) * (item.quantity || 0)
        })
      }
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      type: 'products',
      summary: {
        totalProducts: products.length,
        productsSold: Object.keys(productSales).length,
        totalRevenue: topProducts.reduce((sum, p) => sum + p.revenue, 0),
      },
      topProducts,
    }
  }

  const generateEmployeeReport = async (orders, branches) => {
    // Get employees
    const allUsers = await userAPI.getAll().catch(() => [])
    const storeEmployees = allUsers.filter(user => 
      user.storeId === storeId || user.store?.id === storeId
    )

    // Calculate employee performance
    const employeeStats = {}
    orders.forEach(order => {
      const cashierId = order.cashierId || order.cashier?.id
      if (cashierId) {
        if (!employeeStats[cashierId]) {
          employeeStats[cashierId] = {
            id: cashierId,
            name: order.cashier?.fullName || 'Unknown',
            orders: 0,
            revenue: 0,
          }
        }
        employeeStats[cashierId].orders += 1
        employeeStats[cashierId].revenue += order.totalAmount || 0
      }
    })

    const topEmployees = Object.values(employeeStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      type: 'employees',
      summary: {
        totalEmployees: storeEmployees.length,
        activeEmployees: Object.keys(employeeStats).length,
        totalRevenue: topEmployees.reduce((sum, e) => sum + e.revenue, 0),
      },
      topEmployees,
    }
  }

  const generateFinancialReport = (orders, refunds) => {
    const totalIncome = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    const totalExpenses = refunds.reduce((sum, refund) => sum + (refund.amount || 0), 0)
    const netAmount = totalIncome - totalExpenses

    // Daily financial summary
    const dailyFinancial = {}
    orders.forEach(order => {
      if (order.createdAt) {
        const date = format(new Date(order.createdAt), 'MMM dd')
        if (!dailyFinancial[date]) {
          dailyFinancial[date] = { income: 0, expenses: 0 }
        }
        dailyFinancial[date].income += order.totalAmount || 0
      }
    })

    refunds.forEach(refund => {
      if (refund.createdAt) {
        const date = format(new Date(refund.createdAt), 'MMM dd')
        if (!dailyFinancial[date]) {
          dailyFinancial[date] = { income: 0, expenses: 0 }
        }
        dailyFinancial[date].expenses += refund.amount || 0
      }
    })

    return {
      type: 'financial',
      summary: {
        totalIncome,
        totalExpenses,
        netAmount,
        profitMargin: totalIncome > 0 ? ((netAmount / totalIncome) * 100).toFixed(2) : 0,
      },
      dailyFinancial: Object.entries(dailyFinancial).map(([date, data]) => ({
        date,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      })),
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleExport = () => {
    if (!reportData) return

    let csvContent = ''
    const headers = []
    const rows = []

    switch (reportData.type) {
      case 'sales':
        headers.push('Date', 'Sales', 'Refunds', 'Net Sales')
        reportData.charts.salesByDay.forEach(item => {
          rows.push([item.date, item.sales, 0, item.sales])
        })
        break
      case 'products':
        headers.push('Product Name', 'Quantity Sold', 'Revenue')
        reportData.topProducts.forEach(product => {
          rows.push([product.name, product.quantity, product.revenue])
        })
        break
      case 'employees':
        headers.push('Employee Name', 'Orders', 'Revenue')
        reportData.topEmployees.forEach(employee => {
          rows.push([employee.name, employee.orders, employee.revenue])
        })
        break
      case 'financial':
        headers.push('Date', 'Income', 'Expenses', 'Net')
        reportData.dailyFinancial.forEach(item => {
          rows.push([item.date, item.income, item.expenses, item.net])
        })
        break
    }

    if (exportFormat === 'pdf') {
      exportTabularReportPDF({
        title: `${reportType} report`,
        subtitle: `Store report for ${dateRange}`,
        columns: headers.map((header, index) => ({ header, key: `c${index}`, width: 20 })),
        rows: rows.map(row => Object.fromEntries(row.map((value, index) => [`c${index}`, value]))),
        filename: `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}`,
      })
      return
    }

    csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  if (loading && !reportData) {
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
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Generate and view detailed reports</p>
        </div>
        {reportData && (
          <div className="flex items-center gap-2">
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="csv">CSV</SelectItem><SelectItem value="pdf">PDF</SelectItem></SelectContent>
            </Select>
            <Button onClick={handleExport}><Download className="size-4 mr-2" />Export Report</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Report</SelectItem>
                  <SelectItem value="products">Product Report</SelectItem>
                  <SelectItem value="employees">Employee Report</SelectItem>
                  <SelectItem value="financial">Financial Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <div>
              <Label>Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {reportData.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(reportData.summary).map(([key, value]) => (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-2xl font-bold mt-1">
                          {typeof value === 'number' && key.includes('Amount') || key.includes('Sales') || key.includes('Revenue') || key.includes('Income') || key.includes('Expenses')
                            ? formatCurrency(value)
                            : value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Charts */}
          {reportData.charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {reportData.charts.salesByDay && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sales Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={reportData.charts.salesByDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="sales" stroke="#0088FE" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {reportData.charts.paymentMethods && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Methods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.charts.paymentMethods}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {reportData.charts.paymentMethods.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tables */}
          {(reportData.topProducts || reportData.topEmployees || reportData.dailyFinancial) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {reportData.type === 'products' && 'Top Products'}
                  {reportData.type === 'employees' && 'Top Employees'}
                  {reportData.type === 'financial' && 'Daily Financial Summary'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm"><thead><tr className="border-b border-white/10 text-left">
                    <th className="py-3">Name</th><th className="py-3">Quantity / Orders</th><th className="py-3 text-right">Revenue</th>
                  </tr></thead><tbody>
                    {(reportData.topProducts || reportData.topEmployees || reportData.dailyFinancial || []).map((row, i) => (
                      <tr key={i} className="border-b border-white/5"><td className="py-3">{row.name || row.date}</td><td className="py-3">{row.quantity ?? row.orders ?? row.income}</td><td className="py-3 text-right">{formatCurrency(row.revenue ?? row.net ?? 0)}</td></tr>
                    ))}
                  </tbody></table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportsPage
