import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, ReceiptText } from 'lucide-react'
import jsPDF from 'jspdf'

const ReturnReceiveDialog = ({ open, onClose, refund }) => {
  if (!refund) return null

  const printReceipt = () => {
    const items = refund.items || []
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 18
    const money = value => `INR ${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    const date = refund.createdAt ? new Date(refund.createdAt) : new Date()
    const branchName = refund.branch?.name || refund.branch?.store?.brand || 'BILIX POS SYSTEM'

    doc.setFillColor(37, 99, 235)
    doc.rect(0, 0, pageWidth, 42, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text(branchName.toUpperCase(), margin, 24)
    doc.setFontSize(15)
    doc.text('REFUND RECEIPT', pageWidth - margin, 21, { align: 'right' })
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Refund #: ${refund.id || 'N/A'}`, pageWidth - margin, 30, { align: 'right' })

    let y = 54
    const rightCol = pageWidth / 2 + 10
    doc.setTextColor(30, 41, 59)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('REFUND DETAILS', margin, y)
    doc.text('ORIGINAL ORDER', rightCol, y)
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(`Processed on: ${date.toLocaleString('en-IN')}`, margin, y)
    doc.text(`Order #: ${refund.orderId || 'N/A'}`, rightCol, y)
    y += 6
    doc.text(`Refund method: ${refund.paymentType || 'N/A'}`, margin, y)
    doc.text(`Reason: ${refund.reason || 'N/A'}`, rightCol, y)
    y += 12

    const tableWidth = pageWidth - margin * 2
    doc.setFillColor(37, 99, 235)
    doc.rect(margin, y, tableWidth, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('#', margin + 5, y + 8)
    doc.text('Item Description', margin + 18, y + 8)
    doc.text('Qty', pageWidth - 92, y + 8, { align: 'right' })
    doc.text('Unit Price', pageWidth - 50, y + 8, { align: 'right' })
    doc.text('Refund Total', pageWidth - margin - 5, y + 8, { align: 'right' })
    y += 12

    const rows = items.length > 0 ? items : [{ productName: 'Refunded item', quantity: 1, unitPrice: refund.amount, amount: refund.amount }]
    rows.forEach((item, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, y, tableWidth, 14, 'F')
      }
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', index === 0 ? 'bold' : 'normal')
      doc.setFontSize(9)
      doc.text(String(index + 1), margin + 5, y + 9)
      doc.text(doc.splitTextToSize(item.productName || `Item #${item.orderItemId || ''}`, 85), margin + 18, y + 9)
      doc.text(String(item.quantity || 0), pageWidth - 92, y + 9, { align: 'right' })
      doc.text(money(item.unitPrice ?? item.amount), pageWidth - 50, y + 9, { align: 'right' })
      doc.text(money(item.amount), pageWidth - margin - 5, y + 9, { align: 'right' })
      y += 14
    })

    doc.setDrawColor(226, 232, 240)
    doc.line(margin, y + 7, pageWidth - margin, y + 7)
    y += 20
    doc.setFillColor(37, 99, 235)
    doc.roundedRect(pageWidth - 92, y, 74, 22, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('REFUND TOTAL:', pageWidth - 86, y + 14)
    doc.text(money(refund.amount), pageWidth - 23, y + 14, { align: 'right' })

    y += 47
    doc.setTextColor(30, 41, 59)
    doc.setFontSize(10)
    doc.text('REFUND POLICY & NOTES', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text('• Please retain this receipt for your records.', margin, y + 7)
    doc.text('• Refunds are issued using the selected payment method.', margin, y + 14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(`Processed by: ${refund.cashier?.fullName || refund.cashier?.email || 'Authorized Cashier'}`, pageWidth - margin, y + 14, { align: 'right' })
    doc.setDrawColor(226, 232, 240)
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text('Bilix POS System • Computer Generated Refund Receipt', pageWidth / 2, pageHeight - 12, { align: 'center' })
    doc.autoPrint()
    const receiptUrl = URL.createObjectURL(doc.output('blob'))
    const printFrame = document.createElement('iframe')
    printFrame.style.position = 'fixed'
    printFrame.style.right = '0'
    printFrame.style.bottom = '0'
    printFrame.style.width = '0'
    printFrame.style.height = '0'
    printFrame.style.border = '0'
    printFrame.src = receiptUrl
    printFrame.onload = () => {
      printFrame.contentWindow?.focus()
      printFrame.contentWindow?.print()
      window.setTimeout(() => {
        URL.revokeObjectURL(receiptUrl)
        printFrame.remove()
      }, 1000)
    }
    document.body.appendChild(printFrame)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-center text-xl">Refund processed successfully</DialogTitle>
          <DialogDescription className="text-center">
            The refund has been processed for Order #{refund.orderId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ReceiptText className="h-4 w-4 text-sky-500" />
            Refund receipt
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span className="font-medium">#{refund.orderId || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Refund ID</span><span className="font-medium">#{refund.id || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="font-medium">{refund.paymentType || 'N/A'}</span></div>
            <div className="flex justify-between border-t pt-2 dark:border-white/10"><span className="font-semibold">Refund total</span><span className="text-lg font-bold text-sky-600">₹{Number(refund.amount || 0).toFixed(2)}</span></div>
          </div>
          {refund.reason && (
            <div className="mt-3 border-t pt-2 text-sm dark:border-white/10">
              <span className="text-muted-foreground">Reason: </span>
              <span className="font-medium">{refund.reason}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button onClick={printReceipt} className="flex-1">
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ReturnReceiveDialog
