import { useState, type ReactNode } from 'react'
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MessageSquareText,
  Users,
  X,
} from 'lucide-react'
import type { Role, User } from '../types'
import { Button } from './ui'
import { cn } from '../lib/utils'

export type ViewKey =
  | 'dashboard'
  | 'tutors'
  | 'students'
  | 'parents'
  | 'curriculum'
  | 'resources'
  | 'assignments'
  | 'attendance'
  | 'feedback'

const navByRole: Record<Role, { key: ViewKey; label: string; icon: ReactNode }[]> = {
  Admin: [
    { key: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { key: 'tutors', label: 'Tutors', icon: <BriefcaseBusiness size={18} /> },
    { key: 'students', label: 'Students', icon: <GraduationCap size={18} /> },
    { key: 'parents', label: 'Parents', icon: <Users size={18} /> },
    { key: 'feedback', label: 'Feedback', icon: <MessageSquareText size={18} /> },
  ],
  Tutor: [
    { key: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { key: 'students', label: 'Students', icon: <GraduationCap size={18} /> },
    { key: 'curriculum', label: 'Curriculum', icon: <BookOpen size={18} /> },
    { key: 'resources', label: 'Resources', icon: <ClipboardList size={18} /> },
    { key: 'assignments', label: 'Assignments', icon: <ClipboardList size={18} /> },
    { key: 'attendance', label: 'Attendance', icon: <BarChart3 size={18} /> },
    { key: 'feedback', label: 'Feedback', icon: <MessageSquareText size={18} /> },
  ],
  Student: [
    { key: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { key: 'curriculum', label: 'Curriculum', icon: <BookOpen size={18} /> },
    { key: 'resources', label: 'Resources', icon: <ClipboardList size={18} /> },
    { key: 'assignments', label: 'Assignments', icon: <ClipboardList size={18} /> },
  ],
  Parent: [
    { key: 'dashboard', label: 'Dashboard', icon: <Home size={18} /> },
    { key: 'students', label: 'Children', icon: <GraduationCap size={18} /> },
    { key: 'assignments', label: 'Assignments', icon: <ClipboardList size={18} /> },
    { key: 'feedback', label: 'Feedback', icon: <MessageSquareText size={18} /> },
  ],
}

export function Layout({
  user,
  currentView,
  onViewChange,
  onLogout,
  children,
}: {
  user: User
  currentView: ViewKey
  onViewChange: (view: ViewKey) => void
  onLogout: () => void
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const nav = navByRole[user.role]

  const navContent = (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-600 font-bold text-white">ZT</div>
        <div>
          <p className="text-sm font-bold text-slate-950">{user.name}</p>
          <p className="text-xs font-semibold text-teal-700">{user.role}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              onViewChange(item.key)
              setOpen(false)
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition',
              currentView === item.key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-md bg-slate-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-800 shadow-sm">{user.avatar}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">{user.name}</p>
            <p className="text-xs text-slate-500">{user.role}</p>
          </div>
        </div>
        <Button variant="secondary" className="w-full" onClick={onLogout}>
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">{navContent}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <aside className="relative z-50 flex h-full w-80 max-w-[88vw] flex-col bg-white shadow-xl">{navContent}</aside>
        </div>
      )}

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="px-2 lg:hidden" onClick={() => setOpen((value) => !value)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </Button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{user.role} workspace</p>
              <h1 className="text-xl font-bold text-slate-950 md:text-2xl">Student Learning Management</h1>
            </div>
          </div>
          <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 md:block">
            Single-center MVP
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
