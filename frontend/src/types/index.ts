export type Role = 'Admin' | 'Tutor' | 'Student' | 'Parent'

export type Status = 'Active' | 'Inactive' | 'Pending' | 'Submitted' | 'Reviewed' | 'Overdue'
export type FeeStatus = 'Pending' | 'Completed'
export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused'

export type User = {
  id: string
  name: string
  email: string
  role: Role
  avatar: string
}

export type Tutor = {
  id: string
  name: string
  email: string
  subjects: string[]
  status: 'Active' | 'Inactive'
  students: number
}

export type Parent = {
  id: string
  name: string
  email: string
  phone: string
  studentIds: string[]
  status: 'Active' | 'Inactive'
}

export type Student = {
  id: string
  name: string
  email: string
  board: string
  grade: string
  tutorId: string
  parentIds: string[]
  progress: number
  totalFee: number
  feePaid: number
  pendingFee: number
  feeStatus: FeeStatus
  status: 'Active' | 'Inactive'
}

export type LearningOutcome = {
  id: string
  title: string
  complete: boolean
}

export type Topic = {
  id: string
  title: string
  outcomes: LearningOutcome[]
}

export type Unit = {
  id: string
  title: string
  progress: number
  topics: Topic[]
}

export type Subject = {
  id: string
  title: string
  board: string
  grade: string
  sourceUrl: string
  units: Unit[]
  studentProgress: { studentId: string; progress: number }[]
}

export type Resource = {
  id: string
  title: string
  type: 'Reference' | 'Worksheet' | 'Video' | 'Document'
  subjectId: string
  url: string
}

export type Assignment = {
  id: string
  title: string
  subjectId: string
  studentIds: string[]
  dueDate: string
  status: Status
  maxScore: number
  score?: number
  submissionUrl?: string
  feedback?: string
}

export type AttendanceRecord = {
  id: string
  studentId: string
  tutorId: string
  date: string
  status: AttendanceStatus
  notes?: string
}

export type Feedback = {
  id: string
  studentId: string
  tutorId: string
  date: string
  message: string
  status: 'Pending' | 'Approved'
}

export type AppData = {
  tutors: Tutor[]
  students: Student[]
  parents: Parent[]
  subjects: Subject[]
  resources: Resource[]
  assignments: Assignment[]
  attendance: AttendanceRecord[]
  feedback: Feedback[]
}
