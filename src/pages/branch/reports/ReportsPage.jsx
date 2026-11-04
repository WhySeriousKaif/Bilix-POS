import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Calendar, TrendingUp, Users, Package, RotateCcw, FileSpreadsheet, Sparkles } from 'lucide-react'
import { orderAPI, inventoryAPI, userAPI, refundAPI, customerAPI, employeeAPI } from '@/services/api'
import { PageHeader, Panel, tileClass } from '@/components/ui/page'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  exportSalesReportPDF,
  exportInventoryReportPDF,
  exportStaffReportPDF,
  exportCustomerReportPDF,
  exportRefundsReportPDF,
} from '@/utils/reportPdfGenerator'

const ReportsPage = () => {
  const [downloading, setDownloading] = useState(null)

  const getBranchId = async () => {
    const profile = await userAPI.getProfile()
    if (!profile?.branchId) throw new Error('No branch is assigned to this account.')
    return profile.branchId
  }

  const getBranchCustomers = async (branchId) => {
    const first = await customerAPI.getByBranchPaged(branchId, 0, 100)
    const pages = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      customerAPI.getByBranchPaged(branchId, index + 1, 100)))
    return [...(first.content || []), ...pages.flatMap((page) => page.content || [])]
  }

  const downloadCSV = (filename, headers, rows) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportCSV = async (type) => {
    try {
      setDownloading(`${type}_csv`)
      toast.info(`Generating ${type.toUpperCase()} CSV report...`)

      const branchId = await getBranchId()

      if (type === 'sales' || type === 'daily') {
        const orders = type === 'daily'
          ? await orderAPI.getTodayByBranch(branchId)
          : await orderAPI.getByBranch(branchId)
        const headers = ['Order ID', 'Date', 'Customer', 'Payment Type', 'Status', 'Total Amount (INR)']
        const rows = orders.map(o => [
          o.id,
          o.createdAt ? format(new Date(o.createdAt), 'yyyy-MM-dd HH:mm') : '',
          `"${typeof o.customer === 'string' ? o.customer : (o.customer?.name || 'Walk-in')}"`,
          o.paymentType || 'CASH',
          o.status || 'COMPLETED',
          o.totalAmount || 0,
        ])
        downloadCSV(`branch_${type}_report`, headers, rows)
      } else if (type === 'inventory') {
        const inv = await inventoryAPI.getByBranch(branchId)
        const headers = ['Inventory ID', 'Product Name', 'SKU', 'Category', 'Stock Quantity', 'Unit Price (INR)']
        const rows = inv.map(i => [
          i.id,
          `"${i.product?.name || 'Product'}"`,
          i.product?.sku || '',
          `"${i.product?.category?.name || 'General'}"`,
          i.quantity || 0,
          i.product?.sellingPrice || 0,
        ])
        downloadCSV('branch_inventory_report', headers, rows)
      } else if (type === 'employee') {
        const users = await employeeAPI.getByBranch(branchId)
        const headers = ['User ID', 'Name', 'Email', 'Phone', 'Role']
        const rows = users.map(u => [
          u.id,
          `"${u.fullName || u.name || 'Staff'}"`,
          u.email || '',
          u.phone || '',
          u.role || '',
        ])
        downloadCSV('branch_staff_report', headers, rows)
      } else if (type === 'customer') {
        const customers = await getBranchCustomers(branchId)
        const headers = ['Customer ID', 'Name', 'Email', 'Phone', 'Branch Orders', 'Branch Spend (INR)']
        const rows = customers.map(c => [
          c.id,
          `"${c.name || c.fullName || 'Customer'}"`,
          c.email || '',
          c.phone || '',
          c.orderCount || 0,
          c.totalSpent || 0,
        ])
        downloadCSV('branch_customer_report', headers, rows)
      } else if (type === 'refund') {
        const refunds = await refundAPI.getByBranch(branchId)
        const headers = ['Refund ID', 'Order ID', 'Date', 'Amount (INR)', 'Reason', 'Payment Type']
        const rows = refunds.map(r => [
          r.id,
          r.orderId || '',
          r.createdAt ? format(new Date(r.createdAt), 'yyyy-MM-dd HH:mm') : '',
          r.amount || 0,
          `"${r.reason || ''}"`,
          r.paymentType || 'CASH',
        ])
        downloadCSV('branch_refund_report', headers, rows)
      }

      toast.success(`${type.toUpperCase()} CSV downloaded!`)
    } catch (error) {
      console.error(`Error generating ${type} CSV:`, error)
      toast.error('Failed to generate CSV report')
    } finally {
      setDownloading(null)
    }
  }

  const handleExportPDF = async (type) => {
    try {
      setDownloading(`${type}_pdf`)
      toast.info(`Generating ${type.toUpperCase()} Formatted PDF Report...`)

      const branchId = await getBranchId()

      if (type === 'sales' || type === 'daily') {
        const orders = type === 'daily'
          ? await orderAPI.getTodayByBranch(branchId)
          : await orderAPI.getByBranch(branchId)
        exportSalesReportPDF(orders)
      } else if (type === 'inventory') {
        const inv = await inventoryAPI.getByBranch(branchId)
        exportInventoryReportPDF(inv)
      } else if (type === 'employee') {
        const users = await employeeAPI.getByBranch(branchId)
        const orders = await orderAPI.getByBranch(branchId)
        exportStaffReportPDF(users, orders)
      } else if (type === 'customer') {
        const customers = await getBranchCustomers(branchId)
        exportCustomerReportPDF(customers)
      } else if (type === 'refund') {
        const refunds = await refundAPI.getByBranch(branchId)
        exportRefundsReportPDF(refunds)
      }

      toast.success(`${type.toUpperCase()} Formatted PDF Table Downloaded!`)
    } catch (error) {
      console.error(`Error generating ${type} PDF:`, error)
      toast.error('Failed to generate PDF report table')
    } finally {
      setDownloading(null)
    }
  }

  const reports = [
    { id: 'sales', title: 'Sales Performance', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10', description: 'Comprehensive log of order sales, payment types, and order statuses.' },
    { id: 'daily', title: 'Daily Shift Summary', icon: Calendar, color: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10', description: 'Live today sales breakdown and register transaction totals.' },
    { id: 'inventory', title: 'Stock & Inventory Audit', icon: Package, color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10', description: 'Current stock levels, SKU codes, product categories, and unit valuation.' },
    { id: 'employee', title: 'Staff Performance', icon: Users, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10', description: 'Branch employee directory and sales activity.' },
    { id: 'customer', title: 'Customer Analytics', icon: FileText, color: 'text-violet-600 bg-violet-50 dark:bg-violet-500/10', description: 'Registered client contact directories and purchasing activity metrics.' },
    { id: 'refund', title: 'Refund Audit Trail', icon: RotateCcw, color: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10', description: 'Returned items breakdown, refund reasons, and financial deduction logs.' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <PageHeader title="Branch Reports" description="Export branch-only sales, inventory, staff, customers and refunds." />

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const Icon = r.icon
          const isCsvLoading = downloading === `${r.id}_csv`
          const isPdfLoading = downloading === `${r.id}_pdf`
          return (
            <Panel key={r.id} title={r.title} action={<span className={tileClass('blue')}><Icon className="size-4" /></span>}>
                <p className="mb-5 min-h-[40px] text-sm text-slate-500 dark:text-slate-400">{r.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    disabled={isCsvLoading || isPdfLoading}
                    onClick={() => handleExportCSV(r.id)}
                    variant="outline"
                    className="w-full h-10 border-slate-200 dark:border-slate-700 text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="size-4 text-emerald-600" />
                    {isCsvLoading ? 'Exporting...' : 'Export CSV'}
                  </Button>
                  <Button
                    disabled={isCsvLoading || isPdfLoading}
                    onClick={() => handleExportPDF(r.id)}
                    className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <FileText className="size-4" />
                    {isPdfLoading ? 'Exporting...' : 'Export PDF'}
                  </Button>
                </div>
            </Panel>
          )
        })}
      </div>
    </div>
  )
}

export default ReportsPage
