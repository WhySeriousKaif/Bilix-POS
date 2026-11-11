import React, { useState, useRef, useCallback, useEffect } from 'react'
import ProductSection from './ProductSection/ProductSection'
import CardSection from './CardSection/CardSection'
import CustomerPaymentSection from './CustomerPaymentSection/CustomerPaymentSection'
import RecommendationSection
  from './RecommendationSection/RecommendationSection'

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

  const handleMouseDown = useCallback(() => {
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const percent = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(MAX_LEFT, Math.max(MIN_LEFT, percent)))
    }
    const handleMouseUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setLeftWidth((current) => {
        localStorage.setItem('cashierSplitWidth', String(current))
        return current
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
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
        onMouseDown={handleMouseDown}
        className='hidden lg:flex w-1.5 shrink-0 items-center justify-center cursor-col-resize group relative z-10'
        title='Drag to resize'
      >
        <div className='w-1 h-full bg-slate-200 dark:bg-white/10 group-hover:bg-blue-400 dark:group-hover:bg-blue-500 transition-colors' />
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
