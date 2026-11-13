import React, { useState, useRef, useCallback, useEffect } from 'react'
import ProductSection from './ProductSection/ProductSection'
import CardSection from './CardSection/CardSection'
import CustomerPaymentSection from './CustomerPaymentSection/CustomerPaymentSection'
import RecommendationSection
  from './RecommendationSection/RecommendationSection'
import { GripVertical } from 'lucide-react'

const MIN_LEFT = 35
const MAX_LEFT = 75
const DEFAULT_LEFT = 62

const CreateOrder = () => {
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = parseFloat(localStorage.getItem('cashierSplitWidth'))
    return Number.isFinite(saved) ? Math.min(MAX_LEFT, Math.max(MIN_LEFT, saved)) : DEFAULT_LEFT
  })
  const containerRef = useRef(null)
  const draggingRef = useRef(false)

  const handlePointerDown = useCallback((event) => {
    event.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const percent = ((event.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(MAX_LEFT, Math.max(MIN_LEFT, percent)))
    }
    const handlePointerUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setLeftWidth((current) => {
        localStorage.setItem('cashierSplitWidth', String(current))
        return current
      })
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
        className='w-full lg:w-(--right-w) flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 border-t lg:border-t-0 border-slate-200 dark:border-white/10'
        style={{ '--right-w': `${100 - leftWidth}%` }}
      >
        <CardSection />
        <RecommendationSection />
        <CustomerPaymentSection />

      </div>
    </div>
  )
}

export default CreateOrder
