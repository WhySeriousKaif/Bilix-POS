import React from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const ProductCard = ({ product, onClick }) => {
  const handleClick = () => {
    if (onClick) onClick(product)
  }

  const inStock = product.quantity === undefined || product.quantity === null || product.quantity > 0

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      <div className="relative h-40 sm:h-44 shrink-0 bg-blue-50/60 dark:bg-blue-500/5">
        {product.quantity !== undefined && product.quantity !== null && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900/85 text-white">
            {product.quantity} in this branch
          </span>
        )}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name || 'Product'}
            className="w-full h-full object-contain p-3"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-slate-400 px-2 text-center">
            No Image
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 p-3 flex-1">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
          {product.name || 'Unnamed Product'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 min-h-8">
          {product.description || product.sku || ' '}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-base font-bold text-slate-900 dark:text-white">
            ₹{product.sellingPrice?.toFixed(2) || '0.00'}
          </span>
        </div>
        <button
          onClick={handleClick}
          disabled={!inStock}
          className={cn(
            'mt-auto w-full flex items-center justify-center gap-1.5 rounded-full border py-2 text-xs font-semibold transition-colors cursor-pointer',
            inStock
              ? 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-blue-600 hover:text-white hover:border-blue-600'
              : 'border-slate-100 dark:border-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
          )}
        >
          <Plus className="size-3.5" />
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  )
}

export default ProductCard
