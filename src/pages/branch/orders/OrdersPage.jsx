import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
} from 'lucide-react'
import { orderAPI, userAPI } from '@/services/api'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PageHeader, TablePagination } from '@/components/ui/page'

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
        {status === 'COMPLETED' ? <CheckCircle2 className="size-3.5" /> : status === 'PENDING' ? <Clock className="size-3.5" /> : status === 'CANCELLED' ? <Ban className="size-3.5" /> : null}
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
  const Icon = { CASH: DollarSign, CARD: CreditCard, UPI: Smartphone }[type] || DollarSign
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full text-xs font-bold px-3 py-1', tone)}>
      <Icon className="size-3.5" />
      {type || 'CASH'}
    </span>
  )
}

const EmptyState = ({ icon, title, hint }) => {
  const IconComponent = icon || ShoppingCart
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
        <IconComponent className="size-5" />
      </span>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

const OrdersPage = () => {
  const [orders, setOrders] = useState([])
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
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState('createdAt')
  const [direction, setDirection] = useState('desc')

  const fetchBranchId = useCallback(async () => {
    try {
      const profile = await userAPI.getProfile()
      if (!profile?.branchId) throw new Error('No branch is assigned to this account.')
      setBranchId(profile.branchId)
    } catch (error) {
      console.error('Error fetching branch ID:', error)
      toast.error(error.message || 'Could not identify your branch')
      setLoading(false)
    }
  }, [])

  const fetchOrders = useCallback(
    async (page = 0) => {
      if (!branchId) return
      let active = true
      setLoading(true)
      try {
        const response = await orderAPI.getByBranchPaged(branchId, page, pageSize, sortBy, direction, {
          search: searchQuery,
          period,
          status,
          payment,
        })
        if (!active) return
        setOrders(response.content || [])
        setTotalPages(response.totalPages || 0)
        setTotalElements(response.totalElements || 0)
        setCurrentPage(page)
      } catch (error) {
        toast.error(error.message || 'Failed to load orders')
      } finally {
        if (active) setLoading(false)
      }
      return () => {
        active = false
      }
    },
    [branchId, pageSize, sortBy, direction, searchQuery, period, status, payment],
  )

  useEffect(() => {
    fetchBranchId()
  }, [fetchBranchId])

  useEffect(() => {
    if (branchId) {
      fetchOrders(0)
    }
  }, [branchId, pageSize, sortBy, direction, searchQuery, period, status, payment]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewOrder = async (orderId) => {
    try {
      const order = await orderAPI.getById(orderId)
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
    if (orders.length === 0) {
      toast.error('No orders available to export')
      return
    }
    const headers = ['Order ID', 'Date', 'Customer', 'Payment Type', 'Status', 'Amount (INR)']
    const rows = orders.map((order) => [
      `#${order.id}`,
      order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm') : '',
      `"${typeof order.customer === 'string' ? order.customer : order.customer?.name || order.customer?.fullName || 'Walk-in'}"`,
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

  return (
    <div className="h-full min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <PageHeader
          title="Branch Orders"
          badge={`${totalElements} orders`}
          description="Track branch customer transactions, receipts and order history."
          actions={
            <>
              <Button type="button" onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5">
                <FileSpreadsheet className="size-3.5" /> Export CSV
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => fetchOrders(currentPage)} className="text-xs font-semibold gap-1.5">
                <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} /> Refresh
              </Button>
            </>
          }
        />

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search order # or customer…"
                value={searchQuery}
                onChange={(e) => {
                  setCurrentPage(0)
                  setSearchQuery(e.target.value)
                }}
                className="w-full h-10 rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
            <Select
              value={period}
              onValueChange={(v) => {
                if (v) setPeriod(v)
                setCurrentPage(0)
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => {
                if (v) setStatus(v)
                setCurrentPage(0)
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={payment}
              onValueChange={(v) => {
                if (v) setPayment(v)
                setCurrentPage(0)
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <select
              aria-label="Sort orders"
              value={`${sortBy}:${direction}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split(':')
                setCurrentPage(0)
                setSortBy(field)
                setDirection(order)
              }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white"
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="totalAmount:desc">Highest amount</option>
              <option value="totalAmount:asc">Lowest amount</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
          <div className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-16 space-y-3 flex-col">
                <div className="size-9 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                <p className="text-sm font-semibold text-slate-500">Loading branch orders…</p>
              </div>
            ) : orders.length === 0 ? (
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
                      {orders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                          <TableCell className="py-4 text-sm font-bold text-blue-600 dark:text-blue-400">#{order.id}</TableCell>
                          <TableCell className="py-4 text-sm text-slate-600 dark:text-slate-400">{formatDateTime(order.createdAt)}</TableCell>
                          <TableCell className="py-4 text-sm font-semibold text-slate-900 dark:text-white">
                            {typeof order.customer === 'string'
                              ? order.customer
                              : order.customer?.name || order.customer?.fullName || 'Walk-in Customer'}
                          </TableCell>
                          <TableCell className="py-4 text-right text-sm font-bold text-slate-900 dark:text-white">₹{(order.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell className="py-4">
                            <PaymentBadge type={order.paymentType} />
                          </TableCell>
                          <TableCell className="py-4">{STATUS_CHIP(order.status || 'COMPLETED')}</TableCell>
                          <TableCell className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button type="button" variant="ghost" size="icon" className="size-9 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10" onClick={() => handleViewOrder(order.id)}>
                                <Eye className="size-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" className="size-9 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" onClick={() => handlePrintOrder(order)}>
                                <Printer className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  page={currentPage}
                  pageSize={pageSize}
                  total={totalElements}
                  totalPages={totalPages}
                  unit="orders"
                  onPageChange={(p) => fetchOrders(p)}
                  onPageSizeChange={(size) => {
                    setCurrentPage(0)
                    setPageSize(size)
                  }}
                />
              </>
            )}
          </div>
        </div>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
              <DialogDescription>{selectedOrder?.createdAt ? formatDateTime(selectedOrder.createdAt) : 'Transaction Details'}</DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Customer</p>
                    <p className="font-semibold">
                      {typeof selectedOrder.customer === 'string'
                        ? selectedOrder.customer
                        : selectedOrder.customer?.name || selectedOrder.customer?.fullName || 'Walk-in'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Payment</p>
                    <p className="font-semibold">{selectedOrder.paymentType || 'CASH'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <p className="font-semibold">{selectedOrder.status || 'COMPLETED'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total</p>
                    <p className="font-semibold">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                  </div>
                </div>
                {selectedOrder.orderItems && selectedOrder.orderItems.length > 0 && (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.orderItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.product?.name || item.name || 'Item'}</TableCell>
                            <TableCell className="text-right">{item.quantity || 1}</TableCell>
                            <TableCell className="text-right">₹{(item.price || 0).toFixed(2)}</TableCell>
                            <TableCell className="text-right">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default OrdersPage
