import { useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Link2,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Layout, type ViewKey } from './components/Layout'
import { Badge, Button, Card, Input, Label, ProgressBar, Select, StatCard } from './components/ui'
import { seedData, users } from './data/seed'
import { formatDate, uid } from './lib/utils'
import type { AppData, Assignment, AttendanceStatus, Parent, Role, Status, Student, Subject, Tutor, User } from './types'

const queryClient = new QueryClient()

const studentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  board: z.string().min(2),
  grade: z.string().min(1),
  tutorId: z.string().min(1),
  totalFee: z.number().min(0),
  feePaid: z.number().min(0),
})

const parentSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  studentId: z.string().min(1),
})

const assignmentSchema = z.object({
  title: z.string().min(3),
  subjectId: z.string().min(1),
  studentId: z.string().min(1),
  dueDate: z.string().min(1),
  maxScore: z.number().min(1).max(100),
})

const curriculumSchema = z.object({
  title: z.string().min(2),
  board: z.string().min(2),
  grade: z.string().min(1),
  sourceUrl: z.string().min(2),
  unitTitle: z.string().min(2),
  topicTitle: z.string().min(2),
  outcomeTitle: z.string().min(3),
})

type CurriculumFormValues = z.infer<typeof curriculumSchema>

function statusTone(status: Status | 'Active' | 'Inactive') {
  if (status === 'Active' || status === 'Reviewed' || status === 'Submitted') return 'green'
  if (status === 'Pending') return 'amber'
  if (status === 'Overdue' || status === 'Inactive') return 'red'
  return 'slate'
}

function feeSummary(totalFee: number, feePaid: number) {
  const pendingFee = Math.max(totalFee - feePaid, 0)
  return {
    pendingFee,
    feeStatus: pendingFee === 0 ? 'Completed' as const : 'Pending' as const,
  }
}

function normalizeGrade(value: string) {
  const match = value.match(/\d+/)
  return match ? `Grade ${Number(match[0])}` : value.trim()
}

