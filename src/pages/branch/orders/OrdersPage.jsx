import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  Eye,
  Printer,
  RefreshCw,
  CreditCard,
  DollarSign,
  Smartphone,
  ShoppingCart,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Ban,
  Download,
} from 'lucide-react'
import { orderAPI, userAPI } from '@/services/api'
import { format, startOfWeek, startOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const PERIODS = [
  { key: 'today', label: "Today's Orders" },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
]

const STATUS_OPTIONS = [
  { key: 'all', label: 'All Statuses' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

const PAYMENT_OPTIONS = [
  { key: 'all', label: 'All Payments' },
  { key: 'CASH', label: 'Cash' },
  { key: 'CARD', label: 'Card' },
  { key: 'UPI', label: 'UPI' },
]

const STATUS_CHIP = (status) => {
  const tone = {
    COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    PENDING: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    CANCELLED: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  }[status] || 'bg-slate-500/10 text-slate-500 dark:bg-slate-500/10 dark:text-slate-400'
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full text-xs font-bold px-3 py-1', tone)}>
      <span className="size-3.5">
        {status === 'COMPLETED' ? <CheckCircle2 className="size-3.5" /> :
         status === 'PENDING' ? <Clock className="size-3.5" /> :
         status === 'CANCELLED' ? <Ban className="size-3.5" /> : null}
      </span>
      {status}
    </span>
  )
}

const PaymentBadge = ({ type }) => {
  const tone = {
    CASH: 'bg-emerald-500/10 text-emerald-600',
    CARD: 'bg-blue-500/10 text-blue-600',
    UPI: 'bg-purple-500/10 text-purple-600',
  }[type] || 'bg-slate-500/10 text-slate-500'
  const Icon = {
    CASH: DollarSign,
    CARD: CreditCard,
    UPI: Smartphone,
  }[type] || DollarSign

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full text-xs font-bold px-3 py-1', tone)}>
      <Icon className="size-3.5" />
      {type || 'CASH'}
    </span>
  )
}

const EmptyState = ({ icon, title, hint }) => {
  const Icon = icon || ShoppingCart
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

const OrdersPage = () => {
  const [orders, setOrders] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [period, setPeriod] = useState('today')
  const [status, setStatus] = useState('all')
  const [payment, setPayment] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [branchId, setBranchId] = useState(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const pageSize = 10

  useEffect(() => {
    fetchBranchId()
  }, [])

  useEffect(() => {
    if (branchId) {
      setCurrentPage(0)
      fetchOrders(0)
    }
  }, [branchId, period, status, payment])

  useEffect(() => {
    if (branchId) {
      setCurrentPage(0)
      fetchOrders(0)
    }
  }, [searchQuery])

  useEffect(() => {
    if (branchId) {
      filterOrders()
    }
  }, [orders])

  useEffect(() => {
    if (branchId) {
      fetchOrders(currentPage)
    }
  }, [currentPage])

  const fetchBranchId = async () => {
    try {
      const profile = await userAPI.getProfile().catch(() => null)
      if (profile?.branchId) {
        setBranchId(profile.branchId)
      } else {
        setBranchId(1)
      }
    } catch (error) {
      console.error('Error fetching branch ID:', error)
      setBranchId(1)
    }
  }

  const fetchOrders = async (page = 0) => {
    if (!branchId) return
    try {
      setLoading(true)
      const isAllTime = period === 'all'
      const isNoFilters = status === 'all' && payment === 'all'

      if (isAllTime && isNoFilters) {
        const response = await orderAPI.getByBranchPaged(branchId, page, pageSize).catch(() => ({ content: [], totalPages: 0, totalElements: 0 }))
        setOrders(response.content || [])
        setTotalPages(response.totalPages || 0)
        setTotalElements(response.totalElements || 0)
        setFilteredOrders(response.content || [])
      } else {
        setTotalPages(0)
        setTotalElements(0)
        let allOrders = []

        if (period === 'today') {
          allOrders = await orderAPI.getTodayByBranch(branchId).catch(() => [])
        } else if (branchId) {
          const filters = {}
          if (status !== 'all') filters.orderStatus = status
          if (payment !== 'all') filters.paymentType = payment
          allOrders = await orderAPI.getByBranch(branchId, filters).catch(() => [])
        } else {
          allOrders = await orderAPI.getAll().catch(() => [])
        }

        let filtered = (allOrders || []).filter((order) => {
          if (period === 'week') {
            const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
            if (!order.createdAt || new Date(order.createdAt) < weekStart) return false
          } else if (period === 'month') {
            const monthStart = startOfMonth(new Date())
            if (!order.createdAt || new Date(order.createdAt) < monthStart) return false
          }
          if (status !== 'all' && period !== 'today') {
            if (order.status !== status) return false
          }
          if (payment !== 'all' && period !== 'today') {
            if (order.paymentType !== payment) return false
          }
          return true
        })

        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        setOrders(filtered)
        setFilteredOrders(filtered)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = orders.filter((order) => {
      const orderId = (order.id || '').toString()
      const customerName = typeof order.customer === 'string'
        ? order.customer
        : (order.customer?.name || order.customer?.fullName || 'Walk-in')

      return orderId.includes(query) || customerName.toLowerCase().includes(query)
    })
    setFilteredOrders(filtered)
    setCurrentPage(0)
  }

  const handleViewOrder = async (orderId) => {
    try {
      const order = await orderAPI.getById(orderId).catch(() => orders.find((o) => o.id === orderId))
      if (!order) {
        toast.error('Could not retrieve order details')
        return
      }
      setSelectedOrder(order)
      setIsViewDialogOpen(true)
    } catch (error) {
      console.error('Error fetching order details:', error)
      toast.error('Could not retrieve order details')
    }
  }

  const handlePrintOrder = async (order) => {
    try {
      toast.info('Generating PDF receipt…')
      const { downloadInvoicePDF } = await import('@/utils/invoiceGenerator')
      downloadInvoicePDF(order)
      toast.success('Invoice generated successfully!')
    } catch (error) {
      console.error('Error generating PDF invoice:', error)
      toast.error('Failed to generate PDF invoice')
    }
  }

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A'
    return format(new Date(dateTime), 'MMM d, yyyy, hh:mm a')
  }

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      toast.error('No orders available to export')
      return
    }
    const headers = ['Order ID', 'Date', 'Customer', 'Payment Type', 'Status', 'Amount (INR)']
    const rows = filteredOrders.map((order) => [
      `#${order.id}`,
      order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm') : '',
      `"${typeof order.customer === 'string' ? order.customer : (order.customer?.name || 'Walk-in')}"`,
      order.paymentType || 'CASH',
      order.status || 'COMPLETED',
      order.totalAmount || 0,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `branch_orders_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Orders CSV exported successfully!')
  }

  const startIndex = totalPages > 1 ? currentPage * pageSize : 0
  const endIndex = totalPages > 1 ? Math.min(startIndex + pageSize, totalElements) : filteredOrders.length

  return (
    <div className="h-full min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Branch Orders</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                {filteredOrders.length} Orders
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track and manage branch customer transactions, receipts and order histories.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5">
              <FileSpreadsheet className="size-3.5" /> Export CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fetchOrders(currentPage)} className="text-xs font-semibold gap-1.5">
              <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order # or customer…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 h-10 text-sm rounded-lg border border-slate-200 bg-white/50 dark:bg-slate-900 dark:border-white/10 dark:text-slate-200 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={period} onValueChange={(v) => { if (v) setPeriod(v); setCurrentPage(0) }}>
                  <SelectTrigger className="h-10 text-sm rounded-lg border border-slate-200 bg-white/50 dark:bg-slate-900 dark:border-white/10">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={status} onValueChange={(v) => { if (v) setStatus(v); setCurrentPage(0) }}>
                  <SelectTrigger className="h-10 text-sm rounded-lg border border-slate-200 bg-white/50 dark:bg-slate-900 dark:border-white/10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select value={payment} onValueChange={(v) => { if (v) setPayment(v); setCurrentPage(0) }}>
                  <SelectTrigger className="h-10 text-sm rounded-lg border border-slate-200 bg-white/50 dark:bg-slate-900 dark:border-white/10">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((p) => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {totalPages > 1 ? `Page ${currentPage + 1} of ${totalPages}` : `${filteredOrders.length} results`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-16 space-y-3 flex-col">
                <div className="size-9 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <p className="text-sm font-semibold text-slate-500">Loading branch orders…</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="No orders found" hint="No orders match your filter or search term." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="min-w-[560px]">
                    <TableHeader className="bg-slate-100 dark:bg-white/5">
                      <TableRow className="border-slate-200 dark:border-white/10">
                        <TableHead className="py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Order ID</TableHead>
                        <TableHead className="py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Date &amp; Time</TableHead>
                        <TableHead className="py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Customer</TableHead>
                        <TableHead className="py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">Amount</TableHead>
                        <TableHead className="py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Payment</TableHead>
                        <TableHead className="py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Status</TableHead>
                        <TableHead className="py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-200 dark:divide-white/5">
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                          <TableCell className="py-4 text-sm font-bold text-blue-600 dark:text-blue-400">#{order.id}</TableCell>
                          <TableCell className="py-4 text-sm text-slate-600 dark:text-slate-400">{formatDateTime(order.createdAt)}</TableCell>
                          <TableCell className="py-4 text-sm font-semibold text-slate-900 dark:text-white">
                            {typeof order.customer === 'string'
                              ? order.customer
                              : (order.customer?.name || order.customer?.fullName || 'Walk-in Customer')}
                          </TableCell>
                          <TableCell className="py-4 text-right text-sm font-bold text-slate-900 dark:text-white">
                            ₹{(order.totalAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="py-4">
                            <PaymentBadge type={order.paymentType} />
                          </TableCell>
                          <TableCell className="py-4">
                            {STATUS_CHIP(order.status || 'COMPLETED')}
                          </TableCell>
                          <TableCell className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button type="button" variant="ghost" size="icon" className="size-9 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer" onClick={() => handleViewOrder(order.id)}>
                                <Eye className="size-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="size-9 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer" onClick={() => handlePrintOrder(order)}>
                                <Printer className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Showing {startIndex + 1}–{endIndex} of {totalElements}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0} className="h-8 text-xs">
                        Previous
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="h-8 text-xs">
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* View order dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 p-6">
            <DialogHeader className="pb-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Order #{selectedOrder?.id}</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {selectedOrder?.createdAt ? formatDateTime(selectedOrder.createdAt) : 'Transaction Details'}
                </DialogDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => selectedOrder && handlePrintOrder(selectedOrder)} className="text-xs font-semibold gap-1.5">
                <Printer className="size-3.5" /> Download PDF
              </Button>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Customer</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {typeof selectedOrder.customer === 'string'
                        ? selectedOrder.customer
                        : (selectedOrder.customer?.name || selectedOrder.customer?.fullName || 'Walk-in Customer')}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Payment Method</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedOrder.paymentType || 'CASH'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Status</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{selectedOrder.status || 'COMPLETED'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Grand Total</span>
                    <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Items Purchased</h4>
                  <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <Table className="min-w-[420px]">
                      <TableHeader className="bg-slate-50 dark:bg-white/5">
                        <TableRow className="border-slate-200 dark:border-white/10">
                          <TableHead className="text-xs font-semibold">Item</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Qty</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Price</TableHead>
                          <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-200 dark:divide-white/5">
                        {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 ? (
                          selectedOrder.orderItems.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs font-semibold text-slate-900 dark:text-white">
                                {item.product?.name || item.name || 'Branch Product'}
                              </TableCell>
                              <TableCell className="text-xs text-right">{item.quantity || 1}</TableCell>
                              <TableCell className="text-xs text-right">₹{(item.price || 0).toFixed(2)}</TableCell>
                              <TableCell className="text-xs text-right font-bold">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-xs text-center p-4 text-slate-500">
                              Standard POS Sale Record
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default OrdersPage
