import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { orderAPI, refundAPI, shiftReportAPI, userAPI } from '@/services/api'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import OrderTable from './OrderTable'
import OrderDetails from './OrderDetails'
import ReturnItemSection from './ReturnItemSection'
import ReturnReceiveDialog from './ReturnReceiveDialog'

const RefundPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '')
  const [loading, setLoading] = useState(true)
  const requestedPage = Number(searchParams.get('page') || 0)
  const [page, setPage] = useState(() => Number.isFinite(requestedPage) && requestedPage >= 0 ? requestedPage : 0)
  const requestedPageSize = Number(searchParams.get('size') || 10)
  const pageSize = Number.isFinite(requestedPageSize) && requestedPageSize > 0 && requestedPageSize <= 100
    ? requestedPageSize
    : 10
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || 'createdAt')
  const [direction, setDirection] = useState(() => searchParams.get('direction') || 'desc')
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [shiftReportId, setShiftReportId] = useState(null)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)
  const [processedRefund, setProcessedRefund] = useState(null)

  useEffect(() => {
    initializeRefundPage()
  }, [page, pageSize, sortBy, direction])

  useEffect(() => {
    const orderId = searchParams.get('orderId')
    if (!orderId || selectedOrder) return
    const order = orders.find(item => String(item.id) === String(orderId))
    if (order) {
      handleSelectOrder(order)
      return
    }
    // Deep links from Order History may target an order on another page.
    orderAPI.getById(orderId).then(handleSelectOrder).catch(() => {})
  }, [orders, searchParams, selectedOrder])

  useEffect(() => {
    setPage(0)
  }, [searchQuery])

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(page))
    next.set('size', String(pageSize))
    next.set('sortBy', sortBy)
    next.set('direction', direction)
    if (searchQuery.trim()) next.set('search', searchQuery.trim())
    else next.delete('search')
    setSearchParams(next, { replace: true })
  }, [page, pageSize, sortBy, direction, searchQuery])

  const initializeRefundPage = async () => {
    try {
      setLoading(true)
      const profile = await userAPI.getProfile()
      if (!profile?.branchId || !profile?.id) {
        throw new Error('Your cashier account is not assigned to a branch')
      }
      const [result, shift] = await Promise.all([
        orderAPI.getByBranchPaged(profile.branchId, page, pageSize, sortBy, direction),
        shiftReportAPI.getCurrent(profile.id).catch(() => null),
      ])
      const data = result?.content || []
      setTotalPages(result?.totalPages || 0)
      setTotalElements(result?.totalElements || 0)
      setOrders(data.filter(order => ['COMPLETED', 'PARTIALLY_REFUNDED'].includes(order.status)))
      setShiftReportId(shift?.id || null)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setOrders([])
      toast.error(error.message || 'Could not load refundable orders')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOrder = (order) => {
    Promise.all([orderAPI.getById(order.id), refundAPI.getByOrder(order.id)])
      .then(([fullOrder, refunds]) => {
        const refundedByOrderItem = (refunds || []).flatMap(refund => refund.items || [])
          .reduce((totals, item) => ({
            ...totals,
            [item.orderItemId]: (totals[item.orderItemId] || 0) + item.quantity,
          }), {})
        setSelectedOrder({ ...fullOrder, refundedByOrderItem, refundHistory: refunds || [] })
      })
      .catch(error => {
        console.error('Error fetching order details:', error)
        setSelectedOrder(order)
      })
  }

  const handleBackToSearch = () => {
    setSelectedOrder(null)
  }

  const handleProcessRefund = async (refundData) => {
    try {
      const refund = await refundAPI.create(refundData)
      setProcessedRefund(refund)
      setRefundDialogOpen(true)
      setSelectedOrder(null)
      setSearchParams({}, { replace: true })
      // Refresh orders list
      initializeRefundPage()
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error(`Error processing refund: ${error.message || 'Unknown error'}`)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#F8FAFE] dark:bg-[#0B1220]">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Return / Refund</h1>
        
        {!selectedOrder && (
          <>
            <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by order ID or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  const next = new URLSearchParams(searchParams)
                  next.set('size', value)
                  setPage(0)
                  setSearchParams(next, { replace: true })
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">Sort orders:</span>
              <Select
                value={`${sortBy}:${direction}`}
              onValueChange={(value) => {
                const [nextSort, nextDirection] = value.split(':')
                setSortBy(nextSort)
                setDirection(nextDirection)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt:desc">Newest first</SelectItem>
                <SelectItem value="createdAt:asc">Oldest first</SelectItem>
                <SelectItem value="id:desc">Highest order ID</SelectItem>
                <SelectItem value="id:asc">Lowest order ID</SelectItem>
              </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {!selectedOrder ? (
          /* Order Table View */
          <div className="h-full overflow-auto p-4 sm:p-6">
            <OrderTable
              orders={orders}
              searchQuery={searchQuery}
              onSelectOrder={handleSelectOrder}
              loading={loading}
            />
            {!loading && totalPages > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages} · {totalElements} orders
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page === 0}
                    onClick={() => setPage(current => current - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage(current => current + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Order Details and Return Section */
          <div className="h-full overflow-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Order Details */}
              <div className="space-y-4">
                <OrderDetails
                  order={selectedOrder}
                  onBack={handleBackToSearch}
                />
              </div>

              {/* Right: Return Item Section */}
              <div className="space-y-4">
                <ReturnItemSection
                  order={selectedOrder}
                  onProcessRefund={handleProcessRefund}
                  shiftReportId={shiftReportId}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Refund Success Dialog */}
      <ReturnReceiveDialog
        open={refundDialogOpen}
        onClose={() => {
          setRefundDialogOpen(false)
          setProcessedRefund(null)
        }}
        refund={processedRefund}
      />
    </div>
  )
}

export default RefundPage
