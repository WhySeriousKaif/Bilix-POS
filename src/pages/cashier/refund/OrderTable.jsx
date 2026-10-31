import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

const OrderTable = ({ orders, searchQuery, onSelectOrder, loading }) => {
  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A'
    const date = new Date(dateTime)
    return format(date, 'MMM d, yyyy, h:mm a')
  }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const orderId = order.id?.toString() || ''
    const customerName = typeof order.customer === 'string' 
      ? order.customer 
      : (order.customer?.name || order.customer?.fullName || 'Walk-in')
    
    return (
      orderId.includes(query) ||
      customerName.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading orders...</p>
        </CardContent>
      </Card>
    )
  }

  if (filteredOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No orders found matching your search' : 'No orders available'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date/Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment Mode</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                <TableCell>
                  {typeof order.customer === 'string' 
                    ? order.customer 
                    : (order.customer?.name || order.customer?.fullName || 'Walk-in')}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ₹{order.totalAmount?.toFixed(2) || '0.00'}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1">
                    {order.paymentType === 'CARD' && '💳'}
                    {order.paymentType === 'CASH' && '💵'}
                    {order.paymentType === 'UPI' && '📱'}
                    {order.paymentType || 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onSelectOrder(order)}
                    disabled={order.status === 'REFUNDED' || order.status === 'CANCELLED'}
                  >
                    {order.status === 'REFUNDED' ? 'Fully Refunded' : 'Select for Return'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default OrderTable
