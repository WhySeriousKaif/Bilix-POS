import React, { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, FileText, Users, Store, ShoppingCart, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { storeAPI, userAPI, orderAPI, branchAPI } from '@/services/api'
import { exportTabularReportPDF } from '@/utils/reportPdfGenerator'

const Card = ({ children, className = '' }) => <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 ${className}`}>{children}</div>
const CardHeader = ({ children }) => <div className="p-6 pb-3">{children}</div>
const CardContent = ({ children, className = '' }) => <div className={`p-6 ${className}`}>{children}</div>
const CardTitle = ({ children }) => <h2 className="text-lg font-bold">{children}</h2>
const Label = ({ children }) => <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{children}</label>
const Input = (props) => <input {...props} />
const Button = ({ children, className = '', ...props }) => <button {...props} className={`inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>{children}</button>

const EXPORT_CONFIG = {
  stores: {
    title: 'Stores Directory',
    columns: [
      { header: 'ID', key: 'id', width: 10 }, { header: 'Store', key: 'name', width: 30 },
      { header: 'Status', key: 'status', width: 18 }, { header: 'Type', key: 'type', width: 22 },
      { header: 'Created', key: 'created', width: 22 },
    ],
    map: (item) => ({ id: item.id, name: item.brand || item.name || 'N/A', status: item.storeStatus || 'N/A', type: item.storeType || 'N/A', created: item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A' }),
  },
  users: {
    title: 'Users Directory',
    columns: [
      { header: 'ID', key: 'id', width: 10 }, { header: 'Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 36 }, { header: 'Role', key: 'role', width: 24 },
      { header: 'Store', key: 'store', width: 12 }, { header: 'Branch', key: 'branch', width: 12 },
      { header: 'Joined', key: 'created', width: 20 },
    ],
    map: (item) => ({ id: item.id, name: item.fullName || 'N/A', email: item.email || 'N/A', role: item.role || 'N/A', store: item.storeId || '—', branch: item.branchId || '—', created: item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A' }),
  },
  orders: {
    title: 'Orders Report',
    columns: [
      { header: 'ID', key: 'id', width: 10 }, { header: 'Date', key: 'created', width: 22 },
      { header: 'Customer', key: 'customer', width: 28 }, { header: 'Cashier', key: 'cashier', width: 28 },
      { header: 'Payment', key: 'payment', width: 18 }, { header: 'Status', key: 'status', width: 20 },
      { header: 'Amount', key: 'amount', width: 20, align: 'right' },
    ],
    map: (item) => ({ id: item.id, created: item.createdAt ? format(new Date(item.createdAt), 'MMM d, yyyy') : 'N/A', customer: item.customer?.name || 'Walk-in Customer', cashier: item.cashier?.fullName || item.cashier?.email || 'N/A', payment: item.paymentType || 'CASH', status: item.status || 'N/A', amount: Number(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) }),
  },
  branches: {
    title: 'Branches Directory',
    columns: [
      { header: 'ID', key: 'id', width: 10 }, { header: 'Branch', key: 'name', width: 26 },
      { header: 'Email', key: 'email', width: 32 }, { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Address', key: 'address', width: 40 }, { header: 'Store ID', key: 'store', width: 14 },
    ],
    map: (item) => ({ id: item.id, name: item.name || 'N/A', email: item.email || 'N/A', phone: item.phone || 'N/A', address: item.address || 'N/A', store: item.storeId || '—' }),
  },
}

// Returns [start, end) for the selected date range, or null for "all time" / invalid custom range
const resolveDateRange = (dateRange, startDate, endDate) => {
  const now = new Date()
  switch (dateRange) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return [start, now]
    }
    case 'week': {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return [start, now]
    }
    case 'month': {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return [start, now]
    }
    case 'year': {
      const start = new Date(now)
      start.setFullYear(start.getFullYear() - 1)
      return [start, now]
    }
    case 'custom':
      if (!startDate || !endDate) return null
      return [new Date(startDate), new Date(new Date(endDate).setHours(23, 59, 59, 999))]
    default:
      return null
  }
}

const filterByDateRange = (items, range) => {
  if (!range) return items
  const [start, end] = range
  return items.filter((item) => {
    if (!item.createdAt) return false
    const created = new Date(item.createdAt)
    return created >= start && created <= end
  })
}

const ExportsPage = () => {
  const [exportType, setExportType] = useState('stores')
  const [dateRange, setDateRange] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formatType, setFormatType] = useState('csv')
  const [exporting, setExporting] = useState(false)

  const exportTypes = [
    { value: 'stores', label: 'Stores', icon: Store },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'orders', label: 'Orders', icon: ShoppingCart },
    { value: 'branches', label: 'Branches', icon: Store },
  ]

  // Every store's branches, fetched once and reused by both the orders and branches exports
  const getAllBranchesAcrossStores = async () => {
    const allStores = await storeAPI.getAll()
    const branchArrays = await Promise.all(
      allStores.map((store) => branchAPI.getByStoreId(store.id).catch(() => []))
    )
    return branchArrays.flat()
  }

  const getAllOrders = async () => {
    const firstPage = await orderAPI.getSystemPaged({ page: 0, size: 100 })
    const orders = [...(firstPage?.content || [])]
    for (let page = 1; page < (firstPage?.totalPages || 0); page += 1) {
      const result = await orderAPI.getSystemPaged({ page, size: 100 })
      orders.push(...(result?.content || []))
    }
    return orders
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const range = resolveDateRange(dateRange, startDate, endDate)
      if (dateRange === 'custom' && !range) {
        toast.error('Please choose a start and end date for a custom range')
        return
      }

      let data = []
      let filename = ''

      switch (exportType) {
        case 'stores':
          data = await storeAPI.getAll()
          filename = `stores-export-${format(new Date(), 'yyyy-MM-dd')}`
          break
        case 'users':
          data = await userAPI.getAll()
          filename = `users-export-${format(new Date(), 'yyyy-MM-dd')}`
          break
        case 'orders': {
          data = await getAllOrders()
          filename = `orders-export-${format(new Date(), 'yyyy-MM-dd')}`
          break
        }
        case 'branches':
          data = await getAllBranchesAcrossStores()
          filename = `branches-export-${format(new Date(), 'yyyy-MM-dd')}`
          break
        default:
          data = []
      }

      data = filterByDateRange(data, range)

      if (data.length === 0) {
        toast.error('No data to export for the selected range')
        return
      }

      const config = EXPORT_CONFIG[exportType]
      const rows = data.map(config.map)
      if (formatType === 'csv') {
        exportToCSV(rows, config.columns, filename)
      } else if (formatType === 'json') {
        exportToJSON(data, filename)
      } else if (formatType === 'pdf') {
        exportTabularReportPDF({
          title: config.title,
          subtitle: `${data.length} records · ${dateRange === 'all' ? 'All time' : 'Selected date range'}`,
          columns: config.columns,
          rows,
          filename,
        })
      }

      toast.success(`Export completed successfully! (${data.length} records)`)
    } catch (error) {
      console.error('Error exporting data:', error)
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const exportToCSV = (data, columns, filename) => {
    if (!data || data.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = columns.map((column) => column.header)
    const rows = data.map(item => columns.map((column) => item[column.key] ?? ''))
    const escapeCell = (value) => `"${String(value).replaceAll('"', '""')}"`

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(escapeCell).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportToJSON = (data, filename) => {
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-auto bg-slate-50/60 p-4 dark:bg-transparent sm:p-6">
      <div className="mb-7">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Exports</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Download clean, structured system reports in the format you need</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        {/* Export Options */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                <Download className="size-5" />
              </div>
              <div>
                <CardTitle>Export configuration</CardTitle>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the records, period, and file type.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
              <Label>Export Type</Label>
                <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-[#111c35] dark:text-white">
                {exportTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              </div>

              <div>
              <Label>Date Range</Label>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-[#111c35] dark:text-white">
                <option value="all">All Time</option><option value="today">Today</option><option value="week">Last 7 Days</option><option value="month">Last 30 Days</option><option value="year">Last Year</option><option value="custom">Custom Range</option>
              </select>
              </div>
            </div>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/5 sm:grid-cols-2">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-[#111c35]"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 dark:border-white/10 dark:bg-[#111c35]"
                  />
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-5 dark:border-white/10">
              <Label>Export Format</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { value: 'csv', label: 'CSV', detail: 'For spreadsheets', icon: FileSpreadsheet, color: 'emerald' },
                  { value: 'json', label: 'JSON', detail: 'For systems & APIs', icon: FileJson, color: 'amber' },
                  { value: 'pdf', label: 'PDF', detail: 'Ready to share', icon: FileText, color: 'rose' },
                ].map((option) => {
                  const Icon = option.icon
                  const selected = formatType === option.value
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => setFormatType(option.value)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/15 dark:bg-blue-500/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'}`}
                    >
                      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${option.color === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : option.color === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold">{option.label}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{option.detail}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
            >
              <Download className={`mr-2 size-5 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Preparing download…' : `Download ${formatType.toUpperCase()}`}
            </Button>
          </CardContent>
        </Card>

        {/* Export Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <CardTitle>Export information</CardTitle>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">What each download contains.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Available data</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/5">
                    <Store className="size-4 text-blue-500" />
                    <span>Stores - All store information</span>
                  </li>
                  <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/5">
                    <Users className="size-4 text-violet-500" />
                    <span>Users - All user accounts</span>
                  </li>
                  <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/5">
                    <ShoppingCart className="size-4 text-emerald-500" />
                    <span>Orders - All order transactions</span>
                  </li>
                  <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-white/5">
                    <Store className="size-4 text-amber-500" />
                    <span>Branches - All branch information</span>
                  </li>
                </ul>
              </div>
              <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">File formats</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li><strong>CSV</strong> — structured rows for Excel and Sheets</li>
                  <li><strong>JSON</strong> — full object data for integrations and APIs</li>
                  <li><strong>PDF</strong> — formatted report for printing and sharing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ExportsPage
