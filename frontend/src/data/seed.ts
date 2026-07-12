import type { AppData, Subject, User } from '../types'

const cbscSubjectTemplates = [
  ['Mathematics', 'Number Systems', 'Fractions and Decimals', 'Solve grade-level numerical problems accurately'],
  ['Science', 'Living World', 'Plants and Animals', 'Describe structures, functions, and adaptations'],
  ['English', 'Reading and Writing', 'Comprehension and Composition', 'Read, infer, summarize, and write clearly'],
  ['Social Science', 'People and Places', 'History, Geography, and Civics', 'Connect events, places, and civic ideas'],
  ['Hindi', 'Bhasha Adhyayan', 'Pathan aur Lekhan', 'Read, understand, and write grade-level Hindi'],
] as const

const cbscSubjects: Subject[] = Array.from({ length: 6 }, (_, index) => index + 5).flatMap((gradeNumber) =>
  cbscSubjectTemplates.map(([title, unitTitle, topicTitle, outcomeTitle]) => {
    const slug = title.toLowerCase().replace(/\s+/g, '-')
    return {
      id: `cbsc-${gradeNumber}-${slug}`,
      title,
      board: 'CBSC',
      grade: `Grade ${gradeNumber}`,
      sourceUrl: 'https://cbseacademic.nic.in/curriculum.html',
      studentProgress: [
        ...(gradeNumber === 5 ? [{ studentId: 's-1', progress: 0 }] : []),
        ...(gradeNumber === 6 ? [{ studentId: 's-2', progress: 0 }] : []),
      ],
      units: [
        {
          id: `cbsc-${gradeNumber}-${slug}-unit-1`,
          title: `Grade ${gradeNumber} ${unitTitle}`,
          progress: 0,
          topics: [
            {
              id: `cbsc-${gradeNumber}-${slug}-topic-1`,
              title: topicTitle,
              outcomes: [
                { id: `cbsc-${gradeNumber}-${slug}-lo-1`, title: outcomeTitle, complete: false },
                { id: `cbsc-${gradeNumber}-${slug}-lo-2`, title: `Apply ${title.toLowerCase()} concepts in grade ${gradeNumber} practice work`, complete: false },
              ],
            },
          ],
        },
      ],
    }
  }),
)

export const users: User[] = [
  { id: 'u-admin', name: 'Meera Admin', email: 'admin@zenith.test', role: 'Admin', avatar: 'MA' },
  { id: 't-1', name: 'Arjun Rao', email: 'arjun@zenith.test', role: 'Tutor', avatar: 'AR' },
  { id: 's-1', name: 'Anika Shah', email: 'anika@zenith.test', role: 'Student', avatar: 'AS' },
  { id: 'p-1', name: 'Rhea Shah', email: 'rhea@zenith.test', role: 'Parent', avatar: 'RS' },
]

