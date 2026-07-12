import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '../lib/utils'

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <section className={cn('rounded-lg border border-slate-200 bg-white p-5 shadow-sm', className)}>{children}</section>
}

export function Button({
  children,
  className,
  variant = 'primary',
  ...props
}: PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }>) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-slate-950 text-white hover:bg-slate-800',
        variant === 'secondary' && 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
        variant === 'ghost' && 'text-slate-700 hover:bg-slate-100',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ children }: PropsWithChildren) {
  return <label className="mb-1.5 block text-sm font-medium text-slate-700">{children}</label>
}

export function Badge({ children, tone = 'slate' }: PropsWithChildren<{ tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' }>) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', tones[tone])}>{children}</span>
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function StatCard({ icon, label, value, helper }: { icon: ReactNode; label: string; value: string | number; helper: string }) {
  return (
    <Card className="min-h-32">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="rounded-md bg-teal-50 p-2 text-teal-700">{icon}</div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{helper}</p>
    </Card>
  )
}
