import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCart } from '@/contexts/CartContext'
import { customerAPI, orderAPI, paymentAPI } from '@/services/api'
import { User, Tag, FileText, CreditCard, UserPlus, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

const CustomerPaymentSection = () => {
  const {
    selectedCustomer,
    setSelectedCustomer,
    discount,
    setDiscount,
    orderNote,
    setOrderNote,
    cartItems,
    subtotal,
    discountAmount,
    total,
    clearCart,
  } = useCart()

  const [customers, setCustomers] = useState([])
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paymentType, setPaymentType] = useState('CASH')
  const [error, setError] = useState(null)
  const [isAddingCustomer, setIsAddingCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', phone: '' })
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [addCustomerError, setAddCustomerError] = useState(null)
  const [customerParams, setCustomerParams] = useSearchParams()
  const [customerPage, setCustomerPage] = useState(() => Number(customerParams.get('customerPage') || 0))
  const customerPageSize = Number(customerParams.get('customerSize') || 10)
  const [customerSort, setCustomerSort] = useState(() => customerParams.get('customerSort') || 'createdAt')
  const [customerDirection, setCustomerDirection] = useState(() => customerParams.get('customerDirection') || 'desc')
  const [customerHasMore, setCustomerHasMore] = useState(true)
  const [customerLoadingMore, setCustomerLoadingMore] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)

  useEffect(() => {
    if (isCustomerDialogOpen) {
      fetchCustomers()
    }
  }, [isCustomerDialogOpen, customerSearch, customerPage, customerPageSize, customerSort, customerDirection])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const result = await customerAPI.getPaged(customerPage, customerPageSize, customerSort, customerDirection, customerSearch)
      const nextCustomers = result?.content || []
      setCustomers(current => customerPage === 0 ? nextCustomers : [...current, ...nextCustomers])
      setCustomerHasMore(!result?.last && customerPage < (result?.totalPages || 1) - 1)
    } catch (err) {
      console.error('Error fetching customers:', err)
      setCustomers([])
    } finally {
      setLoading(false)
      setCustomerLoadingMore(false)
    }
  }

  useEffect(() => {
    setCustomerPage(0)
    setCustomerHasMore(true)
  }, [customerSearch, customerSort, customerDirection, customerPageSize])

  const loadMoreCustomers = () => {
    if (customerLoadingMore || !customerHasMore || loading) return
    setCustomerLoadingMore(true)
    setCustomerPage(page => page + 1)
  }

  useEffect(() => {
    if (!isCustomerDialogOpen) return
    const next = new URLSearchParams(customerParams)
    next.set('customerPage', String(customerPage))
    next.set('customerSize', String(customerPageSize))
    next.set('customerSort', customerSort)
    next.set('customerDirection', customerDirection)
    if (customerSearch.trim()) next.set('customerSearch', customerSearch.trim())
    else next.delete('customerSearch')
    setCustomerParams(next, { replace: true })
  }, [isCustomerDialogOpen, customerPage, customerPageSize, customerSort, customerDirection, customerSearch])

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setIsCustomerDialogOpen(false)
    setCustomerSearch('')
    setIsAddingCustomer(false)
    setNewCustomer({ name: '', email: '', phone: '' })
    setAddCustomerError(null)
    clearCustomerUrlParams()
  }

  const clearCustomerUrlParams = () => {
    const next = new URLSearchParams(customerParams)
    ;['customerPage', 'customerSize', 'customerSort', 'customerDirection', 'customerSearch'].forEach((key) => next.delete(key))
    setCustomerParams(next, { replace: true })
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      setAddCustomerError('Name is required')
      return
    }
    try {
      setAddingCustomer(true)
      setAddCustomerError(null)
      const created = await customerAPI.create({
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim() || null,
        phone: newCustomer.phone.trim() || null,
      })
      handleSelectCustomer(created)
    } catch (err) {
      console.error('Error creating customer:', err)
      setAddCustomerError('Failed to add customer: ' + err.message)
    } finally {
      setAddingCustomer(false)
    }
  }

  const handleDiscountTypeChange = (type) => {
    setDiscount({ ...discount, type, value: 0 })
  }

  const handleContinueClick = () => {
    if (cartItems.length === 0) {
      setError('Cart is empty. Add products before processing payment.')
      return
    }
    setError(null)
    setIsConfirmOpen(true)
  }

  const handleProcessPayment = async () => {
    setIsConfirmOpen(false)

    try {
      setProcessing(true)
      setError(null)

      const orderData = {
        amount: total,
        currency: 'INR', // Or dynamic currency
      }


      if (paymentType === 'UPI' || paymentType === 'CARD') {
        // Create order on backend to get Razorpay Order ID
        const response = await paymentAPI.createOrder(orderData);
        const { id: order_id, currency, amount, key } = response;

        if (!key) {
          // Falling back to some other hardcoded key here would open a DIFFERENT
          // merchant's checkout with no warning — worse than just failing loudly.
          setError('Payment gateway is not configured correctly. Contact your admin.');
          setProcessing(false);
          return;
        }

        const options = {
          key,
          amount: amount,
          currency: currency || "INR",
          name: "Bilix POS",
          description: paymentType === 'UPI' ? 'UPI Payment' : 'Card Payment',
          order_id: order_id,
          handler: async function (response) {
            // Verify the signature server-side BEFORE creating the order — otherwise a
            // tampered client could send fake payment/signature values and get an order
            // marked as paid without ever actually paying.
            try {
              const verification = await paymentAPI.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              if (!verification?.verified) {
                setError('Payment verification failed. Order was not placed.');
                setProcessing(false);
                return;
              }
            } catch (verifyErr) {
              setError('Payment verification failed: ' + verifyErr.message);
              setProcessing(false);
              return;
            }
            await createBackendOrder();
          },
          prefill: {
            name: selectedCustomer?.name || selectedCustomer?.fullName || "Walk-in Customer",
            email: selectedCustomer?.email || "customer@molla.com",
            contact: selectedCustomer?.phone || "9876543210",
          },
          theme: {
            color: "#2563EB"
          },
          modal: {
            ondismiss: function () {
              setProcessing(false);
              setError("Payment Cancelled: Order was not placed.");
            }
          }
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response) {
          setError(`Payment Failed: ${response.error.description}`);
          setProcessing(false);
        });
        rzp1.open();
      } else {
        // Cash payment
        await createBackendOrder();
      }

    } catch (err) {
      console.error('Error processing payment:', err)
      setError('Failed to process payment: ' + err.message)
      setProcessing(false);
    }
  }

  const createBackendOrder = async () => {
    try {
      // Prepare order data. branchId/cashierId are intentionally NOT sent — the backend
      // always derives both from the authenticated cashier's own account, never from
      // client-supplied values, so a cashier can't attribute a sale to another branch.
      const orderDto = {
        customerId: selectedCustomer?.id || null, // Allow null for walk-in
        paymentType: paymentType,
        status: 'COMPLETED',
        orderItems: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: total,
        // You might want to save payment details too
      }

      // Create order
      const createdOrder = await orderAPI.create(orderDto)

      // Clear cart after successful order
      clearCart()

      // Let the product grid know stock levels just changed so it can refetch live
      window.dispatchEvent(new CustomEvent('productsUpdated'))

      // Show success toast
      toast.success('Order placed successfully', {
        description: `Order #${createdOrder.id} · ₹${total.toFixed(2)}`,
      })
      setIsSuccessOpen(true)
    } catch (err) {
      console.error('Error creating backend order:', err)
      setError('Payment successful but failed to create order: ' + err.message)
      toast.error('Failed to create order', { description: err.message })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className='shrink-0 flex flex-col gap-3 border-t border-slate-100 dark:border-white/5 max-h-[60%] overflow-y-auto'>
      <div className='p-4 sm:p-6 space-y-3'>
        {/* Customer */}
        <button
          onClick={() => setIsCustomerDialogOpen(true)}
          className='w-full flex items-center gap-3 p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer text-left'
        >
          <div className='h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0'>
            <User className='size-4' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-semibold text-slate-900 dark:text-white truncate'>
              {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
            </p>
            <p className='text-xs text-slate-500 dark:text-slate-400 truncate'>
              {selectedCustomer ? (selectedCustomer.email || selectedCustomer.phone || 'No contact info') : 'Tap to select a customer'}
            </p>
          </div>
        </button>

        {/* Discount */}
        <div className='rounded-2xl border border-slate-100 dark:border-white/5 p-3'>
          <div className='flex items-center gap-2 mb-2'>
            <Tag className='size-4 text-blue-600 dark:text-blue-400' />
            <span className='text-sm font-semibold text-slate-900 dark:text-white'>Discount</span>
          </div>
          <div className='flex gap-2'>
            <Input
              type='number'
              placeholder='0'
              value={discount.value || ''}
              onChange={(e) => setDiscount({ ...discount, value: parseFloat(e.target.value) || 0 })}
              min='0'
              className='h-9 text-sm rounded-full'
            />
            <Button
              variant={discount.type === 'percentage' ? 'default' : 'outline'}
              size='sm'
              className={cn('h-9 w-9 p-0 rounded-full', discount.type === 'percentage' && 'bg-blue-600 hover:bg-blue-700')}
              onClick={() => handleDiscountTypeChange('percentage')}
            >
              %
            </Button>
            <Button
              variant={discount.type === 'amount' ? 'default' : 'outline'}
              size='sm'
              className={cn('h-9 w-9 p-0 rounded-full', discount.type === 'amount' && 'bg-blue-600 hover:bg-blue-700')}
              onClick={() => handleDiscountTypeChange('amount')}
            >
              ₹
            </Button>
          </div>
        </div>

        {/* Order Note */}
        <div className='rounded-2xl border border-slate-100 dark:border-white/5 p-3'>
          <div className='flex items-center gap-2 mb-2'>
            <FileText className='size-4 text-blue-600 dark:text-blue-400' />
            <span className='text-sm font-semibold text-slate-900 dark:text-white'>Order Note</span>
          </div>
          <Input
            placeholder='Add order note...'
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            className='h-9 text-sm rounded-full'
          />
        </div>

        {/* Payment Method */}
        <div className='rounded-2xl border border-slate-100 dark:border-white/5 p-3'>
          <div className='flex items-center gap-2 mb-2'>
            <CreditCard className='size-4 text-blue-600 dark:text-blue-400' />
            <span className='text-sm font-semibold text-slate-900 dark:text-white'>Payment Method</span>
          </div>
          <Select value={paymentType} onValueChange={setPaymentType}>
            <SelectTrigger className='h-9 text-sm rounded-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='CASH' className='text-sm'>Cash</SelectItem>
              <SelectItem value='CARD' className='text-sm'>Card</SelectItem>
              <SelectItem value='UPI' className='text-sm'>UPI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Totals breakdown */}
        <div className='rounded-2xl bg-slate-50 dark:bg-white/5 p-4 space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-slate-500 dark:text-slate-400'>Sub-Total</span>
            <span className='font-semibold text-slate-900 dark:text-white'>₹{subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className='flex items-center justify-between text-sm'>
              <span className='text-slate-500 dark:text-slate-400'>Discount</span>
              <span className='font-semibold text-red-500'>-₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className='flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10'>
            <span className='font-semibold text-slate-900 dark:text-white'>Total Payment</span>
            <span className='text-xl font-black text-blue-600 dark:text-blue-400'>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className='shrink-0 px-4 sm:px-6 pb-4 sm:pb-6 space-y-2'>
        {error && (
          <div className='p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-lg'>
            {error}
          </div>
        )}
        <Button
          className='w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-full font-semibold text-base'
          onClick={handleContinueClick}
          disabled={processing || cartItems.length === 0}
        >
          {processing ? 'Processing...' : 'Continue'}
        </Button>
      </div>

      {/* Payment confirmation */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className='max-w-sm rounded-2xl border-slate-200 dark:border-white/10'>
          <DialogHeader>
            <DialogTitle>Confirm order</DialogTitle>
            <DialogDescription>
              Are you sure you want to create this order?
            </DialogDescription>
          </DialogHeader>
          <div className='rounded-xl bg-slate-50 dark:bg-white/5 p-4 text-sm'>
            <div className='flex justify-between'>
              <span className='text-slate-500'>Items</span>
              <span className='font-semibold'>{cartItems.length}</span>
            </div>
            <div className='mt-2 flex justify-between'>
              <span className='text-slate-500'>Total</span>
              <span className='font-bold text-blue-600 dark:text-blue-400'>₹{total.toFixed(2)}</span>
            </div>
          </div>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button className='bg-blue-600 text-white hover:bg-blue-700' onClick={handleProcessPayment}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success feedback */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className='max-w-sm rounded-2xl text-center border-slate-200 dark:border-white/10'>
          <div className='mx-auto flex size-16 animate-in zoom-in rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 items-center justify-center'>
            <svg viewBox='0 0 24 24' className='size-9' fill='none' stroke='currentColor' strokeWidth='2.5'>
              <path d='m5 12 4 4L19 6' />
            </svg>
          </div>
          <DialogHeader>
            <DialogTitle className='text-center'>Order created</DialogTitle>
            <DialogDescription className='text-center'>Payment completed and the order was saved successfully.</DialogDescription>
          </DialogHeader>
          <Button className='bg-blue-600 text-white hover:bg-blue-700' onClick={() => setIsSuccessOpen(false)}>Done</Button>
        </DialogContent>
      </Dialog>

      {/* Customer Selection Dialog */}
      <Dialog
        open={isCustomerDialogOpen}
        onOpenChange={(open) => {
          setIsCustomerDialogOpen(open)
          if (!open) {
            clearCustomerUrlParams()
            setIsAddingCustomer(false)
            setAddCustomerError(null)
          }
        }}
      >
        <DialogContent className='max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto'>
          {isAddingCustomer ? (
            <>
              <DialogHeader>
                <DialogTitle className='text-base sm:text-lg flex items-center gap-2'>
                  <button
                    onClick={() => setIsAddingCustomer(false)}
                    className='p-1 -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer'
                  >
                    <ArrowLeft className='size-4' />
                  </button>
                  Add New Customer
                </DialogTitle>
                <DialogDescription className='text-xs sm:text-sm'>
                  Saved to your customer database — not hardcoded
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-3'>
                <Input
                  placeholder='Full name *'
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className='h-10 text-sm'
                />
                <Input
                  placeholder='Email'
                  type='email'
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className='h-10 text-sm'
                />
                <Input
                  placeholder='Phone'
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className='h-10 text-sm'
                />
                {addCustomerError && (
                  <p className='text-xs text-red-500'>{addCustomerError}</p>
                )}
                <Button
                  className='w-full bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-full'
                  onClick={handleCreateCustomer}
                  disabled={addingCustomer}
                >
                  {addingCustomer ? 'Saving...' : 'Save & Select Customer'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className='text-base sm:text-lg'>Select Customer</DialogTitle>
                <DialogDescription className='text-xs sm:text-sm'>
                  Search and select a customer for this order
                </DialogDescription>
              </DialogHeader>
              <div className='space-y-3 sm:space-y-4'>
                <Input
                  placeholder='Search customers...'
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className='h-9 sm:h-10 text-sm'
                />
                <div className='flex items-center justify-between gap-2'>
                  <Select value={`${customerSort}:${customerDirection}`} onValueChange={(value) => {
                    const [sort, direction] = value.split(':')
                    setCustomerSort(sort)
                    setCustomerDirection(direction)
                    setCustomerPage(0)
                  }}>
                    <SelectTrigger className='h-9 w-40 text-xs'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='createdAt:desc'>Newest first</SelectItem>
                      <SelectItem value='name:asc'>Name A–Z</SelectItem>
                      <SelectItem value='name:desc'>Name Z–A</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={String(customerPageSize)} onValueChange={(value) => {
                    const next = new URLSearchParams(customerParams)
                    next.set('customerSize', value)
                    setCustomerPage(0)
                    setCustomerParams(next, { replace: true })
                  }}>
                    <SelectTrigger className='h-9 w-28 text-xs'><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='10'>10 / page</SelectItem>
                      <SelectItem value='25'>25 / page</SelectItem>
                      <SelectItem value='50'>50 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='ghost'
                    className='flex-1 justify-start h-9 sm:h-10 text-xs sm:text-sm'
                    onClick={() => handleSelectCustomer(null)}
                  >
                    No Customer (Walk-in)
                  </Button>
                  <Button
                    variant='outline'
                    className='gap-1.5 h-9 sm:h-10 text-xs sm:text-sm text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                    onClick={() => setIsAddingCustomer(true)}
                  >
                    <UserPlus className='size-3.5' />
                    Add New
                  </Button>
                </div>
                {loading ? (
                  <p className='text-xs sm:text-sm text-muted-foreground text-center py-4'>
                    Loading...
                  </p>
                ) : customers.length === 0 ? (
                  <p className='text-xs sm:text-sm text-muted-foreground text-center py-4'>
                    No customers found
                  </p>
                ) : (
                  <div
                    className='max-h-[40vh] sm:max-h-60 overflow-y-auto space-y-2'
                    onScroll={(event) => {
                      const element = event.currentTarget
                      if (element.scrollHeight - element.scrollTop - element.clientHeight < 48) loadMoreCustomers()
                    }}
                  >
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        className='p-2 sm:p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors'
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <p className='font-medium text-xs sm:text-sm'>{customer.name}</p>
                        <p className='text-[10px] sm:text-xs text-muted-foreground truncate'>{customer.email}</p>
                        <p className='text-[10px] sm:text-xs text-muted-foreground'>{customer.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
                {customerLoadingMore && <p className='text-xs text-muted-foreground text-center'>Loading more customers…</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CustomerPaymentSection
