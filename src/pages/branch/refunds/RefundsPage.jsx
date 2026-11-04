import React, { useCallback, useEffect, useState } from 'react'
import { Eye, FileSpreadsheet, RefreshCw, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  SearchField,
  SelectControl,
  TablePagination,
  formatCurrency,
  thClass,
  tdClass,
  trClass,
} from '@/components/ui/page'
import { refundAPI, userAPI } from '@/services/api'
import { format } from 'date-fns'
import { toast } from 'sonner'

const dateOptions = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
]
const paymentOptions = [
  { value: 'all', label: 'All payments' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
]
const sortOptions = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'amount:desc', label: 'Highest amount' },
  { value: 'amount:asc', label: 'Lowest amount' },
]
const when = (value) => (value ? format(new Date(value), 'MMM d, yyyy · h:mm a') : '—')

export default function RefundsPage() {
  const [branchId, setBranchId] = useState(null)
  const [refunds, setRefunds] = useState([])
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [payment, setPayment] = useState('all')
  const [sort, setSort] = useState('createdAt:desc')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    userAPI
      .getProfile()
      .then((profile) => {
        if (!profile?.branchId) throw new Error('No branch is assigned to this account.')
        setBranchId(profile.branchId)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const fetchRefunds = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    setError('')
    try {
      const [sortBy, direction] = sort.split(':')
      const response = await refundAPI.getByBranchPaged(branchId, page, pageSize, sortBy, direction, {
        search,
        period,
        payment,
      })
      setRefunds(response.content || [])
      setTotal(response.totalElements || 0)
      setPages(response.totalPages || 0)
    } catch (err) {
      setError(err.message || 'Failed to load refunds')
    } finally {
      setLoading(false)
    }
  }, [branchId, page, pageSize, sort, search, period, payment])

  useEffect(() => {
    if (branchId) {
      fetchRefunds()
    }
  }, [branchId, page, pageSize, sort, search, period, payment, revision, fetchRefunds])

  const changeFilter = useCallback(
    (setter) => (value) => {
      setPage(0)
      setter(value)
    },
    [],
  )

  const exportCsv = async () => {
    if (!branchId) return
    try {
      const [sortBy, direction] = sort.split(':')
      const first = await refundAPI.getByBranchPaged(branchId, 0, 100, sortBy, direction, { search, period, payment })
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, (first.totalPages || 1) - 1) }, (_, index) =>
          refundAPI.getByBranchPaged(branchId, index + 1, 100, sortBy, direction, { search, period, payment }),
        ),
      )
      const rows = [...(first.content || []), ...rest.flatMap((item) => item.content || [])]
      const csv = [
        ['Refund ID', 'Order ID', 'Date', 'Reason', 'Payment', 'Amount'],
        ...rows.map((r) => [r.id, r.orderId, r.createdAt || '', r.reason || '', r.paymentType || '', r.amount || 0]),
      ]
        .map((row) =>
          row
            .map((value) => {
              if (value === null || value === undefined) return '""'
              return `"${String(value).replaceAll('"', '""')}"`
            })
            .join(','),
        )
        .join('\r\n')
      const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `branch-refunds-${format(new Date(), 'yyyy-MM-dd')}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Refunds exported')
    } catch (err) {
      toast.error(err.message || 'Could not export refunds.')
    }
  }

  const totalRefundAmount = refunds.reduce((sum, item) => sum + Number(item.amount || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Refunds"
        badge={`${total} refunds`}
        badgeTone="rose"
        description="Review refunds processed for this branch."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!total}>
              <FileSpreadsheet className="size-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRevision((n) => n + 1)}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total processed refunds" value={total.toLocaleString('en-IN')} icon={RotateCcw} tone="rose" hint="All refunds for this branch" />
        <MetricCard label="Refunded on this page" value={formatCurrency(totalRefundAmount)} icon={RotateCcw} tone="rose" hint="Sum of amounts in current page" />
        <MetricCard label="Branch reports" value="View Reports" icon={RefreshCw} tone="slate" hint="See full refund audit trail" />
      </div>
      <Panel title="Refund history" subtitle="Branch records only" bodyClassName="p-0">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4 dark:border-white/10">
          <SearchField className="min-w-52" value={search} onChange={changeFilter(setSearch)} placeholder="Refund #, order # or reason…" />
          <SelectControl ariaLabel="Date range" value={period} onChange={changeFilter(setPeriod)} options={dateOptions} />
          <SelectControl ariaLabel="Payment method" value={payment} onChange={changeFilter(setPayment)} options={paymentOptions} />
          <SelectControl ariaLabel="Sort refunds" value={sort} onChange={changeFilter(setSort)} options={sortOptions} />
        </div>
        {error && <p role="alert" className="px-5 py-3 text-sm text-rose-500">{error}</p>}
        {loading ? (
          <LoadingState label="Loading refunds…" />
        ) : refunds.length === 0 ? (
          <EmptyState icon={RotateCcw} title="No refunds found" hint="Try a different date or payment filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr>
                  <th className={thClass()}>Refund</th>
                  <th className={thClass()}>Order</th>
                  <th className={thClass()}>Date</th>
                  <th className={thClass()}>Reason</th>
                  <th className={thClass()}>Payment</th>
                  <th className={thClass('right')}>Amount</th>
                  <th className={thClass('right')}>Details</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id} className={trClass}>
                    <td className={`${tdClass()} font-semibold text-blue-600 dark:text-blue-400`}>#{refund.id}</td>
                    <td className={tdClass()}>#{refund.orderId}</td>
                    <td className={tdClass()}>{when(refund.createdAt)}</td>
                    <td className={`${tdClass()} max-w-[260px] truncate`}>{refund.reason || '—'}</td>
                    <td className={tdClass()}>{refund.paymentType || '—'}</td>
                    <td className={`${tdClass('right')} font-semibold tabular-nums text-rose-600 dark:text-rose-400`}>{formatCurrency(refund.amount)}</td>
                    <td className={tdClass('right')}>
                      <Button variant="ghost" size="icon" aria-label={`View refund ${refund.id}`} onClick={() => setSelected(refund)}>
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && refunds.length > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={pages}
            unit="refunds"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPage(0)
              setPageSize(size)
            }}
          />
        )}
      </Panel>
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Refund #{selected?.id}</DialogTitle>
          </DialogHeader>
          {selected && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              {[
                ['Order', `#${selected.orderId}`],
                ['Date', when(selected.createdAt)],
                ['Payment', selected.paymentType || '—'],
                ['Cashier', selected.cashier?.fullName || '—'],
                ['Amount', formatCurrency(selected.amount)],
                ['Reason', selected.reason || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
