import * as React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Inbox, RefreshCw, Search } from 'lucide-react'

/**
 * Shared building blocks for admin list/detail pages.
 *
 * They exist so every screen uses the same font weights, spacing, badge shapes and
 * pagination footer instead of each page inventing its own variant. The values below
 * mirror the store-admin dashboard: `font-bold` for figures, `font-semibold` for
 * headings, `font-medium` for body copy — never `font-black` / `font-extrabold`.
 */

const TONES = {
  blue: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', ring: 'ring-blue-500/20' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/20' },
  amber: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20' },
  rose: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', ring: 'ring-rose-500/20' },
  violet: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', ring: 'ring-violet-500/20' },
  indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', ring: 'ring-indigo-500/20' },
  slate: { text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/10', ring: 'ring-slate-500/20' },
}

/** Rounded square used to hold a metric / row icon. */
export const tileClass = (tone = 'blue') => {
  const palette = TONES[tone] || TONES.blue
  return cn('flex size-9 shrink-0 items-center justify-center rounded-lg ring-1', palette.bg, palette.text, palette.ring)
}

/** Compact pill used for statuses, payment methods, roles. */
export const pillClass = (tone = 'slate') => {
  const palette = TONES[tone] || TONES.slate
  return cn(
    'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
    palette.bg,
    palette.text
  )
}

/* ------------------------------------------------------------------ *
 * Page header
 * ------------------------------------------------------------------ */

/**
 * The plain (unboxed) page title used by the store-admin screens: title, optional
 * count pill, description, and right-aligned actions.
 */
export function PageHeader({ title, badge, badgeTone = 'blue', description, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {title}
          </h1>
          {badge != null && badge !== '' && (
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', pillClass(badgeTone))}>
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Panel (section card)
 * ------------------------------------------------------------------ */

/** Card with a bordered header row — same proportions as the store dashboard. */
export function Panel({ title, subtitle, action, children, className, bodyClassName }) {
  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            {title && (
              <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Card>
  )
}

/** Inline link in a panel header, e.g. "View All →". */
export function PanelLink({ href, onClick, children }) {
  const className =
    'group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, 'cursor-pointer')}>
        {children}
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </button>
    )
  }
  return (
    <a href={href} className={className}>
      {children}
      <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </a>
  )
}

/* ------------------------------------------------------------------ *
 * Metric card
 * ------------------------------------------------------------------ */

export function MetricCard({ label, value, hint, icon: Icon, tone = 'blue', valueTone, hintTone }) {
  const palette = TONES[tone] || TONES.blue
  return (
    <Card className="gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
        {Icon && (
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg ring-1', palette.bg, palette.text, palette.ring)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <div>
        <p className={cn('text-2xl font-bold tracking-tight tabular-nums', valueTone || 'text-slate-900 dark:text-white')}>
          {value}
        </p>
        {hint && (
          <p className={cn('mt-1 text-xs font-medium', hintTone || 'text-slate-500 dark:text-slate-400')}>{hint}</p>
        )}
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ *
 * Filters
 * ------------------------------------------------------------------ */

export function Toolbar({ children }) {
  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">{children}</div>
    </Card>
  )
}

export function SearchField({ value, onChange, placeholder, className }) {
  return (
    <div className={cn('relative flex-1', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 pl-9 text-sm"
      />
    </div>
  )
}

/**
 * Native select styled the way the store/super-admin filter rows style theirs.
 * `options` is `[{ value, label }]`.
 */
export function SelectControl({ value, onChange, options, className, ariaLabel }) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-white/15 dark:bg-[#111c35] dark:text-white',
        className
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/* ------------------------------------------------------------------ *
 * Table chrome
 * ------------------------------------------------------------------ */

export const thClass = (align = 'left') =>
  cn(
    'border-b border-slate-200 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-white/10 align-middle',
    align === 'right' && 'text-right'
  )

export const tdClass = (align = 'left') =>
  cn('px-5 py-3 align-middle', align === 'right' && 'text-right')

export const trClass = 'border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5'

/* ------------------------------------------------------------------ *
 * Pagination
 * ------------------------------------------------------------------ */

export const PAGE_SIZES = [10, 25, 50]

/**
 * Footer used under every paginated table. Renders nothing when there is a single
 * page, so short lists do not show dead controls.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  unit = 'items',
}) {
  if (!totalPages || totalPages <= 1) return null

  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, total)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Showing {from}–{to} of {total} {unit} · Page {page + 1} of {totalPages}
        </span>
        {onPageSizeChange && (
          <select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 dark:border-white/15 dark:bg-[#111c35] dark:text-white"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Loading / empty states
 * ------------------------------------------------------------------ */

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <RefreshCw className="size-7 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/5">
        <Icon className="size-5" />
      </span>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

/** Standard currency rendering used across every branch screen. */
export const formatCurrency = (value, decimals = 2) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`

export const formatNumber = (value) => Number(value || 0).toLocaleString('en-IN')