export const seedData: AppData = {
  tutors: [
    { id: 't-1', name: 'Arjun Rao', email: 'arjun@zenith.test', subjects: ['Mathematics', 'Physics'], status: 'Active', students: 16 },
    { id: 't-2', name: 'Leena Mathew', email: 'leena@zenith.test', subjects: ['English', 'Social Science'], status: 'Active', students: 12 },
    { id: 't-3', name: 'Dev Patel', email: 'dev@zenith.test', subjects: ['Chemistry'], status: 'Inactive', students: 7 },
  ],
  students: [
    { id: 's-1', name: 'Anika Shah', email: 'anika@zenith.test', board: 'CBSC', grade: 'Grade 5', tutorId: 't-1', parentIds: ['p-1'], progress: 68, totalFee: 60000, feePaid: 45000, pendingFee: 15000, feeStatus: 'Pending', status: 'Active' },
    { id: 's-2', name: 'Kabir Shah', email: 'kabir@zenith.test', board: 'CBSC', grade: 'Grade 6', tutorId: 't-1', parentIds: ['p-1'], progress: 52, totalFee: 52000, feePaid: 52000, pendingFee: 0, feeStatus: 'Completed', status: 'Active' },
    { id: 's-3', name: 'Ira Menon', email: 'ira@zenith.test', board: 'CBSC', grade: 'Grade 10', tutorId: 't-2', parentIds: ['p-2'], progress: 76, totalFee: 70000, feePaid: 30000, pendingFee: 40000, feeStatus: 'Pending', status: 'Active' },
  ],
  parents: [
    { id: 'p-1', name: 'Rhea Shah', email: 'rhea@zenith.test', phone: '+91 90000 12345', studentIds: ['s-1', 's-2'], status: 'Active' },
    { id: 'p-2', name: 'Nikhil Menon', email: 'nikhil@zenith.test', phone: '+91 90000 67890', studentIds: ['s-3'], status: 'Active' },
  ],
  subjects: [
    ...cbscSubjects,
    {
      id: 'sub-1',
      title: 'Mathematics',
      board: 'CBSC',
      grade: 'Grade 5',
      sourceUrl: 'https://cbseacademic.nic.in/curriculum.html',
      studentProgress: [
        { studentId: 's-1', progress: 68 },
        { studentId: 's-3', progress: 76 },
      ],
      units: [
        {
          id: 'unit-1',
          title: 'Grade 5 Number Systems',
          progress: 72,
          topics: [
            {
              id: 'topic-1',
              title: 'Fractions and Decimals',
              outcomes: [
                { id: 'lo-1', title: 'Solve grade-level numerical problems accurately', complete: true },
                { id: 'lo-2', title: 'Compare fractions and decimals using place value', complete: true },
                { id: 'lo-3', title: 'Apply mathematics concepts in grade 5 practice work', complete: false },
              ],
            },
            {
              id: 'topic-2',
              title: 'Factors and Multiples',
              outcomes: [
                { id: 'lo-4', title: 'Find common factors and multiples', complete: false },
                { id: 'lo-5', title: 'Use factorization in grade-level problem solving', complete: false },
              ],
            },
          ],
        },
        {
          id: 'unit-2',
          title: 'Geometry Basics',
          progress: 44,
          topics: [
            {
              id: 'topic-3',
              title: 'Shapes and Measurement',
              outcomes: [
                { id: 'lo-6', title: 'Identify properties of common shapes', complete: true },
                { id: 'lo-7', title: 'Calculate perimeter and area for simple figures', complete: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'sub-2',
      title: 'Science',
      board: 'CBSC',
      grade: 'Grade 6',
      sourceUrl: 'https://cbseacademic.nic.in/curriculum.html',
      studentProgress: [{ studentId: 's-2', progress: 52 }],
      units: [
        {
          id: 'unit-3',
          title: 'Living World',
          progress: 58,
          topics: [
            {
              id: 'topic-4',
              title: 'Plants and Animals',
              outcomes: [
                { id: 'lo-8', title: 'Describe structures, functions, and adaptations', complete: true },
                { id: 'lo-9', title: 'Classify organisms using observable characteristics', complete: false },
              ],
            },
          ],
        },
      ],
    },
  ],
  resources: [
    { id: 'r-1', title: 'Number systems reference pack', type: 'Reference', subjectId: 'sub-1', url: 'https://example.com/number-systems-pack.pdf' },
    { id: 'r-2', title: 'Fractions and decimals worksheet 01', type: 'Worksheet', subjectId: 'sub-1', url: 'https://example.com/fractions-decimals-worksheet.pdf' },
    { id: 'r-3', title: 'Living world practice worksheet', type: 'Worksheet', subjectId: 'sub-2', url: 'https://example.com/living-world-practice.pdf' },
  ],
  assignments: [
    { id: 'a-1', title: 'Fractions and decimals practice', subjectId: 'sub-1', studentIds: ['s-1'], dueDate: '2026-06-18', status: 'Submitted', maxScore: 20, submissionUrl: 'https://example.com/submission/anika-fractions.pdf' },
    { id: 'a-2', title: 'Geometry exit ticket', subjectId: 'sub-1', studentIds: ['s-1'], dueDate: '2026-06-22', status: 'Pending', maxScore: 10 },
    { id: 'a-3', title: 'Living world worksheet', subjectId: 'sub-2', studentIds: ['s-2'], dueDate: '2026-06-10', status: 'Overdue', maxScore: 15 },
    { id: 'a-4', title: 'Reading comprehension paragraph', subjectId: 'cbsc-10-english', studentIds: ['s-3'], dueDate: '2026-06-12', status: 'Reviewed', maxScore: 10, score: 8, feedback: 'Clear structure. Add more precise evidence in paragraph two.' },
  ],
  attendance: [
    { id: 'att-1', studentId: 's-1', tutorId: 't-1', date: '2026-06-12', status: 'Present', notes: 'Completed worksheet review.' },
    { id: 'att-2', studentId: 's-2', tutorId: 't-1', date: '2026-06-12', status: 'Late', notes: 'Arrived 15 minutes late.' },
    { id: 'att-3', studentId: 's-1', tutorId: 't-1', date: '2026-06-13', status: 'Absent', notes: 'Parent informed.' },
    { id: 'att-4', studentId: 's-3', tutorId: 't-2', date: '2026-06-13', status: 'Present' },
  ],
  feedback: [
    { id: 'f-1', studentId: 's-1', tutorId: 't-1', date: '2026-06-12', message: 'Anika is improving in number operations and should practice fraction word problems this week.', status: 'Approved' },
    { id: 'f-2', studentId: 's-2', tutorId: 't-1', date: '2026-06-11', message: 'Kabir understands force diagrams but needs to submit the pending worksheet.', status: 'Approved' },
  ],
}
