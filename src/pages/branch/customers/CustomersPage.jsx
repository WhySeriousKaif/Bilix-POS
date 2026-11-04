import { useEffect, useState } from 'react'
import { Edit, Eye, Mail, Phone, RefreshCw, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  Panel,
  SearchField,
  TablePagination,
  formatCurrency,
  thClass,
  tdClass,
  trClass,
} from '@/components/ui/page'
import { customerAPI, userAPI } from '@/services/api'
import { toast } from 'sonner'

export default function CustomersPage() {
  const [branchId, setBranchId] = useState(null)
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

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

  useEffect(() => {
    if (!branchId) return
    let active = true
    setLoading(true)
    setError('')
    customerAPI
      .getByBranchPaged(branchId, page, pageSize, search)
      .then((result) => {
        if (!active) return
        setCustomers(result.content || [])
        setTotal(result.totalElements || 0)
        setPages(result.totalPages || 0)
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load customers.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [branchId, page, pageSize, search, revision])

  const handleEditCustomer = async () => {
    if (!editingCustomer?.name?.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      setSavingEdit(true)
      await customerAPI.update(editingCustomer.id, {
        name: editingCustomer.name.trim(),
        email: editingCustomer.email?.trim() || null,
        phone: editingCustomer.phone?.trim() || null,
      })
      setIsEditDialogOpen(false)
      setEditingCustomer(null)
      setRevision((n) => n + 1)
      toast.success('Customer details updated successfully')
    } catch (err) {
      toast.error(err.message || 'Error updating customer')
    } finally {
      setSavingEdit(false)
    }
  }

  const summary = {
    total,
    withOrders: customers.filter((c) => (c.orderCount || 0) > 0).length,
    revenue: customers.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branch Customers"
        badge={`${total} customers`}
        description="Customers who have purchased at this branch, with branch-only order totals."
        actions={
          <Button variant="outline" size="sm" onClick={() => setRevision((n) => n + 1)}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Customers" value={summary.total.toLocaleString('en-IN')} icon={Users} tone="blue" />
        <MetricCard label="With Orders" value={summary.withOrders.toLocaleString('en-IN')} icon={Users} tone="emerald" hint="At least one order" />
        <MetricCard label="Branch Revenue" value={formatCurrency(summary.revenue)} icon={Users} tone="violet" hint="From branch customers" />
      </div>
      <Panel title="Customer directory" subtitle="Purchases at this branch only" bodyClassName="p-0">
        <div className="border-b border-slate-200 p-4 dark:border-white/10">
          <SearchField
            value={search}
            onChange={(value) => {
              setPage(0)
              setSearch(value)
            }}
            placeholder="Search name, email or phone…"
          />
        </div>
        {error && <p role="alert" className="px-5 py-3 text-sm text-rose-500">{error}</p>}
        {loading ? (
          <LoadingState label="Loading branch customers…" />
        ) : customers.length === 0 ? (
          <EmptyState icon={Users} title="No customers found" hint="Customers appear after their first order at this branch." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thClass()}>Customer</th>
                  <th className={thClass()}>Contact</th>
                  <th className={thClass('right')}>Orders</th>
                  <th className={thClass('right')}>Total spent</th>
                  <th className={thClass('right')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className={trClass}>
                    <td className={tdClass()}>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white">
                          {(customer.name || customer.fullName || 'C')[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{customer.name || customer.fullName || 'Customer'}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">ID: #{customer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass()}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Mail className="size-3.5 text-slate-400" />
                          <span className="truncate max-w-[200px]">{customer.email || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Phone className="size-3.5 text-slate-400" />
                          <span>{customer.phone || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className={tdClass('right')}>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">
                        {customer.orderCount || 0}
                      </span>
                    </td>
                    <td className={`${tdClass('right')} font-semibold tabular-nums`}>{formatCurrency(customer.totalSpent)}</td>
                    <td className={tdClass('right')}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setViewingCustomer(customer)
                            setIsViewDialogOpen(true)
                          }}
                          title="View customer"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCustomer({
                              id: customer.id,
                              name: customer.name || customer.fullName || '',
                              email: customer.email || '',
                              phone: customer.phone || '',
                            })
                            setIsEditDialogOpen(true)
                          }}
                          title="Edit customer"
                        >
                          <Edit className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && customers.length > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={pages}
            unit="customers"
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPage(0)
              setPageSize(size)
            }}
          />
        )}
      </Panel>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update the customer details for this branch.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Name *</label>
              <Input
                value={editingCustomer?.name || ''}
                onChange={(e) => setEditingCustomer((current) => ({ ...current, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email</label>
              <Input
                type="email"
                value={editingCustomer?.email || ''}
                onChange={(e) => setEditingCustomer((current) => ({ ...current, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone</label>
              <Input
                type="tel"
                value={editingCustomer?.phone || ''}
                onChange={(e) => setEditingCustomer((current) => ({ ...current, phone: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCustomer} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>Branch purchase history</DialogDescription>
          </DialogHeader>
          {viewingCustomer && (
            <div className="space-y-4 py-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-bold text-white">
                  {(viewingCustomer.name || viewingCustomer.fullName || 'C')[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 dark:text-white">{viewingCustomer.name || viewingCustomer.fullName || 'Customer'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Customer ID: #{viewingCustomer.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white truncate">{viewingCustomer.email || '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-white">{viewingCustomer.phone || '—'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Orders</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{viewingCustomer.orderCount || 0}</p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Spent</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(viewingCustomer.totalSpent)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