function attendanceTone(status: AttendanceStatus) {
  if (status === 'Present') return 'green'
  if (status === 'Late' || status === 'Excused') return 'amber'
  return 'red'
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [role, setRole] = useState<Role>('Admin')
  const selected = users.find((user) => user.role === role) ?? users[0]

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex items-center bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_52%,#f59e0b_100%)] px-6 py-12 text-white md:px-12">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/20">
              <ShieldCheck size={18} />
              Single tutoring center LMS
            </div>
          <h1 className="max-w-2xl text-4xl font-black leading-tight md:text-6xl">Zefinity Student Learning Management</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-teal-50">
              A role-based MVP for curriculum planning, fee visibility, attendance, and assignment review.
            </p>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {['CBSC curriculum', 'Fee badges', 'Attendance tracking'].map((item) => (
                <div key={item} className="rounded-lg bg-white/10 p-4 text-sm font-semibold ring-1 ring-white/20">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="flex items-center justify-center bg-slate-50 px-6 py-10">
          <Card className="w-full max-w-md p-6">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Demo login</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Choose a workspace</h2>
              <p className="mt-2 text-sm text-slate-500">Each role opens a tailored MVP workflow using seeded local data.</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Role</Label>
                <Select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                  {users.map((user) => (
                    <option key={user.id} value={user.role}>
                      {user.role} - {user.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">{selected.name}</p>
                <p className="text-sm text-slate-500">{selected.email}</p>
              </div>
              <Button className="w-full" onClick={() => onLogin(selected)}>
                Open {role} dashboard
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </main>
  )
}

function Dashboard({ data, user }: { data: AppData; user: User }) {
  const pending = data.assignments.filter((assignment) => assignment.status === 'Pending').length
  const overdue = data.assignments.filter((assignment) => assignment.status === 'Overdue').length
  const activeStudents = data.students.filter((student) => student.status === 'Active').length
  const chartData = data.students.map((student) => ({ name: student.name.split(' ')[0], pendingFee: student.pendingFee }))

  const today = new Date().toISOString().slice(0, 10)
  const todayLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const todayRecords = data.attendance.filter((r) => r.date === today)
  const totalStudents = data.students.filter((s) => s.status === 'Active').length
  const presentCount = todayRecords.filter((r) => r.status === 'Present').length
  const absentCount = todayRecords.filter((r) => r.status === 'Absent').length
  const lateCount = todayRecords.filter((r) => r.status === 'Late').length
  const excusedCount = todayRecords.filter((r) => r.status === 'Excused').length
  const notMarked = totalStudents - todayRecords.length

  const linkedStudents = user.role === 'Parent'
    ? data.students.filter((student) => {
        const parent = data.parents.find((p) => p.id === user.id)
        return parent?.studentIds.includes(student.id)
      })
    : []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<GraduationCap size={22} />} label="Active students" value={activeStudents} helper="Across CBSC grades" />
        <StatCard icon={<Users size={22} />} label="Parent profiles" value={data.parents.length} helper="Linked to one or more learners" />
        <StatCard icon={<BookOpen size={22} />} label="Curriculum subjects" value={data.subjects.length} helper="With source references and outcomes" />
        <StatCard icon={<Clock size={22} />} label="Needs attention" value={pending + overdue} helper={`${pending} pending, ${overdue} overdue assignments`} />
      </div>

      {user.role === 'Admin' && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Today's attendance</h2>
              <p className="text-sm text-slate-500">{todayLabel}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200">
            <div className="flex flex-col items-center justify-center px-4 py-6">
              <span className="text-3xl font-bold text-emerald-600">{presentCount}</span>
              <span className="mt-1 text-sm font-semibold text-slate-500">Present</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-6">
              <span className="text-4xl font-black text-slate-950">{totalStudents}</span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Total students</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4 py-6">
              <span className="text-3xl font-bold text-rose-600">{absentCount}</span>
              <span className="mt-1 text-sm font-semibold text-slate-500">Absent</span>
            </div>
          </div>
          {(lateCount > 0 || excusedCount > 0 || notMarked > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {lateCount > 0 && <Badge tone="amber">{lateCount} Late</Badge>}
              {excusedCount > 0 && <Badge tone="blue">{excusedCount} Excused</Badge>}
              {notMarked > 0 && <Badge tone="slate">{notMarked} Not marked</Badge>}
            </div>
          )}
        </Card>
      )}

      {user.role === 'Parent' && linkedStudents.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Fee status</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {linkedStudents.map((student) => (
              <div key={student.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3">
                <span className="text-sm font-semibold text-slate-950">{student.name}</span>
                <Badge tone={student.feeStatus === 'Completed' ? 'green' : 'amber'}>{student.feeStatus}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className={`grid gap-6 ${user.role !== 'Tutor' && user.role !== 'Parent' ? 'xl:grid-cols-[1.3fr_0.7fr]' : ''}`}>
        {user.role !== 'Tutor' && user.role !== 'Parent' && (
          <Card>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Fee pending by student</h2>
                <p className="text-sm text-slate-500">Outstanding fee balances visible to admins and parents.</p>
              </div>
              <Badge tone="blue">{user.role} view</Badge>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="feeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="pendingFee" stroke="#0f766e" fill="url(#feeFill)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-bold text-slate-950">Recent tutor feedback</h2>
          <div className="mt-4 space-y-4">
            {data.feedback.filter((item) => item.status === 'Approved').map((item) => {
              const student = data.students.find((entry) => entry.id === item.studentId)
              return (
                <div key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-950">{student?.name}</p>
                    <span className="text-xs text-slate-500">{formatDate(item.date)}</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{item.message}</p>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

function AdminTutors({ data, setData, user }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; user: User }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subjects, setSubjects] = useState('')
  const [createTutorOpen, setCreateTutorOpen] = useState(false)
  const [editingTutorId, setEditingTutorId] = useState<string | null>(null)
  const canManageTutors = user.role === 'Admin'

  function openCreateTutor() {
    setEditingTutorId(null)
    setName('')
    setEmail('')
    setSubjects('')
    setCreateTutorOpen(true)
  }

  function closeTutorModal() {
    setCreateTutorOpen(false)
    setEditingTutorId(null)
    setName('')
    setEmail('')
    setSubjects('')
  }

  function submitTutor() {
    if (!canManageTutors) return
    if (!name || !email) return
    if (editingTutorId) {
      setData((current) => ({
        ...current,
        tutors: current.tutors.map((tutor) =>
          tutor.id === editingTutorId
            ? {
                ...tutor,
                name,
                email,
                subjects: subjects
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              }
            : tutor,
        ),
      }))
      closeTutorModal()
      return
    }
    const tutor: Tutor = {
      id: uid('t'),
      name,
      email,
      subjects: subjects.split(',').map((item) => item.trim()).filter(Boolean),
      status: 'Active',
      students: 0,
    }
    setData((current) => ({ ...current, tutors: [tutor, ...current.tutors] }))
    closeTutorModal()
  }

  function startEditTutor(tutor: Tutor) {
    if (!canManageTutors) return
    setEditingTutorId(tutor.id)
    setName(tutor.name)
    setEmail(tutor.email)
    setSubjects(tutor.subjects.join(', '))
    setCreateTutorOpen(true)
  }

  function toggleTutorStatus(tutorId: string) {
    if (!canManageTutors) return
    setData((current) => ({
      ...current,
      tutors: current.tutors.map((entry) =>
        entry.id === tutorId ? { ...entry, status: entry.status === 'Active' ? 'Inactive' : 'Active' } : entry,
      ),
    }))
  }

  function deleteTutor(tutorId: string) {
    if (!canManageTutors) return
    setData((current) => ({
      ...current,
      tutors: current.tutors.filter((tutor) => tutor.id !== tutorId),
      students: current.students.map((student) => (student.tutorId === tutorId ? { ...student, tutorId: '' } : student)),
    }))
    if (editingTutorId === tutorId) {
      setEditingTutorId(null)
    }
  }

  return (
    <div className="space-y-6">
      {createTutorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close tutor modal"
            onClick={closeTutorModal}
          />
          <Card className="relative z-10 w-full max-w-xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{editingTutorId ? 'Edit tutor' : 'Create tutor'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingTutorId ? 'Update tutor profile details and subject coverage.' : 'Add a tutor profile and activate access for the tutoring center.'}
                </p>
              </div>
              <Button variant="ghost" className="px-2" onClick={closeTutorModal}>
                ×
              </Button>
            </div>
            {!canManageTutors && <p className="mt-4 text-sm text-rose-600">Only Admin users can manage tutor records.</p>}
            <div className="mt-5 space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tutor name" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tutor@example.com" />
              </div>
              <div>
                <Label>Subjects</Label>
                <Input value={subjects} onChange={(event) => setSubjects(event.target.value)} placeholder="Mathematics, Physics" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={closeTutorModal}>
                  Cancel
                </Button>
                <Button onClick={submitTutor} disabled={!canManageTutors}>
                  {editingTutorId ? <Save size={16} /> : <Plus size={16} />}
                  {editingTutorId ? 'Update tutor' : 'Add tutor'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Tutor directory</h2>
            <p className="mt-1 text-sm text-slate-500">Create, edit, activate, deactivate, and delete tutor profiles.</p>
          </div>
          <Button onClick={openCreateTutor} disabled={!canManageTutors}>
            <Plus size={16} />
            Create tutor
          </Button>
        </div>
        {!canManageTutors && <p className="mt-3 text-sm text-rose-600">Only Admin users can manage tutor records.</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3">Tutor</th>
                <th>Subjects</th>
                <th>Students</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tutors.map((tutor) => (
                <tr key={tutor.id}>
                  <td className="py-4">
                    <p className="font-semibold text-slate-950">{tutor.name}</p>
                    <p className="text-slate-500">{tutor.email}</p>
                  </td>
                  <td>{tutor.subjects.join(', ')}</td>
                  <td>{tutor.students}</td>
                  <td>
                    <Badge tone={statusTone(tutor.status)}>{tutor.status}</Badge>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => startEditTutor(tutor)} disabled={!canManageTutors}>
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => toggleTutorStatus(tutor.id)}
                        disabled={!canManageTutors}
                      >
                        {tutor.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="secondary" onClick={() => deleteTutor(tutor.id)} disabled={!canManageTutors}>
                        <Trash2 size={16} />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Students({ data, setData, user }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; user: User }) {
  const { register, handleSubmit, reset, formState } = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: { board: 'CBSC', grade: 'Grade 5', tutorId: data.tutors[0]?.id ?? '', totalFee: 0, feePaid: 0 },
  })
  const [createStudentOpen, setCreateStudentOpen] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const canManageStudents = user.role === 'Admin'
  const visibleStudents =
    user.role === 'Tutor'
      ? data.students.filter((student) => student.tutorId === user.id)
      : data.students.filter((student) => user.role !== 'Parent' || student.parentIds.includes(user.id))

  function syncCurriculumAllocations(subjects: Subject[], studentId: string, board: string, grade: string) {
    const normalizedBoard = board.trim().toUpperCase()
    const normalizedGrade = normalizedBoard === 'CBSC' ? normalizeGrade(grade) : grade.trim()
    return subjects.map((subject) => {
      const withoutStudent = subject.studentProgress.filter((entry) => entry.studentId !== studentId)
      const shouldAllocate = normalizedBoard === 'CBSC' && subject.board === 'CBSC' && subject.grade === normalizedGrade
      return shouldAllocate ? { ...subject, studentProgress: [...withoutStudent, { studentId, progress: 0 }] } : { ...subject, studentProgress: withoutStudent }
    })
  }

  function openCreateStudent() {
    setEditingStudentId(null)
    reset({ name: '', email: '', board: 'CBSC', grade: 'Grade 5', tutorId: data.tutors[0]?.id ?? '', totalFee: 0, feePaid: 0 })
    setCreateStudentOpen(true)
  }

  function closeStudentModal() {
    setCreateStudentOpen(false)
    setEditingStudentId(null)
    reset({ name: '', email: '', board: 'CBSC', grade: 'Grade 5', tutorId: data.tutors[0]?.id ?? '', totalFee: 0, feePaid: 0 })
  }

  function onSubmit(values: z.infer<typeof studentSchema>) {
    if (!canManageStudents) return
    const normalizedBoard = values.board.trim().toUpperCase() === 'CBSC' ? 'CBSC' : values.board.trim()
    const normalizedGrade = normalizedBoard === 'CBSC' ? normalizeGrade(values.grade) : values.grade.trim()
    const fee = feeSummary(values.totalFee, values.feePaid)
    if (editingStudentId) {
      setData((current) => ({
        ...current,
        students: current.students.map((student) =>
          student.id === editingStudentId
            ? { ...student, ...values, board: normalizedBoard, grade: normalizedGrade, pendingFee: fee.pendingFee, feeStatus: fee.feeStatus }
            : student,
        ),
        subjects: syncCurriculumAllocations(current.subjects, editingStudentId, normalizedBoard, normalizedGrade),
      }))
      closeStudentModal()
      return
    }
    const student: Student = {
      id: uid('s'),
      ...values,
      board: normalizedBoard,
      grade: normalizedGrade,
      parentIds: [],
      progress: 0,
      pendingFee: fee.pendingFee,
      feeStatus: fee.feeStatus,
      status: 'Active',
    }
    setData((current) => ({ ...current, students: [student, ...current.students], subjects: syncCurriculumAllocations(current.subjects, student.id, normalizedBoard, normalizedGrade) }))
    closeStudentModal()
  }

  function startEditStudent(student: Student) {
    if (!canManageStudents) return
    setEditingStudentId(student.id)
    reset({ name: student.name, email: student.email, board: student.board, grade: student.grade, tutorId: student.tutorId, totalFee: student.totalFee, feePaid: student.feePaid })
    setCreateStudentOpen(true)
  }

  function toggleStudentStatus(studentId: string) {
    if (!canManageStudents) return
    setData((current) => ({
      ...current,
      students: current.students.map((student) =>
        student.id === studentId ? { ...student, status: student.status === 'Active' ? 'Inactive' : 'Active' } : student,
      ),
    }))
  }

  function deleteStudent(studentId: string) {
    if (!canManageStudents) return
    const student = data.students.find((entry) => entry.id === studentId)
    if (!student) return
    setData((current) => ({
      ...current,
      students: current.students.filter((entry) => entry.id !== studentId),
      parents: current.parents.map((parent) => ({ ...parent, studentIds: parent.studentIds.filter((id) => id !== studentId) })),
      subjects: current.subjects.map((subject) => ({
        ...subject,
        studentProgress: subject.studentProgress.filter((entry) => entry.studentId !== studentId),
      })),
      assignments: current.assignments.map((assignment) => ({
        ...assignment,
        studentIds: assignment.studentIds.filter((id) => id !== studentId),
      })),
      feedback: current.feedback.filter((entry) => entry.studentId !== studentId),
      attendance: current.attendance.filter((entry) => entry.studentId !== studentId),
    }))
    if (editingStudentId === studentId) setEditingStudentId(null)
  }

  return (
    <div className="space-y-6">
      {createStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/50" aria-label="Close student modal" onClick={closeStudentModal} />
          <Card className="relative z-10 w-full max-w-xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{editingStudentId ? 'Edit student profile' : 'Create student profile'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingStudentId ? 'Update student profile, tutor, grade, and fee details.' : 'Create a student and auto-allocate CBSC curriculum by grade.'}
                </p>
              </div>
              <Button variant="ghost" className="px-2" onClick={closeStudentModal}>
                ×
              </Button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Label>Name</Label>
                <Input {...register('name')} placeholder="Student name" />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register('email')} placeholder="student@example.com" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Board</Label>
                  <Select {...register('board')}>
                    {['CBSC'].map((board) => (
                      <option key={board}>{board}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Grade/Level</Label>
                  <Input {...register('grade')} placeholder="Grade 10" />
                </div>
              </div>
              <div>
                <Label>Tutor</Label>
                <Select {...register('tutorId')}>
                  {data.tutors.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {tutor.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Total fee</Label>
                  <Input type="number" min={0} {...register('totalFee', { valueAsNumber: true })} />
                </div>
                <div>
                  <Label>Fee paid</Label>
                  <Input type="number" min={0} {...register('feePaid', { valueAsNumber: true })} />
                </div>
              </div>
              {formState.errors.name && <p className="text-sm text-rose-600">Enter a valid student name.</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={closeStudentModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStudentId ? <Save size={16} /> : <UserRoundPlus size={16} />}
                  {editingStudentId ? 'Update student' : 'Create student'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{user.role === 'Parent' ? 'Linked children' : 'Student profiles'}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {user.role === 'Tutor' ? 'Assigned students are shown for attendance and curriculum work.' : 'Student profile, fee, and parent status.'}
            </p>
          </div>
          {canManageStudents && (
            <Button onClick={openCreateStudent}>
              <UserRoundPlus size={16} />
              Create student
            </Button>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3">Student</th>
                <th>Board</th>
                <th>Grade</th>
                <th>Tutor</th>
                {user.role !== 'Tutor' && <th>Total fee</th>}
                {user.role !== 'Tutor' && <th>Pending fee</th>}
                {user.role !== 'Tutor' && <th>Fee</th>}
                <th>Status</th>
                <th>Parents</th>
                {canManageStudents && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleStudents.map((student) => (
                <tr key={student.id}>
                  <td className="py-4">
                    <p className="font-semibold text-slate-950">{student.name}</p>
                    <p className="text-slate-500">{student.email}</p>
                  </td>
                  <td>{student.board}</td>
                  <td>{student.grade}</td>
                  <td>{data.tutors.find((tutor) => tutor.id === student.tutorId)?.name ?? 'Unassigned'}</td>
                  {user.role !== 'Tutor' && <td>INR {student.totalFee.toLocaleString('en-IN')}</td>}
                  {user.role !== 'Tutor' && <td>INR {student.pendingFee.toLocaleString('en-IN')}</td>}
                  {user.role !== 'Tutor' && (
                    <td>
                      <Badge tone={student.feeStatus === 'Completed' ? 'green' : 'amber'}>{student.feeStatus}</Badge>
                    </td>
                  )}
                  <td>
                    <Badge tone={statusTone(student.status)}>{student.status}</Badge>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {student.parentIds.map((parentId) => (
                        <Badge key={parentId}>{data.parents.find((parent) => parent.id === parentId)?.name}</Badge>
                      ))}
                    </div>
                  </td>
                  {canManageStudents && (
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => startEditStudent(student)}>
                          Edit
                        </Button>
                        <Button variant="secondary" onClick={() => toggleStudentStatus(student.id)}>
                          {student.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="secondary" onClick={() => deleteStudent(student.id)}>
                          <Trash2 size={16} />
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {user.role === 'Parent' && (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Attendance</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {visibleStudents.map((student) => {
              const records = data.attendance.filter((record) => record.studentId === student.id)
              const present = records.filter((record) => record.status === 'Present').length
              const absent = records.filter((record) => record.status === 'Absent').length
              const late = records.filter((record) => record.status === 'Late').length
              return (
                <div key={student.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-950">{student.name}</p>
                      <p className="text-sm text-slate-500">
                        Present {present} / Absent {absent} / Late {late}
                      </p>
                    </div>
                    <Badge tone={student.feeStatus === 'Completed' ? 'green' : 'amber'}>{student.feeStatus}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {records.slice(0, 4).map((record) => (
                      <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 p-2 text-sm">
                        <span>{formatDate(record.date)}</span>
                        <Badge tone={attendanceTone(record.status)}>{record.status}</Badge>
                        {record.notes && <span className="basis-full text-slate-500">{record.notes}</span>}
                      </div>
                    ))}
                    {records.length === 0 && <p className="text-sm text-slate-500">No attendance records yet.</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

function Parents({ data, setData, user }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; user: User }) {
  const { register, handleSubmit, reset } = useForm<z.infer<typeof parentSchema>>({
    resolver: zodResolver(parentSchema),
    defaultValues: { studentId: data.students[0]?.id },
  })
  const [createParentOpen, setCreateParentOpen] = useState(false)
  const [editingParentId, setEditingParentId] = useState<string | null>(null)
  const canManageParents = user.role === 'Admin'
  const tutorStudents = data.students
  const tutorStudentIds = new Set(tutorStudents.map((student) => student.id))
  const visibleParents =
    user.role === 'Tutor'
      ? data.parents.filter((parent) => parent.studentIds.some((studentId) => tutorStudentIds.has(studentId)))
      : data.parents

  function openCreateParent() {
    setEditingParentId(null)
    reset({ name: '', email: '', phone: '', studentId: tutorStudents[0]?.id ?? '' })
    setCreateParentOpen(true)
  }

  function closeParentModal() {
    setCreateParentOpen(false)
    setEditingParentId(null)
    reset({ name: '', email: '', phone: '', studentId: tutorStudents[0]?.id ?? '' })
  }

  function onSubmit(values: z.infer<typeof parentSchema>) {
    const linkedStudentId = tutorStudentIds.has(values.studentId) ? values.studentId : tutorStudents[0]?.id
    if (!canManageParents || !linkedStudentId) return
    if (editingParentId) {
      setData((current) => ({
        ...current,
        parents: current.parents.map((parent) =>
          parent.id === editingParentId
            ? {
                ...parent,
                name: values.name,
                email: values.email,
                phone: values.phone,
                studentIds: [...new Set([...parent.studentIds, linkedStudentId])],
              }
            : parent,
        ),
        students: current.students.map((student) =>
          student.id === linkedStudentId ? { ...student, parentIds: [...new Set([...student.parentIds, editingParentId])] } : student,
        ),
      }))
      closeParentModal()
      return
    }
    const parent: Parent = {
      id: uid('p'),
      name: values.name,
      email: values.email,
      phone: values.phone,
      studentIds: [linkedStudentId],
      status: 'Active',
    }
    setData((current) => ({
      ...current,
      parents: [parent, ...current.parents],
      students: current.students.map((student) =>
        student.id === linkedStudentId ? { ...student, parentIds: [...new Set([...student.parentIds, parent.id])] } : student,
      ),
    }))
    closeParentModal()
  }

  function linkParent(parentId: string, studentId: string) {
    if (!canManageParents || !tutorStudentIds.has(studentId)) return
    setData((current) => ({
      ...current,
      parents: current.parents.map((parent) =>
        parent.id === parentId ? { ...parent, studentIds: [...new Set([...parent.studentIds, studentId])] } : parent,
      ),
      students: current.students.map((student) =>
        student.id === studentId ? { ...student, parentIds: [...new Set([...student.parentIds, parentId])] } : student,
      ),
    }))
  }

  function startEditParent(parent: Parent) {
    if (!canManageParents) return
    setEditingParentId(parent.id)
    reset({
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      studentId: parent.studentIds.find((studentId) => tutorStudentIds.has(studentId)) ?? tutorStudents[0]?.id ?? '',
    })
    setCreateParentOpen(true)
  }

  function toggleParentStatus(parentId: string) {
    if (!canManageParents) return
    setData((current) => ({
      ...current,
      parents: current.parents.map((parent) =>
        parent.id === parentId ? { ...parent, status: parent.status === 'Active' ? 'Inactive' : 'Active' } : parent,
      ),
    }))
  }

  function deleteParent(parentId: string) {
    if (!canManageParents) return
    setData((current) => ({
      ...current,
      parents: current.parents.filter((parent) => parent.id !== parentId),
      students: current.students.map((student) => ({ ...student, parentIds: student.parentIds.filter((id) => id !== parentId) })),
    }))
    if (editingParentId === parentId) setEditingParentId(null)
  }

  return (
    <div className="space-y-6">
      {createParentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/50" aria-label="Close parent modal" onClick={closeParentModal} />
          <Card className="relative z-10 w-full max-w-xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{editingParentId ? 'Edit parent profile' : 'Create parent profile'}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingParentId ? 'Update parent details and child access.' : 'Link parent access to one of your students.'}
                </p>
              </div>
              <Button variant="ghost" className="px-2" onClick={closeParentModal}>
                ×
              </Button>
            </div>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <Label>Name</Label>
                <Input {...register('name')} placeholder="Parent name" />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register('email')} placeholder="parent@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input {...register('phone')} placeholder="+91 ..." />
              </div>
              <div>
                <Label>Link child</Label>
                <Select {...register('studentId')}>
                  {tutorStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={closeParentModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingParentId ? <Save size={16} /> : <Users size={16} />}
                  {editingParentId ? 'Update parent' : 'Create parent'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Parent profiles</h2>
            <p className="mt-1 text-sm text-slate-500">Create parents and link them to one or more students.</p>
          </div>
          {canManageParents && (
            <Button onClick={openCreateParent}>
              <Users size={16} />
              Create parent
            </Button>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3">Parent</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Linked students</th>
                {canManageParents && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleParents.map((parent) => (
                <tr key={parent.id}>
                  <td className="py-4">
                    <p className="font-semibold text-slate-950">{parent.name}</p>
                    <p className="text-slate-500">{parent.email}</p>
                  </td>
                  <td>{parent.phone}</td>
                  <td>
                    <Badge tone={statusTone(parent.status)}>{parent.status}</Badge>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      {parent.studentIds
                        .filter((studentId) => user.role !== 'Tutor' || tutorStudentIds.has(studentId))
                        .map((studentId) => (
                          <Badge key={studentId} tone="blue">
                            <Link2 size={12} /> {data.students.find((student) => student.id === studentId)?.name}
                          </Badge>
                        ))}
                      {canManageParents && (
                        <Select className="max-w-44" onChange={(event) => event.target.value && linkParent(parent.id, event.target.value)} defaultValue="">
                          <option value="" disabled>
                            Add child
                          </option>
                          {tutorStudents.map((student) => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                  </td>
                  {canManageParents && (
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => startEditParent(parent)}>
                          Edit
                        </Button>
                        <Button variant="secondary" onClick={() => toggleParentStatus(parent.id)}>
                          {parent.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant="secondary" onClick={() => deleteParent(parent.id)}>
                          <Trash2 size={16} />
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function CurriculumModalView({
  data,
  setData,
  user,
}: {
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
  user: User
}) {
  const { register, handleSubmit, reset, setValue } = useForm<CurriculumFormValues>({
    resolver: zodResolver(curriculumSchema),
    defaultValues: { board: 'CBSC', grade: 'Grade 5', sourceUrl: 'https://cbseacademic.nic.in/curriculum.html' },
  })
  const isTutor = user.role === 'Tutor'
  const tutorStudents = isTutor ? data.students.filter((student) => student.tutorId === user.id) : data.students
  const currentStudent = user.role === 'Student' ? data.students.find((student) => student.id === user.id) : undefined
  const visibleSubjects =
    user.role === 'Student' && currentStudent
      ? data.subjects.filter((subject) => subject.studentProgress.some((entry) => entry.studentId === user.id))
      : data.subjects
  const [selectedStudentId, setSelectedStudentId] = useState(tutorStudents[0]?.id ?? '')
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null)
  const [allocatedStudentIds, setAllocatedStudentIds] = useState<string[]>([])
  const [pdfSource, setPdfSource] = useState('')
  const [importMessage, setImportMessage] = useState('')

  function buildUnits(values: CurriculumFormValues, existing?: Subject): Subject['units'] {
    const firstUnit = existing?.units[0]
    const firstTopic = firstUnit?.topics[0]
    const firstOutcome = firstTopic?.outcomes[0]
    return [
      {
        id: firstUnit?.id ?? uid('unit'),
        title: values.unitTitle,
        progress: firstUnit?.progress ?? 0,
        topics: [
          {
            id: firstTopic?.id ?? uid('topic'),
            title: values.topicTitle,
            outcomes: [{ id: firstOutcome?.id ?? uid('lo'), title: values.outcomeTitle, complete: firstOutcome?.complete ?? false }],
          },
        ],
      },
      ...(existing?.units.slice(1) ?? []),
    ]
  }

  function progressForAllocation(subject: Subject | undefined, studentId: string) {
    return subject?.studentProgress.find((entry) => entry.studentId === studentId)?.progress ?? 0
  }

  function createSubject(values: CurriculumFormValues, studentIds = allocatedStudentIds): Subject {
    return {
      id: uid('sub'),
      title: values.title.trim(),
      board: values.board.trim(),
      grade: values.grade.trim(),
      sourceUrl: values.sourceUrl.trim(),
      studentProgress: studentIds.map((studentId) => ({ studentId, progress: 0 })),
      units: buildUnits(values),
    }
  }

  function resetCurriculumForm() {
    reset({
      title: '',
      board: 'CBSC',
      grade: 'Grade 5',
      sourceUrl: 'https://cbseacademic.nic.in/curriculum.html',
      unitTitle: '',
      topicTitle: '',
      outcomeTitle: '',
    })
    setAllocatedStudentIds(tutorStudents[0]?.id ? [tutorStudents[0].id] : [])
    setPdfSource('')
    setImportMessage('')
    setEditingSubjectId(null)
  }

  function openCreateModal() {
    setModalMode('create')
    resetCurriculumForm()
    setCurriculumModalOpen(true)
  }

  function openEditModal(subject: Subject) {
    const firstUnit = subject.units[0]
    const firstTopic = firstUnit?.topics[0]
    const firstOutcome = firstTopic?.outcomes[0]
    setModalMode('edit')
    setEditingSubjectId(subject.id)
    reset({
      title: subject.title,
      board: subject.board,
      grade: subject.grade,
      sourceUrl: subject.sourceUrl,
      unitTitle: firstUnit?.title ?? '',
      topicTitle: firstTopic?.title ?? '',
      outcomeTitle: firstOutcome?.title ?? '',
    })
    setAllocatedStudentIds(subject.studentProgress.map((entry) => entry.studentId).filter((studentId) => tutorStudents.some((student) => student.id === studentId)))
    setPdfSource(subject.sourceUrl.endsWith('.pdf') ? subject.sourceUrl : '')
    setImportMessage('')
    setCurriculumModalOpen(true)
  }

  function closeCurriculumModal() {
    setCurriculumModalOpen(false)
    setEditingSubjectId(null)
  }

  function toggleStudentAllocation(studentId: string) {
    setAllocatedStudentIds((current) => (current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]))
  }

  function onSubmit(values: CurriculumFormValues) {
    if (modalMode === 'edit' && editingSubjectId) {
      setData((current) => ({
        ...current,
        subjects: current.subjects.map((subject) =>
          subject.id === editingSubjectId
            ? {
                ...subject,
                title: values.title.trim(),
                board: values.board.trim(),
                grade: values.grade.trim(),
                sourceUrl: values.sourceUrl.trim(),
                units: buildUnits(values, subject),
                studentProgress: allocatedStudentIds.map((studentId) => ({ studentId, progress: progressForAllocation(subject, studentId) })),
              }
            : subject,
        ),
      }))
    } else {
      setData((current) => ({ ...current, subjects: [createSubject(values), ...current.subjects] }))
    }
    closeCurriculumModal()
    resetCurriculumForm()
  }

  function parseCsvRows(csvText: string) {
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false
    for (let index = 0; index < csvText.length; index += 1) {
      const char = csvText[index]
      const next = csvText[index + 1]
      if (char === '"' && quoted && next === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = !quoted
      } else if (char === ',' && !quoted) {
        row.push(cell.trim())
        cell = ''
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') index += 1
        row.push(cell.trim())
        if (row.some(Boolean)) rows.push(row)
        row = []
        cell = ''
      } else {
        cell += char
      }
    }
    row.push(cell.trim())
    if (row.some(Boolean)) rows.push(row)
    return rows
  }

  function importSubjectsFromCsv(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const [headers = [], ...rows] = parseCsvRows(text)
      const headerIndex = Object.fromEntries(headers.map((header, index) => [header.trim().toLowerCase(), index]))
      const valueFor = (row: string[], names: string[], fallback = '') => {
        const index = names.map((name) => headerIndex[name]).find((entry) => typeof entry === 'number')
        return typeof index === 'number' ? row[index] || fallback : fallback
      }
      const imported = rows
        .map((row) => {
          const values: CurriculumFormValues = {
            title: valueFor(row, ['title', 'subject'], ''),
            board: valueFor(row, ['board'], 'CBSC'),
            grade: valueFor(row, ['grade', 'level'], 'DP 1'),
            sourceUrl: valueFor(row, ['sourceurl', 'source_url', 'source'], `Uploaded CSV: ${file.name}`),
            unitTitle: valueFor(row, ['unittitle', 'unit_title', 'unit'], 'Imported unit'),
            topicTitle: valueFor(row, ['topictitle', 'topic_title', 'topic'], 'Imported topic'),
            outcomeTitle: valueFor(row, ['outcometitle', 'outcome_title', 'outcome'], 'Review imported curriculum outcome'),
          }
          const rowStudentIds = valueFor(row, ['studentids', 'student_ids', 'students'], '')
            .split(/[;|]/)
            .map((item) => item.trim())
            .filter((id) => tutorStudents.some((student) => student.id === id))
          return values.title ? createSubject(values, rowStudentIds.length ? rowStudentIds : allocatedStudentIds) : undefined
        })
        .filter((subject): subject is Subject => Boolean(subject))

      if (imported.length === 0) {
        setImportMessage('No curriculum rows were found. Use columns: title, board, grade, sourceUrl, unitTitle, topicTitle, outcomeTitle, studentIds.')
        return
      }
      setData((current) => ({ ...current, subjects: [...imported, ...current.subjects] }))
      setImportMessage(`${imported.length} curriculum record(s) imported from ${file.name}.`)
    }
    reader.readAsText(file)
  }

  function extractPdfSource(source: string) {
    const trimmed = source.trim()
    if (!trimmed) return
    const filename = trimmed.split(/[\\/]/).pop()?.replace(/\?.*$/, '') ?? 'curriculum.pdf'
    const title = filename.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim()
    setValue('sourceUrl', trimmed)
    setValue('title', title ? title.replace(/\b\w/g, (char) => char.toUpperCase()) : 'PDF Curriculum Source')
    setValue('unitTitle', 'Extracted PDF unit')
    setValue('topicTitle', 'Extracted PDF topic')
    setValue('outcomeTitle', 'Review and refine outcomes extracted from the PDF source')
    setImportMessage('PDF source details were extracted into the form. Review the generated fields before saving.')
  }

  function uploadPdfSource(file: File) {
    const sourceRef = `Uploaded PDF: ${file.name}`
    setPdfSource(sourceRef)
    extractPdfSource(sourceRef)
  }

  function deleteSubject(subjectId: string) {
    setData((current) => ({
      ...current,
      subjects: current.subjects.filter((subject) => subject.id !== subjectId),
      resources: current.resources.filter((resource) => resource.subjectId !== subjectId),
      assignments: current.assignments.filter((assignment) => assignment.subjectId !== subjectId),
    }))
  }

  function updateStudentProgress(subjectId: string, studentId: string, progress: number) {
    const nextProgress = Math.max(0, Math.min(100, progress))
    setData((current) => {
      const subjects = current.subjects.map((subject) => {
        if (subject.id !== subjectId) return subject
        const existing = subject.studentProgress.filter((entry) => entry.studentId !== studentId)
        return { ...subject, studentProgress: [...existing, { studentId, progress: nextProgress }] }
      })
      const studentSubjectProgress = subjects
        .map((subject) => subject.studentProgress.find((entry) => entry.studentId === studentId)?.progress)
        .filter((value): value is number => typeof value === 'number')
      const averageProgress =
        studentSubjectProgress.length > 0
          ? Math.round(studentSubjectProgress.reduce((sum, value) => sum + value, 0) / studentSubjectProgress.length)
          : nextProgress

      return {
        ...current,
        subjects,
        students: current.students.map((student) => (student.id === studentId ? { ...student, progress: averageProgress } : student)),
      }
    })
  }

  function subjectProgressFor(subject: Subject, studentId: string) {
    return subject.studentProgress.find((entry) => entry.studentId === studentId)?.progress ?? 0
  }

  return (
    <div className="space-y-6">
      {curriculumModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-950/50" aria-label="Close curriculum modal" onClick={closeCurriculumModal} />
          <Card className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">{modalMode === 'edit' ? 'Update curriculum' : 'Create curriculum'}</h2>
                <p className="mt-1 text-sm text-slate-500">Build curriculum records, allocate students, or import from CSV and PDF sources.</p>
              </div>
              <Button variant="ghost" className="px-2" onClick={closeCurriculumModal}>
                X
              </Button>
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div>
                  <Label>Subject</Label>
                  <Input {...register('title')} placeholder="Mathematics" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Board</Label>
                    <Input {...register('board')} placeholder="CBSC" />
                  </div>
                  <div>
                    <Label>Grade/Level</Label>
                    <Input {...register('grade')} placeholder="DP 1" />
                  </div>
                </div>
                <div>
                  <Label>Source URL or upload reference</Label>
                  <Input {...register('sourceUrl')} placeholder="https://..." />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input {...register('unitTitle')} placeholder="Functions and Equations" />
                </div>
                <div>
                  <Label>Topic</Label>
                  <Input {...register('topicTitle')} placeholder="Fractions and Decimals" />
                </div>
                <div>
                  <Label>Learning outcome</Label>
                  <Input {...register('outcomeTitle')} placeholder="Analyze roots and graph behavior" />
                </div>
                <div>
                  <Label>Student allocation</Label>
                  <div className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                    {tutorStudents.map((student) => (
                      <label key={student.id} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" checked={allocatedStudentIds.includes(student.id)} onChange={() => toggleStudentAllocation(student.id)} />
                        {student.name}
                      </label>
                    ))}
                    {tutorStudents.length === 0 && <p className="text-sm text-slate-500">Create students before allocating curriculum.</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" type="button" onClick={closeCurriculumModal}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save size={16} />
                    {modalMode === 'edit' ? 'Update curriculum' : 'Create curriculum'}
                  </Button>
                </div>
              </form>
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-950">Upload CSV</h3>
                  <p className="mt-1 text-sm text-slate-500">CSV columns: title, board, grade, sourceUrl, unitTitle, topicTitle, outcomeTitle, studentIds.</p>
                  <Input
                    className="mt-3"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) importSubjectsFromCsv(file)
                      event.currentTarget.value = ''
                    }}
                  />
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-bold text-slate-950">Extract from PDF source</h3>
                  <div className="mt-3 space-y-3">
                    <Input value={pdfSource} onChange={(event) => setPdfSource(event.target.value)} placeholder="https://.../curriculum.pdf" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button variant="secondary" type="button" onClick={() => extractPdfSource(pdfSource)}>
                        <Link2 size={16} />
                        Extract URL
                      </Button>
                      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                        <Upload size={16} />
                        Upload PDF
                        <input
                          className="sr-only"
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={(event) => {
                            const file = event.target.files?.[0]
                            if (file) uploadPdfSource(file)
                            event.currentTarget.value = ''
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                {importMessage && <p className="rounded-md bg-white p-3 text-sm text-slate-600">{importMessage}</p>}
              </div>
            </div>
          </Card>
        </div>
      )}
      {isTutor && (
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Curriculum builder</h2>
              <p className="mt-1 text-sm text-slate-500">Create, update, delete, import, and allocate curriculum to your students.</p>
            </div>
            <Button onClick={openCreateModal}>
              <Plus size={16} />
              Create curriculum
            </Button>
          </div>
          <div className="mt-5">
            <Label>Track completion by student</Label>
            <Select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
              {tutorStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </Select>
          </div>
        </Card>
      )}
      <Card>
        <h2 className="text-lg font-bold text-slate-950">Curriculum tree</h2>
        <div className="mt-4 space-y-4">
          {visibleSubjects.map((subject) => {
            const trackedStudentId = user.role === 'Student' ? user.id : selectedStudentId
            const trackedProgress = subjectProgressFor(subject, trackedStudentId)
            const allocatedStudents = subject.studentProgress
              .map((entry) => data.students.find((student) => student.id === entry.studentId)?.name)
              .filter(Boolean)
            return (
              <div key={subject.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-950">{subject.title}</p>
                    <p className="text-sm text-slate-500">
                      {subject.board} / {subject.grade}
                    </p>
                    <a className="mt-1 block break-all text-sm font-medium text-teal-700" href={subject.sourceUrl.startsWith('http') ? subject.sourceUrl : undefined} target="_blank">
                      {subject.sourceUrl}
                    </a>
                    <p className="mt-2 text-sm text-slate-500">Allocated to: {allocatedStudents.length ? allocatedStudents.join(', ') : 'No students allocated'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">{subject.units.length} unit(s)</Badge>
                    {isTutor && (
                      <Button variant="secondary" onClick={() => openEditModal(subject)}>
                        Edit
                      </Button>
                    )}
                    {isTutor && (
                      <Button variant="secondary" onClick={() => deleteSubject(subject.id)}>
                        <Trash2 size={16} />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                {isTutor && (
                  <div className="mt-4 rounded-md bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">Selected student completion</p>
                      <span className="text-sm font-bold text-slate-700">{trackedProgress}%</span>
                    </div>
                    <ProgressBar value={trackedProgress} />
                    {selectedStudentId && (
                    <Input className="mt-3" type="number" min={0} max={100} value={trackedProgress} onChange={(event) => updateStudentProgress(subject.id, selectedStudentId, Number(event.target.value))} />
                    )}
                  </div>
                )}
                <div className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
                  {subject.units.map((unit) => (
                    <div key={unit.id}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <p className="font-semibold text-slate-900">{unit.title}</p>
                        {isTutor && <span className="text-sm text-slate-500">{unit.progress}%</span>}
                      </div>
                      {isTutor && <ProgressBar value={unit.progress} />}
                      <div className="mt-3 space-y-2">
                        {unit.topics.map((topic) => (
                          <div key={topic.id} className="rounded-md bg-slate-50 p-3">
                            <p className="font-medium text-slate-800">{topic.title}</p>
                            <ul className="mt-2 space-y-1">
                              {topic.outcomes.map((outcome) => (
                                <li key={outcome.id} className="flex items-start gap-2 text-sm text-slate-600">
                                  <CheckCircle2 className={outcome.complete ? 'text-emerald-500' : 'text-slate-300'} size={16} />
                                  {outcome.title}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}


function Resources({ data, user }: { data: AppData; user: User }) {
  const visibleSubjectIds = new Set(
    user.role === 'Student'
      ? data.subjects.filter((subject) => subject.studentProgress.some((entry) => entry.studentId === user.id)).map((subject) => subject.id)
      : data.subjects.map((subject) => subject.id),
  )
  const visibleResources = data.resources.filter((resource) => visibleSubjectIds.has(resource.subjectId))
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleResources.map((resource) => {
        const subject = data.subjects.find((entry) => entry.id === resource.subjectId)
        return (
          <Card key={resource.id}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="rounded-md bg-amber-50 p-2 text-amber-700">
                <FileText size={22} />
              </div>
              <Badge tone={resource.type === 'Worksheet' ? 'amber' : 'blue'}>{resource.type}</Badge>
            </div>
            <h2 className="text-lg font-bold text-slate-950">{resource.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{subject?.title}</p>
            <a className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-700" href={resource.url} target="_blank">
              <Upload size={16} />
              View/download
            </a>
          </Card>
        )
      })}
    </div>
  )
}

function Attendance({ data, setData, user }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; user: User }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const students = data.students.filter((student) => student.tutorId === user.id)

  function recordFor(studentId: string) {
    return data.attendance.find((record) => record.studentId === studentId && record.date === date)
  }

  function updateAttendance(studentId: string, statusValue: AttendanceStatus, notes?: string) {
    const existing = recordFor(studentId)
    setData((current) => {
      if (existing) {
        return {
          ...current,
          attendance: current.attendance.map((record) =>
            record.id === existing.id ? { ...record, status: statusValue, notes } : record,
          ),
        }
      }
      return {
        ...current,
        attendance: [
          {
            id: uid('att'),
            studentId,
            tutorId: user.id,
            date,
            status: statusValue,
            notes,
          },
          ...current.attendance,
        ],
      }
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Daily attendance</h2>
            <p className="mt-1 text-sm text-slate-500">Mark attendance for students assigned to your tutor account.</p>
          </div>
          <div className="w-full max-w-xs">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3">Student</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => {
                const record = recordFor(student.id)
                return (
                  <tr key={student.id}>
                    <td className="py-4">
                      <p className="font-semibold text-slate-950">{student.name}</p>
                      <p className="text-slate-500">{student.email}</p>
                    </td>
                    <td>
                      {student.board} / {student.grade}
                    </td>
                    <td>
                      <Select
                        value={record?.status ?? ''}
                        onChange={(event) => updateAttendance(student.id, event.target.value as AttendanceStatus, record?.notes)}
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        {(['Present', 'Absent', 'Late', 'Excused'] as AttendanceStatus[]).map((statusValue) => (
                          <option key={statusValue} value={statusValue}>
                            {statusValue}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td>
                      <Input
                        value={record?.notes ?? ''}
                        placeholder="Optional note"
                        onChange={(event) => updateAttendance(student.id, record?.status ?? 'Present', event.target.value)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {students.length === 0 && <p className="p-4 text-sm text-slate-500">No students are assigned to this tutor.</p>}
        </div>
      </Card>
    </div>
  )
}

function Assignments({ data, setData, user }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; user: User }) {
  const { register, handleSubmit, reset } = useForm<z.infer<typeof assignmentSchema>>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { subjectId: data.subjects[0]?.id, studentId: data.students[0]?.id, maxScore: 20 },
  })

  const visibleAssignments = data.assignments.filter((assignment) => {
    if (user.role === 'Student') return assignment.studentIds.includes(user.id)
    if (user.role === 'Parent') {
      const childIds = data.parents.find((parent) => parent.id === user.id)?.studentIds ?? []
      return assignment.studentIds.some((studentId) => childIds.includes(studentId))
    }
    return true
  })

  function createAssignment(values: z.infer<typeof assignmentSchema>) {
    const assignment: Assignment = {
      id: uid('a'),
      title: values.title,
      subjectId: values.subjectId,
      studentIds: [values.studentId],
      dueDate: values.dueDate,
      status: 'Pending',
      maxScore: values.maxScore,
    }
    setData((current) => ({ ...current, assignments: [assignment, ...current.assignments] }))
    reset()
  }

  function updateAssignment(id: string, patch: Partial<Assignment>) {
    setData((current) => ({
      ...current,
      assignments: current.assignments.map((assignment) => (assignment.id === id ? { ...assignment, ...patch } : assignment)),
    }))
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      {user.role === 'Tutor' && (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Create assignment</h2>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit(createAssignment)}>
            <div>
              <Label>Title</Label>
              <Input {...register('title')} placeholder="Fractions and decimals practice" />
            </div>
            <div>
              <Label>Subject</Label>
              <Select {...register('subjectId')}>
                {data.subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Student</Label>
              <Select {...register('studentId')}>
                {data.students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Due date</Label>
                <Input type="date" {...register('dueDate')} />
              </div>
              <div>
                <Label>Max score</Label>
                <Input type="number" {...register('maxScore', { valueAsNumber: true })} />
              </div>
            </div>
            <Button type="submit">
              <Send size={16} />
              Assign
            </Button>
          </form>
        </Card>
      )}

      <Card className={user.role !== 'Tutor' ? 'xl:col-span-2' : ''}>
        <h2 className="text-lg font-bold text-slate-950">Assignment workflow</h2>
        <div className="mt-4 space-y-4">
          {visibleAssignments.map((assignment) => {
            const subject = data.subjects.find((entry) => entry.id === assignment.subjectId)
            const students = assignment.studentIds.map((id) => data.students.find((student) => student.id === id)?.name).join(', ')
            return (
              <div key={assignment.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-bold text-slate-950">{assignment.title}</p>
                    <p className="text-sm text-slate-500">
                      {subject?.title} · {students}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                      <CalendarClock size={15} /> Due {formatDate(assignment.dueDate)}
                    </p>
                  </div>
                  <Badge tone={statusTone(assignment.status)}>{assignment.status}</Badge>
                </div>
                {assignment.feedback && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{assignment.feedback}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {subject?.sourceUrl && (
                    <a className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" href={subject.sourceUrl} target="_blank">
                      <Upload size={16} />
                      Download resource
                    </a>
                  )}
                  {user.role === 'Student' && assignment.status === 'Pending' && (
                    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                      <Upload size={16} />
                      Upload completed picture
                      <input
                        className="sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) updateAssignment(assignment.id, { status: 'Submitted', submissionUrl: `Uploaded image: ${file.name}` })
                          event.currentTarget.value = ''
                        }}
                      />
                    </label>
                  )}
                  {user.role === 'Tutor' && assignment.status === 'Submitted' && (
                    <Button onClick={() => updateAssignment(assignment.id, { status: 'Reviewed', score: assignment.maxScore - 2, feedback: 'Reviewed. Strong attempt; revise explanations for the final step.' })}>
                      Review submission
                    </Button>
                  )}
                  <Badge>{assignment.score ? `${assignment.score}/${assignment.maxScore}` : `${assignment.maxScore} marks`}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}


function Feedback({ data, setData, user }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; user: User }) {
  const [message, setMessage] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const tutorStudents = user.role === 'Tutor' ? data.students.filter((s) => s.tutorId === user.id) : []
  const parentChildIds = user.role === 'Parent' ? (data.parents.find((p) => p.id === user.id)?.studentIds ?? []) : []

  const visibleFeedback = data.feedback.filter((item) => {
    if (user.role === 'Admin') return true
    if (user.role === 'Tutor') return item.tutorId === user.id
    if (user.role === 'Parent') return item.status === 'Approved' && parentChildIds.includes(item.studentId)
    return false
  })

  const pendingFeedback = visibleFeedback.filter((f) => f.status === 'Pending')
  const approvedFeedback = visibleFeedback.filter((f) => f.status === 'Approved')

  function submitFeedback() {
    if (!message.trim() || !selectedStudentId) return
    setData((current) => ({
      ...current,
      feedback: [
        { id: uid('f'), studentId: selectedStudentId, tutorId: user.id, date: new Date().toISOString().slice(0, 10), message: message.trim(), status: 'Pending' as const },
        ...current.feedback,
      ],
    }))
    setMessage('')
    setSelectedStudentId('')
  }

  function approveFeedback(feedbackId: string) {
    setData((current) => ({
      ...current,
      feedback: current.feedback.map((f) => f.id === feedbackId ? { ...f, status: 'Approved' as const } : f),
    }))
  }

  return (
    <div className="space-y-6">
      {user.role === 'Tutor' && (
        <Card>
          <h2 className="text-lg font-bold text-slate-950">Submit feedback</h2>
          <p className="mt-1 text-sm text-slate-500">Feedback is reviewed by the admin before it is sent to the parent.</p>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Student</Label>
              <Select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)}>
                <option value="" disabled>Select a student</option>
                {tutorStudents.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Feedback</Label>
              <textarea
                className="h-28 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                placeholder="Describe the student's performance, strengths, and areas for improvement..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button onClick={submitFeedback} disabled={!message.trim() || !selectedStudentId}>
              <Send size={16} />
              Submit for review
            </Button>
          </div>
        </Card>
      )}

      {user.role === 'Admin' && (
        <Card>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-950">Pending approval</h2>
            {pendingFeedback.length > 0 && <Badge tone="amber">{pendingFeedback.length}</Badge>}
          </div>
          {pendingFeedback.length === 0 && <p className="mt-3 text-sm text-slate-500">No feedback awaiting approval.</p>}
          <div className="mt-4 space-y-4">
            {pendingFeedback.map((item) => {
              const student = data.students.find((s) => s.id === item.studentId)
              const tutor = data.tutors.find((t) => t.id === item.tutorId)
              return (
                <div key={item.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-950">{student?.name}</p>
                        <Badge tone="amber">Pending</Badge>
                      </div>
                      <p className="text-sm text-slate-500">From {tutor?.name} · {formatDate(item.date)}</p>
                    </div>
                    <Button onClick={() => approveFeedback(item.id)}>
                      <CheckCircle2 size={16} />
                      Approve &amp; notify parent
                    </Button>
                  </div>
                  <p className="mt-3 leading-7 text-slate-700">{item.message}</p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-bold text-slate-950">
          {user.role === 'Parent' ? 'Notifications' : user.role === 'Admin' ? 'Approved feedback' : 'Submitted feedback'}
        </h2>
        {user.role === 'Parent' && <p className="mt-1 text-sm text-slate-500">Feedback approved by the admin from your child's tutor.</p>}
        <div className={`mt-4 ${user.role === 'Parent' ? 'space-y-4' : 'grid gap-4 md:grid-cols-2'}`}>
          {(user.role === 'Admin' ? approvedFeedback : visibleFeedback).length === 0 && (
            <p className="text-sm text-slate-500">No feedback here yet.</p>
          )}
          {(user.role === 'Admin' ? approvedFeedback : visibleFeedback).map((item) => {
            const student = data.students.find((s) => s.id === item.studentId)
            const tutor = data.tutors.find((t) => t.id === item.tutorId)
            const isParent = user.role === 'Parent'
            return (
              <Card key={item.id} className={isParent ? 'border-teal-200 bg-teal-50' : ''}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">{student?.name}</h2>
                    <p className="text-sm text-slate-500">From {tutor?.name} · {formatDate(item.date)}</p>
                  </div>
                  {isParent
                    ? <div className="flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700"><Bell size={12} /> New</div>
                    : <Badge tone={item.status === 'Approved' ? 'green' : 'amber'}>{item.status}</Badge>
                  }
                </div>
                <p className="mt-4 leading-7 text-slate-600">{item.message}</p>
              </Card>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function AppShell() {
  const [user, setUser] = useState<User | null>(null)
  const [view, setView] = useState<ViewKey>('dashboard')
  const [data, setData] = useState<AppData>(seedData)

  const page = useMemo(() => {
    if (!user) return null
    if (view === 'dashboard') return <Dashboard data={data} user={user} />
    if (view === 'tutors') return <AdminTutors data={data} setData={setData} user={user} />
    if (view === 'students') return <Students data={data} setData={setData} user={user} />
    if (view === 'parents') return user.role === 'Admin' ? <Parents data={data} setData={setData} user={user} /> : <Dashboard data={data} user={user} />
    if (view === 'curriculum') return <CurriculumModalView data={data} setData={setData} user={user} />
    if (view === 'resources') return <Resources data={data} user={user} />
    if (view === 'assignments') return <Assignments data={data} setData={setData} user={user} />
    if (view === 'attendance') return <Attendance data={data} setData={setData} user={user} />
    if (view === 'feedback') return <Feedback data={data} setData={setData} user={user} />
    return <Dashboard data={data} user={user} />
  }, [data, user, view])

  if (!user) {
    return (
      <Login
        onLogin={(selectedUser) => {
          setUser(selectedUser)
          setView('dashboard')
        }}
      />
    )
  }

  return (
    <Layout
      user={user}
      currentView={view}
      onViewChange={setView}
      onLogout={() => {
        setUser(null)
        setView('dashboard')
      }}
    >
      {page}
    </Layout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  )
}
