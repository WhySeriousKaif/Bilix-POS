import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  RefreshCw,
  Search,
  Download,
  Store,
  Info,
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { exportSuperAdminSalesPDF } from '@/utils/reportPdfGenerator'
import {
  orderAPI,
  branchAPI,
  storeAPI,
} from '@/services/api'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const Card = ({ className = '', children }) => <div className={`rounded-xl border bg-white dark:bg-slate-900 ${className}`}>{children}</div>
const CardHeader = ({ children }) => <div className="p-4 pb-2">{children}</div>
const CardContent = ({ className = '', children }) => <div className={`p-4 ${className}`}>{children}</div>
const CardTitle = ({ children }) => <h2 className="text-lg font-bold">{children}</h2>
const compactMoney = (value) => `₹${new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`
const SalesTooltip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/15 dark:bg-slate-800">
    <p className="text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-1 font-semibold text-slate-900 dark:text-white">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payload[0].value)}</p>
  </div>
) : null
const Input = ({ className = '', ...props }) => <input {...props} className={`rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 dark:border-white/15 dark:bg-[#111c35] dark:text-white ${className}`} />
const Button = ({ children, className = '', ...props }) => <button {...props} className={`inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-2 cursor-pointer dark:border-white/15 dark:bg-slate-900 ${className}`}>{children}</button>
const Table = ({ children }) => <table className="w-full text-sm">{children}</table>
const TableHeader = ({ children }) => <thead>{children}</thead>
const TableBody = ({ children }) => <tbody>{children}</tbody>
const TableRow = ({ children }) => <tr className="border-b border-slate-100 dark:border-white/10">{children}</tr>
const TableHead = ({ children, className = '' }) => <th className={`p-3 text-left text-slate-500 ${className}`}>{children}</th>
const TableCell = ({ children, className = '' }) => <td className={`p-3 ${className}`}>{children}</td>

const SuperAdminSalesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all')
  const [storeFilter, setStoreFilter] = useState(() => searchParams.get('storeId') || 'all')
  const [pagedOrders, setPagedOrders] = useState([])
  const [page, setPage] = useState(() => Math.max(0, Number(searchParams.get('page')) || 0))
  const [pageSize, setPageSize] = useState(() => {
    const value = Number(searchParams.get('size')) || 10
    return [10, 25, 50].includes(value) ? value : 10
  })
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || 'createdAt')
  const [direction, setDirection] = useState(() => searchParams.get('direction') || 'desc')
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)
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
  const [selectedAdminId, setSelectedAdminId] = useState(null)
  const selectedAdmin = adminBreakdown.find((admin) => admin.storeId === selectedAdminId)
  const [storeSearch, setStoreSearch] = useState('')
  const [storeSort, setStoreSort] = useState('desc')
  const [storePage, setStorePage] = useState(0)
  const [storePageSize, setStorePageSize] = useState(10)
  const filteredStores = adminBreakdown.filter((store) => `${store.storeName} ${store.storeAdminName} ${store.storeAdminEmail}`.toLowerCase().includes(storeSearch.trim().toLowerCase())).sort((a, b) => {
    const dateDifference = (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0)
    const difference = dateDifference || Number(a.storeId) - Number(b.storeId)
    return storeSort === 'desc' ? -difference : difference
  })
  const storeTotalPages = Math.ceil(filteredStores.length / storePageSize)
  const currentStorePage = Math.min(storePage, Math.max(0, storeTotalPages - 1))
  const visibleStores = filteredStores.slice(currentStorePage * storePageSize, (currentStorePage + 1) * storePageSize)

  useEffect(() => {
    fetchSalesData()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchQuery.trim()
      if (nextSearch !== debouncedSearch) {
        setDebouncedSearch(nextSearch)
        setPage(0)
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchQuery, debouncedSearch])

  useEffect(() => {
    fetchSalesPage()
  }, [page, pageSize, sortBy, direction, debouncedSearch, statusFilter, storeFilter])

  useEffect(() => {
    const next = new URLSearchParams()
    next.set('page', String(page))
    next.set('size', String(pageSize))
    next.set('sortBy', sortBy)
    next.set('direction', direction)
    if (debouncedSearch) next.set('search', debouncedSearch)
    if (statusFilter !== 'all') next.set('status', statusFilter)
    if (storeFilter !== 'all') next.set('storeId', storeFilter)
    setSearchParams(next, { replace: true })
  }, [page, pageSize, sortBy, direction, debouncedSearch, statusFilter, storeFilter, setSearchParams])

  const fetchSalesPage = async () => {
    try {
      setTableLoading(true)
      const result = await orderAPI.getSystemPaged({
        page,
        size: pageSize,
        sortBy,
        direction,
        search: debouncedSearch,
        status: statusFilter === 'all' ? '' : statusFilter,
        storeId: storeFilter === 'all' ? '' : storeFilter,
      })
      setPagedOrders(result?.content || [])
      setTotalPages(result?.totalPages || 0)
      setTotalElements(result?.totalElements || 0)
    } catch (error) {
      console.error('Error fetching paged sales:', error)
      setPagedOrders([])
      setTotalPages(0)
      setTotalElements(0)
      toast.error(error.message || 'Could not load sales')
    } finally {
      setTableLoading(false)
    }
  }

  const fetchSalesData = async () => {
    try {
      setLoading(true)

      // Fetch all stores
      const allStores = await storeAPI.getAll()
      setStores(allStores)

      const [summary, branchArrays] = await Promise.all([
        orderAPI.getSystemSummary(),
        Promise.all(allStores.map((store) => branchAPI.getByStoreId(store.id).catch(() => []))),
      ])

      setStats({
        totalSales: summary.totalSales || 0,
        ordersToday: summary.ordersToday || 0,
        totalRefunds: summary.totalRefunds || 0,
        netSales: summary.netSales || 0,
      })

      setSalesData((summary.dailySales || []).map((item) => ({
        date: format(new Date(`${item.name}T00:00:00`), 'MMM dd'),
        sales: item.amount || 0,
      })))
      setPaymentData((summary.paymentMethods || []).map((item) => ({
        name: getPaymentMethodLabel(item.name),
        value: item.amount || 0,
      })))
      setStoreSalesData((summary.storeSales || [])
        .map(item => {
          const store = allStores.find(s => s.id === item.id)
          return {
            name: store?.brand || store?.name || `Store ${item.id}`,
            sales: item.sales,
            orders: item.orders,
          }
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5))

      const salesByBranch = Object.fromEntries(
        (summary.branchSales || []).map((item) => [item.id, item])
      )

      setAdminBreakdown(allStores.map((store, index) => {
        const branches = branchArrays[index].map((branch) => ({
          branchName: branch.name || `Branch ${branch.id}`,
          sales: Number(salesByBranch[branch.id]?.sales || 0),
          orders: Number(salesByBranch[branch.id]?.orders || 0),
        }))
        return {
          storeId: store.id,
          createdAt: store.createdAt,
          storeAdminId: store.storeAdmin?.id ?? 'unknown',
          storeAdminName: store.storeAdmin?.fullName || 'Unassigned',
          storeAdminEmail: store.storeAdmin?.email || '',
          storeName: store.brand || store.name || `Store ${store.id}`,
          totalSales: branches.reduce((total, branch) => total + branch.sales, 0),
          totalOrders: branches.reduce((total, branch) => total + branch.orders, 0),
          branches,
        }
      }))
    } catch (error) {
      console.error('Error fetching sales data:', error)
    } finally {
      setLoading(false)
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

  const getOrderStore = (order) => stores.find((store) => store.id === (order.branch?.storeId || order.storeId))

  const fetchAllFilteredSales = async () => {
    const first = await orderAPI.getSystemPaged({
      page: 0,
      size: 100,
      sortBy,
      direction,
      search: debouncedSearch,
      status: statusFilter === 'all' ? '' : statusFilter,
      storeId: storeFilter === 'all' ? '' : storeFilter,
    })
    const rows = [...(first?.content || [])]
    for (let exportPage = 1; exportPage < (first?.totalPages || 0); exportPage += 1) {
      const result = await orderAPI.getSystemPaged({
        page: exportPage,
        size: 100,
        sortBy,
        direction,
        search: debouncedSearch,
        status: statusFilter === 'all' ? '' : statusFilter,
        storeId: storeFilter === 'all' ? '' : storeFilter,
      })
      rows.push(...(result?.content || []))
    }
    return rows
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const orders = await fetchAllFilteredSales()
      if (orders.length === 0) {
        toast.error('No sales available to export')
        return
      }
      if (exportFormat === 'pdf') {
        exportSuperAdminSalesPDF(orders, stores)
        toast.success(`PDF exported successfully (${orders.length} sales)`)
        return
      }
      if (exportFormat === 'json') {
        const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `super-admin-sales-export-${format(new Date(), 'yyyy-MM-dd')}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success(`JSON exported successfully (${orders.length} sales)`)
        return
      }

      const headers = ['Date', 'Store', 'Customer', 'Cashier', 'Amount', 'Payment Method', 'Status']
      const rows = orders.map(order => [
        formatDate(order.createdAt),
        getOrderStore(order)?.brand || getOrderStore(order)?.name || 'Unknown',
        order.customer?.name || order.customer?.fullName || 'Unknown',
        order.cashier?.fullName || order.cashier?.email || 'Unknown',
        order.totalAmount || 0,
        getPaymentMethodLabel(order.paymentType),
        getStatusLabel(order.status),
      ])

      const escapeCsvCell = (value) => `"${String(value).replaceAll('"', '""')}"`
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(escapeCsvCell).join(','))
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
      URL.revokeObjectURL(url)
      toast.success(`CSV exported successfully (${orders.length} sales)`)
    } catch (error) {
      console.error('Error exporting sales:', error)
      toast.error(error.message || 'Could not export sales')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="super-admin-sales h-full overflow-auto p-4 sm:p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">System-Wide Sales</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View sales across all stores</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111c35] dark:text-white">
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="pdf">PDF</option>
          </select>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <RefreshCw className="size-4 mr-2 animate-spin" /> : <Download className="size-4 mr-2" />}
            {exporting ? 'Exporting…' : `Export ${exportFormat.toUpperCase()}`}
          </Button>
        </div>
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
            <CardTitle>Daily Sales</CardTitle>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sales recorded each day · Last 7 days</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={salesData} margin={{ top: 12, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="#94a3b8" strokeOpacity={0.18} strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />
                <YAxis width={64} tickFormatter={compactMoney} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<SalesTooltip />} />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#0088FE"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#0088FE', strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                  name="Sales"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Breakdown</CardTitle>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recorded sales by payment method · All time</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 py-2">
              {paymentData.map((method, index) => {
                const total = paymentData.reduce((sum, item) => sum + Number(item.value || 0), 0)
                const share = total > 0 ? Number(method.value) / total * 100 : 0
                const color = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500'][index % 3]
                return <div key={method.name}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2 font-medium"><span className={`size-2 rounded-full ${color}`} />{method.name}</span><span className="font-semibold tabular-nums">{formatCurrency(method.value)} <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">{share.toFixed(1)}%</span></span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, share))}%` }} /></div>
                </div>
              })}
              {!paymentData.length && <p className="py-12 text-center text-sm text-slate-500">No payment data yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Sales Comparison */}
      {storeSalesData.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top Stores by Sales</CardTitle>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Top 5 stores ranked by recorded sales · All time</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                </TableRow></TableHeader>
                <TableBody>{storeSalesData.map((store, index) => (
                  <TableRow key={`${store.name}-${index}`}>
                    <TableCell className="w-16"><span className="inline-flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-semibold text-indigo-500">{index + 1}</span></TableCell>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{store.orders}</TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(store.sales)}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales by Store Admin & Branch */}
      {adminBreakdown.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sales by Store Admin & Branch</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Store totals at a glance. Select the info button to see admin and branch details.
            </p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input aria-label="Search store sales" placeholder="Search store or admin…" value={storeSearch} onChange={(event) => { setStoreSearch(event.target.value); setStorePage(0) }} className="w-full pl-10 text-sm" />
              </div>
              <select aria-label="Store order" value={storeSort} onChange={(event) => { setStoreSort(event.target.value); setStorePage(0) }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-[#111c35]">
                <option value="desc">Newest first</option><option value="asc">Oldest first</option>
              </select>
              <select aria-label="Stores per page" value={storePageSize} onChange={(event) => { setStorePageSize(Number(event.target.value)); setStorePage(0) }} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-[#111c35]">
                <option value={10}>10 per page</option><option value={25}>25 per page</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow></TableHeader>
                <TableBody>{visibleStores.map((admin) => (
                  <TableRow key={admin.storeId}>
                    <TableCell className="font-medium"><div className="flex items-center gap-2"><Store className="size-4 shrink-0 text-blue-500" /><span className="break-words">{admin.storeName}</span></div></TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(admin.totalSales)}</TableCell>
                    <TableCell className="text-right tabular-nums">{admin.totalOrders}</TableCell>
                    <TableCell className="text-right"><button type="button" onClick={() => setSelectedAdminId(admin.storeId)} aria-label={`View details for ${admin.storeName}`} title="View store details" className="inline-flex size-8 items-center justify-center rounded-lg text-blue-500 transition-colors hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-blue-500"><Info className="size-4" /></button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            {!filteredStores.length && <p className="py-8 text-center text-sm text-slate-500">No stores match your search.</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-white/10">
              <span className="text-xs text-slate-500">Showing {filteredStores.length ? currentStorePage * storePageSize + 1 : 0}–{Math.min((currentStorePage + 1) * storePageSize, filteredStores.length)} of {filteredStores.length} stores · Page {storeTotalPages ? currentStorePage + 1 : 0} of {storeTotalPages}</span>
              <div className="flex gap-2">
                <Button disabled={currentStorePage === 0} onClick={() => setStorePage(currentStorePage - 1)} className="text-xs disabled:opacity-50">Previous</Button>
                <Button disabled={currentStorePage + 1 >= storeTotalPages} onClick={() => setStorePage(currentStorePage + 1)} className="text-xs disabled:opacity-50">Next</Button>
              </div>
            </div>
            <Dialog open={Boolean(selectedAdmin)} onOpenChange={(open) => { if (!open) setSelectedAdminId(null) }}>
              <DialogContent className="max-h-[80vh] overflow-y-auto rounded-2xl border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900 sm:max-w-xl">
                <DialogHeader className="pr-6">
                  <DialogTitle className="text-base">Store Sales Details</DialogTitle>
                  <DialogDescription className="text-xs">All-time store totals and sales across each branch.</DialogDescription>
                </DialogHeader>
              {adminBreakdown.filter((admin) => admin.storeId === selectedAdminId).map((admin) => (
                <section key={admin.storeId} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                  <div className="flex items-start gap-2 border-b border-slate-100 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/[0.02]">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500"><Store className="size-4" /></span>
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-slate-900 dark:text-white">{admin.storeName}</h3>
                      <p className="mt-0.5 break-words text-[11px] text-slate-500 dark:text-slate-400">Admin: {admin.storeAdminName}</p>
                      {admin.storeAdminEmail && <p className="break-all text-[11px] text-slate-500 dark:text-slate-400">{admin.storeAdminEmail}</p>}
                    </div>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 border-b border-slate-100 px-3 py-2 dark:border-white/10">
                    <div className="col-span-2"><dt className="text-[11px] text-slate-500 dark:text-slate-400">Total sales</dt><dd className="mt-0.5 break-words text-base font-bold tracking-tight">{formatCurrency(admin.totalSales)}</dd></div>
                    <div><dt className="text-[11px] text-slate-500 dark:text-slate-400">Total orders</dt><dd className="mt-0.5 text-base font-semibold tabular-nums">{admin.totalOrders}</dd></div>
                  </dl>
                  <div className="p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400"><span>Branch breakdown</span><span>{admin.branches.length} {admin.branches.length === 1 ? 'branch' : 'branches'}</span></div>
                    <ul className="divide-y divide-slate-100 dark:divide-white/5">
                      {admin.branches.map((branch, idx) => {
                        const share = admin.totalSales > 0 ? Math.min(100, Math.max(0, branch.sales / admin.totalSales * 100)) : 0
                        return <li key={`${admin.storeAdminId}-${branch.branchName}-${idx}`} className="py-2 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-xs">
                            <div className="min-w-0 flex-1"><p className="break-words font-medium">{branch.branchName}</p><p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{branch.orders} {Number(branch.orders) === 1 ? 'order' : 'orders'}</p></div>
                            <span className="font-semibold tabular-nums">{formatCurrency(branch.sales)}</span>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="img" aria-label={`${branch.branchName}: ${share.toFixed(1)}% of store sales`}><div className="h-full rounded-full bg-blue-500" style={{ width: `${share}%` }} /></div>
                        </li>
                      })}
                    </ul>
                  </div>
                </section>
              ))}
              </DialogContent>
            </Dialog>
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
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }} className="w-full rounded-md border bg-white px-3 py-2 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-[140px]">
                <option value="all">All Status</option><option value="PENDING">Pending</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="REFUNDED">Refunded</option>
              </select>
              <select value={storeFilter} onChange={(e) => { setStoreFilter(e.target.value); setPage(0) }} className="w-full rounded-md border bg-white px-3 py-2 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-[140px]">
                <option value="all">All Stores</option>
                {stores.map((store) => <option key={store.id} value={store.id.toString()}>{store.brand || store.name}</option>)}
              </select>
              <select value={`${sortBy}:${direction}`} onChange={(e) => { const [field, order] = e.target.value.split(':'); setSortBy(field); setDirection(order); setPage(0) }} className="w-full rounded-md border bg-white px-3 py-2 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-[160px]">
                <option value="createdAt:desc">Newest first</option>
                <option value="createdAt:asc">Oldest first</option>
                <option value="totalAmount:desc">Amount high–low</option>
                <option value="totalAmount:asc">Amount low–high</option>
              </select>
              <select value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0) }} className="w-full rounded-md border bg-white px-3 py-2 dark:border-white/15 dark:bg-[#111c35] dark:text-white sm:w-[130px]">
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tableLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="size-8 animate-spin text-blue-600" />
            </div>
          ) : pagedOrders.length === 0 ? (
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
                  {pagedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        {getOrderStore(order)?.brand || getOrderStore(order)?.name || 'Unknown'}
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
          {!tableLoading && totalPages > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalElements)} of {totalElements} sales · Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button disabled={page === 0} onClick={() => setPage((current) => current - 1)} className="disabled:cursor-not-allowed disabled:opacity-50">Previous</Button>
                <Button disabled={page + 1 >= totalPages} onClick={() => setPage((current) => current + 1)} className="disabled:cursor-not-allowed disabled:opacity-50">Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default SuperAdminSalesPage
