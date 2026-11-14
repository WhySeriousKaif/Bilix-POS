import React, { useState, useRef, useCallback, useEffect } from 'react'
import ProductSection from './ProductSection/ProductSection'
import CardSection from './CardSection/CardSection'
import CustomerPaymentSection from './CustomerPaymentSection/CustomerPaymentSection'
import RecommendationSection
  from './RecommendationSection/RecommendationSection'
import { GripHorizontal, GripVertical } from 'lucide-react'

const MIN_LEFT = 35
const MAX_LEFT = 75
const DEFAULT_LEFT = 62
const MIN_CART_HEIGHT = 20
const MAX_CART_HEIGHT = 65
const DEFAULT_CART_HEIGHT = 38

const CreateOrder = () => {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = parseFloat(localStorage.getItem('cashierSplitWidth'))
    return Number.isFinite(saved) ? Math.min(MAX_LEFT, Math.max(MIN_LEFT, saved)) : DEFAULT_LEFT
  })
  const containerRef = useRef(null)
  const rightPanelRef = useRef(null)
  const draggingRef = useRef(false)
  const draggingCartRef = useRef(false)
  const [cartHeight, setCartHeight] = useState(() => {
    const saved = parseFloat(localStorage.getItem('cashierCartHeight'))
    return Number.isFinite(saved)
      ? Math.min(MAX_CART_HEIGHT, Math.max(MIN_CART_HEIGHT, saved))
      : DEFAULT_CART_HEIGHT
  })

  const handlePointerDown = useCallback((event) => {
    event.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleCartPointerDown = useCallback((event) => {
    event.preventDefault()
    draggingCartRef.current = true
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (draggingRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const percent = ((event.clientX - rect.left) / rect.width) * 100
        setLeftWidth(Math.min(MAX_LEFT, Math.max(MIN_LEFT, percent)))
      }

      if (draggingCartRef.current && rightPanelRef.current) {
        const rect = rightPanelRef.current.getBoundingClientRect()
        const percent = ((event.clientY - rect.top) / rect.height) * 100
        setCartHeight(Math.min(MAX_CART_HEIGHT, Math.max(MIN_CART_HEIGHT, percent)))
      }
    }
    const handlePointerUp = () => {
      const resizedColumns = draggingRef.current
      const resizedCart = draggingCartRef.current
      if (!resizedColumns && !resizedCart) return
      draggingRef.current = false
      draggingCartRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (resizedColumns) {
        setLeftWidth((current) => {
          localStorage.setItem('cashierSplitWidth', String(current))
          return current
        })
      }
      if (resizedCart) {
        setCartHeight((current) => {
          localStorage.setItem('cashierCartHeight', String(current))
          return current
        })
      }
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  return (
    <div ref={containerRef} className='flex flex-1 overflow-hidden flex-col lg:flex-row h-full bg-[#F8FAFE] dark:bg-[#0B1220]'>
      <div
        className='w-full lg:w-(--left-w) h-full min-h-0 overflow-hidden'
        style={{ '--left-w': `${leftWidth}%` }}
      >
        <ProductSection />
      </div>

      {/* Drag handle (desktop only) */}
      <div
        role='separator'
        aria-label='Resize product and transaction panels'
        aria-orientation='vertical'
        aria-valuenow={Math.round(leftWidth)}
        onPointerDown={handlePointerDown}
        onDoubleClick={() => setLeftWidth(DEFAULT_LEFT)}
        className='hidden lg:flex w-3 shrink-0 items-center justify-center cursor-col-resize group relative z-20 touch-none bg-slate-100 dark:bg-[#111A2D] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors'
        title='Drag left or right to resize. Double-click to reset.'
      >
        <div className='absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-300 dark:bg-white/15 group-hover:bg-blue-500 transition-colors' />
        <span className='relative flex h-12 w-5 items-center justify-center rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-400 group-hover:border-blue-500 group-hover:text-blue-500 shadow-sm'>
          <GripVertical className='size-4' />
        </span>
      </div>

      <div
        ref={rightPanelRef}
        className='w-full lg:w-(--right-w) flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#0B1220] border-t lg:border-t-0 border-slate-200 dark:border-white/10'
        style={{ '--right-w': `${100 - leftWidth}%` }}
      >
        <div
          className='flex-1 lg:flex-none min-h-0 overflow-hidden bg-white dark:bg-[#0B1220]'
          style={{ height: `${cartHeight}%` }}
        >
          <CardSection />
        </div>

        <div
          role='separator'
          aria-label='Resize transaction details and suggestions'
          aria-orientation='horizontal'
          aria-valuenow={Math.round(cartHeight)}
          onPointerDown={handleCartPointerDown}
          onDoubleClick={() => setCartHeight(DEFAULT_CART_HEIGHT)}
          className='hidden lg:flex h-3 shrink-0 items-center justify-center cursor-row-resize group relative z-20 touch-none bg-slate-100 dark:bg-[#111A2D] hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors'
          title='Drag up or down to resize. Double-click to reset.'
        >
          <div className='absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-300 dark:bg-white/15 group-hover:bg-violet-500 transition-colors' />
          <span className='relative flex h-5 w-12 items-center justify-center rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 text-slate-400 group-hover:border-violet-500 group-hover:text-violet-500 shadow-sm'>
            <GripHorizontal className='size-4' />
          </span>
        </div>

        <div className='flex-1 min-h-0 overflow-y-auto bg-white dark:bg-[#0B1220]'>
          <RecommendationSection />
          <CustomerPaymentSection />
        </div>

      </div>
    </div>
  )
}

export default CreateOrder
