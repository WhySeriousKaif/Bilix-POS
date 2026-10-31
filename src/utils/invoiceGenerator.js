import jsPDF from 'jspdf'

/**
 * Format currency in Indian Rupees (INR)
 * Uses standard ASCII 'INR' to guarantee 100% clean rendering in jsPDF without character code distortion.
 */
const formatCurrency = (amount) => {
  return `INR ${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Get payment method label
 */
const getPaymentMethodLabel = (method) => {
  if (!method) return 'Cash'
  const methodMap = {
    CASH: 'Cash',
    CARD: 'Card / Debit',
    UPI: 'UPI / Digital Payment',
    DEBIT_CARD: 'Debit Card',
    CREDIT_CARD: 'Credit Card',
  }
  return methodMap[method] || method
}

/**
 * Generate an executive blue PDF invoice for an order
 * @param {Object} order - The order object
 * @param {Object} options - Additional options
 * @returns {jsPDF} - The PDF document
 */
export const generateInvoicePDF = (order) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15
  let yPos = margin

  // Helper function to add a new page if needed
  const checkPageBreak = (requiredHeight) => {
    if (yPos + requiredHeight > pageHeight - margin) {
      doc.addPage()
      yPos = margin
      return true
    }
    return false
  }

  // 1. Sleek Blue Header Banner
  doc.setFillColor(37, 99, 235) // Primary Executive Blue (#2563EB)
  doc.rect(0, 0, pageWidth, 40, 'F')

  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  const branchTitle = order.branch?.name || order.branch?.store?.brand || 'BILIX POS SYSTEM'
  doc.text(branchTitle.toUpperCase(), margin, 24)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('TAX INVOICE', pageWidth - margin, 24, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(224, 242, 254) // Light sky blue subtext
  doc.text(`Invoice #: ${order.id || 'N/A'}`, pageWidth - margin, 32, { align: 'right' })

  yPos = 48

  // 2. Branch & Customer Meta Info (2 Columns)
  const leftColX = margin
  const rightColX = pageWidth / 2 + 10

  // Left Column: Store / Branch Info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('STORE & BRANCH DETAILS', leftColX, yPos)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  
  const branchAddress = order.branch?.address || 'Main Commercial Mall, City Center'
  const branchPhone = order.branch?.phone || '+91 9876543210'
  const branchEmail = order.branch?.email || 'support@molla-pos.com'

  let leftY = yPos + 6
  doc.text(branchAddress, leftColX, leftY)
  leftY += 5
  doc.text(`Phone: ${branchPhone}`, leftColX, leftY)
  leftY += 5
  doc.text(`Email: ${branchEmail}`, leftColX, leftY)

  // Right Column: Customer & Transaction Info
  const customerName = typeof order.customer === 'string'
    ? order.customer
    : (order.customer?.name || order.customer?.fullName || 'Walk-in Customer')
  const customerPhone = order.customer?.phone || 'N/A'
  const invoiceDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN')
  const invoiceTime = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  }) : new Date().toLocaleTimeString('en-IN')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('CUSTOMER & ORDER META', rightColX, yPos)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)

  let rightY = yPos + 6
  doc.text(`Billed To: ${customerName}`, rightColX, rightY)
  rightY += 5
  doc.text(`Phone: ${customerPhone}`, rightColX, rightY)
  rightY += 5
  doc.text(`Date & Time: ${invoiceDate}, ${invoiceTime}`, rightColX, rightY)
  rightY += 5
  doc.text(`Payment Method: ${getPaymentMethodLabel(order.paymentType)}`, rightColX, rightY)

  yPos = Math.max(leftY, rightY) + 12

  // 3. Order Items Table Header
  checkPageBreak(25)
  doc.setFillColor(37, 99, 235) // Executive Blue Table Header
  doc.rect(margin, yPos, pageWidth - 2 * margin, 9, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)

  doc.text('#', margin + 3, yPos + 6)
  doc.text('Item Description', margin + 12, yPos + 6)
  doc.text('Qty', pageWidth - 100, yPos + 6, { align: 'right' })
  doc.text('Unit Price', pageWidth - 55, yPos + 6, { align: 'right' })
  doc.text('Total', pageWidth - margin - 3, yPos + 6, { align: 'right' })

  yPos += 12

  // 4. Order Item Rows
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)

  const orderItems = order.orderItems || []
  if (orderItems.length === 0) {
    doc.setFontSize(9)
    doc.text('Order Items Included', margin + 12, yPos + 4)
    doc.text('1', pageWidth - 100, yPos + 4, { align: 'right' })
    doc.text(formatCurrency(order.totalAmount), pageWidth - 55, yPos + 4, { align: 'right' })
    doc.text(formatCurrency(order.totalAmount), pageWidth - margin - 3, yPos + 4, { align: 'right' })
    yPos += 10
  } else {
    orderItems.forEach((item, index) => {
      checkPageBreak(14)
      const itemNum = (index + 1).toString()
      const productName = item.product?.name || item.productName || 'General Item'
      const quantity = item.quantity || 1
      const price = item.price || item.unitPrice || 0
      const lineTotal = quantity * price

      // Alternating row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252)
        doc.rect(margin, yPos - 3, pageWidth - 2 * margin, 11, 'F')
      }

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(itemNum, margin + 3, yPos + 3)

      let displayName = productName
      const maxNameWidth = pageWidth - 130
      if (doc.getTextWidth(displayName) > maxNameWidth) {
        displayName = doc.splitTextToSize(displayName, maxNameWidth)[0] + '...'
      }
      doc.text(displayName, margin + 12, yPos + 3)

      doc.setFont('helvetica', 'normal')
      doc.text(quantity.toString(), pageWidth - 100, yPos + 3, { align: 'right' })
      doc.text(formatCurrency(price), pageWidth - 55, yPos + 3, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(lineTotal), pageWidth - margin - 3, yPos + 3, { align: 'right' })

      yPos += 11
    })
  }

  yPos += 4

  // Separator Line
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  // 5. Totals Breakdown Card
  checkPageBreak(40)
  const subtotal = order.subtotal || order.totalAmount || 0
  const discount = order.discountAmount || 0
  const tax = order.tax || 0
  const total = order.totalAmount || 0

  const summaryX = pageWidth - margin - 90

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)

  if (discount > 0) {
    doc.text('Subtotal:', summaryX, yPos)
    doc.text(formatCurrency(subtotal), pageWidth - margin - 3, yPos, { align: 'right' })
    yPos += 6

    doc.text('Discount:', summaryX, yPos)
    doc.setTextColor(220, 38, 38)
    doc.text(`-${formatCurrency(discount)}`, pageWidth - margin - 3, yPos, { align: 'right' })
    doc.setTextColor(71, 85, 105)
    yPos += 6
  }

  if (tax > 0) {
    doc.text('Estimated Tax:', summaryX, yPos)
    doc.text(formatCurrency(tax), pageWidth - margin - 3, yPos, { align: 'right' })
    yPos += 6
  }

  // Grand Total Box - Generous Width to prevent overlap
  doc.setFillColor(37, 99, 235) // Executive Primary Blue
  doc.roundedRect(pageWidth - margin - 95, yPos, 95, 14, 2, 2, 'F')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL PAID:', pageWidth - margin - 90, yPos + 9.5)
  doc.text(formatCurrency(total), pageWidth - margin - 4, yPos + 9.5, { align: 'right' })

  yPos += 26

  // 6. Footer Notes & Authorization Stamp
  checkPageBreak(30)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text('TERMS & CONDITIONS', margin, yPos)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  yPos += 4
  doc.text('• Thank you for shopping with us! Please retain this invoice for any return or warranty claims.', margin, yPos)
  yPos += 4
  doc.text('• Returns or exchanges are subject to store policy within 7 business days.', margin, yPos)

  // Cashier Info Signature area
  const cashierName = order.cashier?.fullName || order.cashier?.email || 'Authorized Cashier'
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 41, 59)
  doc.text(`Processed By: ${cashierName}`, pageWidth - margin, yPos - 4, { align: 'right' })

  // Page Footer Bar
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14)
  doc.setFontSize(7)
  doc.setTextColor(148, 163, 184)
  doc.text(`Bilix POS System • Computer Generated Tax Invoice • ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, pageHeight - 8, { align: 'center' })

  return doc
}

/**
 * Download invoice as PDF
 * @param {Object} order - The order object
 * @param {string} filename - Optional filename (default: invoice-{orderId}.pdf)
 */
export const downloadInvoicePDF = (order, filename = null) => {
  const doc = generateInvoicePDF(order)
  const invoiceFilename = filename || `invoice-#${order.id || 'order'}.pdf`
  doc.save(invoiceFilename)
}

/**
 * Open the invoice in the browser print flow. The user can choose a physical
 * printer or “Save as PDF” from the native print dialog.
 */
export const printInvoicePDF = (order) => {
  const doc = generateInvoicePDF(order)
  doc.autoPrint()
  const invoiceUrl = URL.createObjectURL(doc.output('blob'))
  const printFrame = document.createElement('iframe')
  printFrame.style.position = 'fixed'
  printFrame.style.right = '0'
  printFrame.style.bottom = '0'
  printFrame.style.width = '0'
  printFrame.style.height = '0'
  printFrame.style.border = '0'
  printFrame.src = invoiceUrl
  printFrame.onload = () => {
    printFrame.contentWindow?.focus()
    printFrame.contentWindow?.print()
    window.setTimeout(() => {
      URL.revokeObjectURL(invoiceUrl)
      printFrame.remove()
    }, 1000)
  }
  document.body.appendChild(printFrame)
  return true
}
