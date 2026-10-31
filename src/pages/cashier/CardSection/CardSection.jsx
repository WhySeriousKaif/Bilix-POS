import React from 'react'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react'
import { useCart } from '@/contexts/CartContext'

const CardSection = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart } = useCart();

  return (
    <div className='flex-1 min-h-0 flex flex-col'>
      <div className='shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-white/5'>
        <h2 className='text-lg sm:text-xl font-black text-slate-900 dark:text-white'>Detail Transaction</h2>
        <Button
          variant='outline'
          size='sm'
          className='gap-1.5 rounded-full text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10'
          onClick={clearCart}
          disabled={cartItems.length === 0}
        >
          <Trash2 className='size-3.5' />
          Reset Order
        </Button>
      </div>
      <div className='flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4'>
        {cartItems.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-slate-400 p-4'>
            <ShoppingCart className='size-16 mb-3 opacity-20' />
            <p className='text-base font-medium mb-1 text-slate-500 dark:text-slate-300'>Cart is empty</p>
            <p className='text-xs text-center'>Add products to start an order</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {cartItems.map((item) => (
              <div key={item.id} className='p-3 rounded-2xl bg-blue-50/40 dark:bg-white/5 border border-slate-100 dark:border-white/5'>
                <div className='flex gap-3'>
                  <div className='w-14 h-14 rounded-xl bg-white dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-100 dark:border-white/5'>
                    {item.product.image ? (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center text-[10px] text-slate-400'>
                        No Img
                      </div>
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between gap-2'>
                      <h4 className='font-semibold text-sm text-slate-900 dark:text-white truncate'>{item.product.name}</h4>
                      <button
                        className='shrink-0 h-6 w-6 rounded-full bg-red-50 dark:bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer'
                        onClick={() => removeFromCart(item.id)}
                      >
                        <X className='size-3.5' />
                      </button>
                    </div>
                    {item.product.sku && (
                      <span className='inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300'>
                        {item.product.sku}
                      </span>
                    )}
                    <div className='flex items-center justify-between mt-2'>
                      <div className='flex items-center gap-1.5'>
                        <button
                          className='h-6 w-6 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10 cursor-pointer'
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className='size-3' />
                        </button>
                        <span className='w-6 text-center text-sm font-semibold text-slate-900 dark:text-white'>
                          {String(item.quantity).padStart(2, '0')}
                        </span>
                        <button
                          disabled={item.product.quantity !== undefined && item.product.quantity !== null && item.quantity >= item.product.quantity}
                          className='h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed'
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className='size-3' />
                        </button>
                      </div>
                      <p className='text-sm font-bold text-slate-900 dark:text-white'>
                        Total ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CardSection
