import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Eye,
  RefreshCw,
  RotateCcw,
  X,
  DollarSign,
  Plus,
  Receipt,
  FileText,
} from 'lucide-react'
import { refundAPI, orderAPI, userAPI } from '@/services/api'
import { format } from 'date-fns'
import { toast } from 'sonner'

const RefundsPage = () => {
  const [refunds, setRefunds] = useState([])
  const [filteredRefunds, setFilteredRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRefund, setSelectedRefund] = useState(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [branchId, setBranchId] = useState(null)
  const [page, setPage] = useState(0)
  const pageSize = 10

  const [newRefund, setNewRefund] = useState({
    orderId: '',
    amount: '',
    reason: '',
    paymentType: 'CASH',
  })

  useEffect(() => {
    fetchBranchId()
  }, [])

  useEffect(() => {
    if (branchId) {
      fetchRefunds()
    }
  }, [branchId])

  useEffect(() => {
    filterRefunds()
  }, [searchQuery, refunds])

  useEffect(() => {
    setPage(0)
  }, [searchQuery])

  const fetchBranchId = async () => {
    try {
      const profile = await userAPI.getProfile()
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

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A'
    return format(new Date(dateTime), 'MMM d, yyyy, hh:mm a')
  }

  const fetchRefunds = async () => {
    try {
      setLoading(true)
      const data = branchId ? await refundAPI.getByBranch(branchId).catch(() => []) : await refundAPI.getAll().catch(() => [])
      const sorted = (data || []).sort((a, b) => new Date(b.createdAt || b.refundDate || 0) - new Date(a.createdAt || a.refundDate || 0))
      setRefunds(sorted)
    } catch (error) {
      console.error('Error fetching refunds:', error)
      toast.error('Failed to load refunds')
      setRefunds([])
    } finally {
      setLoading(false)
    }
  }

  const filterRefunds = () => {
    if (!searchQuery.trim()) {
      setFilteredRefunds(refunds)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = refunds.filter(refund => {
      const refundId = refund.id?.toString() || ''
      const orderId = refund.orderId?.toString() || ''
      const reason = refund.reason?.toLowerCase() || ''

      return (
        refundId.includes(query) ||
        orderId.includes(query) ||
        reason.includes(query)
      )
    })
    setFilteredRefunds(filtered)
  }

  const handleViewRefund = async (refund) => {
    try {
      let order = null
      if (refund.orderId) {
        try {
          order = await orderAPI.getById(refund.orderId)
        } catch (err) {
          console.error('Error fetching order:', err)
        }
      }
      setSelectedRefund({ ...refund, order })
      setIsViewDialogOpen(true)
    } catch (error) {
      console.error('Error fetching refund details:', error)
    }
  }

  const handleCreateRefund = async () => {
    try {
      if (!newRefund.orderId) {
        toast.error('Order ID is required')
        return
      }
      if (!newRefund.amount || parseFloat(newRefund.amount) <= 0) {
        toast.error('Valid refund amount is required')
        return
      }

      await refundAPI.create({
        orderId: parseInt(newRefund.orderId),
        branchId: branchId || 1,
        amount: parseFloat(newRefund.amount),
        reason: newRefund.reason || 'Customer request',
        paymentType: newRefund.paymentType,
      })

      setIsCreateDialogOpen(false)
      setNewRefund({ orderId: '', amount: '', reason: '', paymentType: 'CASH' })
      fetchRefunds()
      toast.success('Refund processed successfully!')
    } catch (error) {
      console.error('Error creating refund:', error)
      toast.error('Failed to process refund')
    }
  }

  const totalRefundAmount = refunds.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalPages = Math.max(1, Math.ceil(filteredRefunds.length / pageSize))
  const visibleRefunds = filteredRefunds.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Branch Refunds</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
              {refunds.length} Refund Records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Audit, process, and track customer return & refund transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="size-4" /> Process Refund
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRefunds}
            className="text-xs font-bold border-slate-200 dark:border-slate-700 gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Processed Refunds</p>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{refunds.length}</div>
            </div>
            <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600">
              <RotateCcw className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Value Refunded</p>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">₹{totalRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="size-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600">
              <DollarSign className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search refund ID, order ID, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 space-y-2 flex-col">
              <div className="size-8 rounded-full border-4 border-rose-600 border-t-transparent animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Loading branch refunds...</p>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <RotateCcw className="size-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Refunds Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">No refund transactions match your query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow className="border-slate-100 dark:border-slate-800">
                    <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Refund ID</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Order ID</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Date</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">Amount</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRefunds.map((refund) => (
                    <TableRow key={refund.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <TableCell className="font-bold text-xs text-rose-600 dark:text-rose-400">#{refund.id}</TableCell>
                      <TableCell className="font-bold text-xs text-blue-600 dark:text-blue-400">#{refund.orderId || 'N/A'}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400">{formatDateTime(refund.createdAt || refund.refundDate)}</TableCell>
                      <TableCell className="text-xs text-slate-700 dark:text-slate-300 max-w-xs truncate">{refund.reason || 'Customer request'}</TableCell>
                      <TableCell>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {refund.paymentType || 'CASH'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-black text-rose-600 dark:text-rose-400">
                        ₹{refund.amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
                          onClick={() => handleViewRefund(refund)}
                          title="View Details"
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
                <span className="text-xs font-medium text-slate-500">
                  Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredRefunds.length)} of {filteredRefunds.length} refunds
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(current => current - 1)}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center px-2 text-xs font-semibold text-slate-500">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage(current => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Refund Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">Process Order Refund</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Issue a full or partial refund for a customer purchase.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Order ID *</label>
              <Input
                type="number"
                placeholder="Target order number e.g. 102"
                value={newRefund.orderId}
                onChange={(e) => setNewRefund({ ...newRefund, orderId: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Refund Amount (₹) *</label>
              <Input
                type="number"
                placeholder="Amount to refund"
                value={newRefund.amount}
                onChange={(e) => setNewRefund({ ...newRefund, amount: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Payment Method</label>
              <Select
                value={newRefund.paymentType}
                onValueChange={(val) => setNewRefund({ ...newRefund, paymentType: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash Return</SelectItem>
                  <SelectItem value="CARD">Card Reversal</SelectItem>
                  <SelectItem value="UPI">UPI Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">Reason for Refund</label>
              <Input
                placeholder="Defective product, return, cancellation..."
                value={newRefund.reason}
                onChange={(e) => setNewRefund({ ...newRefund, reason: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(false)} className="text-xs font-bold">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateRefund} className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white">
              Issue Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Refund Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">Refund Record #{selectedRefund?.id}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedRefund ? formatDateTime(selectedRefund.createdAt || selectedRefund.refundDate) : 'Refund Details'}
            </DialogDescription>
          </DialogHeader>

          {selectedRefund && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Order Number:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">#{selectedRefund.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Refund Amount:</span>
                  <span className="font-black text-rose-600 text-sm">₹{selectedRefund.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Payment Type:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRefund.paymentType || 'CASH'}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-medium block">Reason:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{selectedRefund.reason || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RefundsPage
