import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Eye, FileSpreadsheet, RefreshCw } from 'lucide-react'
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
  pillClass,
  thClass,
  tdClass,
  trClass,
} from '@/components/ui/page'
import { orderAPI, refundAPI, userAPI } from '@/services/api'
import { format } from 'date-fns'
import { toast } from 'sonner'

const dateOptions = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
]
const typeOptions = [
  { value: 'all', label: 'All types' },
  { value: 'sale', label: 'Sales' },
  { value: 'refund', label: 'Refunds' },
]
const paymentOptions = [
  { value: 'all', label: 'All payments' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'UPI', label: 'UPI' },
]
const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'high', label: 'Highest amount' },
  { value: 'low', label: 'Lowest amount' },
]

const when = (value) => (value ? format(new Date(value), 'MMM d, yyyy · h:mm a') : '—')

function TransactionDetailDialog({ open, onClose, transaction }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !transaction) {
      setDetail(null)
      setError('')
      return
    }
    let cancelled = false
    const fetchDetail = async () => {
      setLoading(true)
      setError('')
      try {
        if (transaction.type === 'sale' && transaction.id) {
          const order = await orderAPI.getById(transaction.id)
          if (!cancelled) setDetail(order || transaction)
        } else if (transaction.type === 'refund' && transaction.id) {
          const refund = await refundAPI.getById(transaction.id)
          if (!cancelled) setDetail({ ...transaction, ...(refund || {}) })
        } else {
          if (!cancelled) setDetail(transaction)
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load details.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [open, transaction])

  const fmt = (value) => (value ? format(new Date(value), 'MMM d, yyyy · h:mm a') : '—')

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {transaction?.type === 'sale' ? `Order #${transaction?.id || '—'}` : `Refund #${transaction?.id || '—'}`}
          </DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-rose-500">{error}</p>}
        {loading && !detail && !error && <LoadingState label="Loading transaction details…" />}
        {detail && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
            {transaction?.type === 'sale' &&
              [
                ['Order ID', `#${transaction?.id || '—'}`],
                ['Date', fmt(detail.createdAt)],
                ['Customer', typeof detail.customer === 'string' ? detail.customer : detail.customer?.name || detail.customer?.fullName || 'Walk-in'],
                ['Payment', detail.paymentType || transaction.paymentType || 'CASH'],
                ['Status', detail.status || transaction.status || '—'],
                ['Amount', formatCurrency(detail.totalAmount || transaction.amount)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="mt-1 font-medium text-slate-900 dark:text-white">{value}</dd>
                </div>
              ))}
            {transaction?.type === 'refund' &&
              [
                ['Refund ID', `#${transaction?.id || '—'}`],
                ['Original Order', `#${transaction?.orderId || detail.orderId || '—'}`],
                ['Date', fmt(detail.createdAt || transaction.createdAt)],
                ['Payment', detail.paymentType || transaction.paymentType || 'CASH'],
                ['Amount', formatCurrency(detail.amount || transaction.amount)],
                ['Reason', detail.reason || transaction.customer || '—'],
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
  )
}

export default function TransactionsPage() {
  const [branchId, setBranchId] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [type, setType] = useState('all')
  const [payment, setPayment] = useState('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

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

  const fetchTransactions = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    setError('')
    try {
      const [orders, refunds] = await Promise.all([orderAPI.getByBranch(branchId), refundAPI.getByBranch(branchId)])
      setTransactions([
        ...(Array.isArray(orders) ? orders : []).map((order) => ({
          key: `sale-${order.id}`,
          id: order.id,
          type: 'sale',
          createdAt: order.createdAt,
          amount: Number(order.totalAmount || 0),
          paymentType: order.paymentType,
          customer:
            typeof order.customer === 'string'
              ? order.customer
              : order.customer?.name || order.customer?.fullName || 'Walk-in customer',
          status: order.status,
        })),
        ...(Array.isArray(refunds) ? refunds : []).map((refund) => ({
          key: `refund-${refund.id}`,
          id: refund.id,
          orderId: refund.orderId,
          type: 'refund',
          createdAt: refund.createdAt,
          amount: Number(refund.amount || 0),
          paymentType: refund.paymentType,
          customer: refund.reason || 'Refund',
          status: 'REFUNDED',
        })),
      ])
    } catch (err) {
      setError(err.message || 'Unable to load transactions.')
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    if (branchId) {
      fetchTransactions()
    }
  }, [branchId, refreshKey, fetchTransactions])

  const filtered = useMemo(() => {
    const now = new Date()
    const from =
      period === 'today'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : period === 'week'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
        : period === 'month'
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : null
    const query = search.trim().toLowerCase().replace(/^#/, '')
    return transactions
      .filter((item) => {
        if (from && (!item.createdAt || new Date(item.createdAt) < from)) return false
        if (type !== 'all' && item.type !== type) return false
        if (payment !== 'all' && item.paymentType !== payment) return false
        if (
          query &&
          ![item.id, item.orderId, item.customer, item.paymentType]
            .some((part) => String(part || '').toLowerCase().includes(query))
        )
          return false
        return true
      })
      .sort((a, b) =>
        sort === 'high'
          ? b.amount - a.amount
          : sort === 'low'
          ? a.amount - b.amount
          : sort === 'oldest'
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt),
      )
  }, [transactions, search, period, type, payment, sort])

  const sales = filtered.filter((item) => item.type === 'sale').reduce((sum, item) => sum + item.amount, 0)
  const refunds = filtered.filter((item) => item.type === 'refund').reduce((sum, item) => sum + item.amount, 0)
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const rows = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const change = (setter) => (value) => {
    setPage(0)
    setter(value)
  }

  const exportCsv = () => {
    if (!filtered.length) return
    const csv = [
      ['Type', 'ID', 'Order ID', 'Date', 'Customer or Reason', 'Payment', 'Status', 'Amount'],
      ...filtered.map((item) => [
        item.type,
        item.id,
        item.orderId || '',
        item.createdAt || '',
        item.customer,
        item.paymentType || '',
        item.status || '',
        item.amount,
      ]),
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
    anchor.download = `branch-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Transactions exported.')
  }

  const openDetail = (item) => {
    setSelectedTransaction(item)
    setShowDetail(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Transactions"
        badge={`${filtered.length} entries`}
        description="A combined ledger of sales and refunds recorded at this branch."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <FileSpreadsheet className="size-4" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
              <RefreshCw className="size-4" /> Refresh
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Sales" value={formatCurrency(sales)} icon={ArrowDownLeft} tone="emerald" hint="Selected filters" />
        <MetricCard label="Refunds" value={formatCurrency(refunds)} icon={ArrowUpRight} tone="rose" hint="Selected filters" />
        <MetricCard label="Net" value={formatCurrency(sales - refunds)} icon={CreditCard} tone="blue" hint="Sales less refunds" />
      </div>
      <Panel title="Financial ledger" subtitle="Branch sales and refunds" bodyClassName="p-0">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4 dark:border-white/10">
          <SearchField className="min-w-52" value={search} onChange={change(setSearch)} placeholder="Search ID or customer…" />
          <SelectControl ariaLabel="Date range" value={period} onChange={change(setPeriod)} options={dateOptions} />
          <SelectControl ariaLabel="Transaction type" value={type} onChange={change(setType)} options={typeOptions} />
          <SelectControl ariaLabel="Payment method" value={payment} onChange={change(setPayment)} options={paymentOptions} />
          <SelectControl ariaLabel="Sort transactions" value={sort} onChange={change(setSort)} options={sortOptions} />
        </div>
        {error && <p className="px-5 py-3 text-sm text-rose-500">{error}</p>}
        {loading ? (
          <LoadingState label="Loading transactions…" />
        ) : rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No transactions found" hint="Try a different filter or date range." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead>
                <tr>
                  <th className={thClass('right')}>Transaction</th>
                  <th className={thClass()}>Date & Time</th>
                  <th className={thClass()}>Customer / Reason</th>
                  <th className={thClass()}>Payment</th>
                  <th className={thClass()}>Status</th>
                  <th className={thClass('right')}>Amount</th>
                  <th className={thClass('right')}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.key} className={trClass}>
                    <td className={tdClass('right')}>
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">#{item.id}</span>
                    </td>
                    <td className={tdClass()}>
                      <span className="text-slate-600 dark:text-slate-300">{when(item.createdAt)}</span>
                    </td>
                    <td className={tdClass()}>
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px] inline-block">{item.customer}</span>
                    </td>
                    <td className={tdClass()}>
                      <span className="text-slate-600 dark:text-slate-300">{item.paymentType || '—'}</span>
                    </td>
                    <td className={tdClass()}>
                      <span className={pillClass(item.status === 'COMPLETED' || item.status === 'REFUNDED' ? (item.type === 'refund' ? 'rose' : 'emerald') : 'slate')}>
                        {item.status || '—'}
                      </span>
                    </td>
                    <td className={`${tdClass('right')} font-semibold tabular-nums ${item.type === 'refund' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {item.type === 'refund' ? '−' : '+'}
                      {formatCurrency(item.amount)}
                    </td>
                    <td className={tdClass('right')}>
                      <Button variant="ghost" size="icon" aria-label={`View ${item.type} ${item.id}`} onClick={() => openDetail(item)} className="hover:bg-slate-100 dark:hover:bg-white/5">
                        <Eye className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            totalPages={pages}
            unit="transactions"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPage(0)
              setPageSize(size)
            }}
          />
        )}
      </Panel>
      <TransactionDetailDialog open={showDetail} onClose={() => setShowDetail(false)} transaction={selectedTransaction} />
    </div>
  )
}
