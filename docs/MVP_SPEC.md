# Student LMS MVP Specification

## Product Requirement Document

Build a modern EdTech SaaS-style web application for one tutoring center that supports Admin, Tutor, Student, and Parent roles. The MVP must manage tutors, students, parents, curriculum, resources, worksheets, assignments, submissions, progress, and parent-visible feedback.

The initial product is single-center, but the architecture should later support multiple centers.

## MVP Feature List

- Role-based login and navigation.
- Admin dashboard with high-level activity.
- Tutor creation, edit, activation, and deactivation.
- Student and parent profile creation.
- Many-to-many parent-student linking.
- Curriculum master data: board, grade/level, subject, unit, topic, learning outcome.
- Curriculum source URL storage for recognized board references.
- Resource and worksheet URL management.
- Assignment creation, assignment-to-student mapping, submission, review, score, and feedback.
- Student progress tracking.
- Parent dashboard for linked children, progress, pending/overdue/completed assignments, and feedback.

## Phase-Wise Delivery Plan

Phase 1: Authentication, roles, seed data, admin/tutor/student/parent shells.

Phase 2: Student and parent profile workflows with parent-student mapping.

Phase 3: Curriculum builder, resource cards, worksheet management.

Phase 4: Assignment lifecycle, student submissions, tutor review.

Phase 5: Progress analytics, parent dashboard, deployment hardening.

## User Roles And Permissions

- Admin: manage tutors, view global activity, activate/deactivate tutor access.
- Tutor: manage only self-created students and linked parents, including create, edit, deactivate, delete, parent-student mapping, curriculum CRUD, per-student curriculum completion, resources, assignments, reviews, progress, feedback.
- Student: view assigned/read-only curriculum, resources, assignments, submit assignments, view profile and progress.
- Parent: view linked children, assignment status, progress, tutor feedback.

## User Journeys

Admin logs in, reviews dashboard activity, creates a tutor, edits tutor details, and deactivates access when needed.

Tutor logs in, creates student profiles, creates parent profiles, links parents to their own students, creates curriculum, uploads or links resources, assigns work, reviews submissions, updates progress, and adds feedback.

Student logs in, views curriculum tree, downloads resources or worksheets, submits assignments, and tracks progress.

Parent logs in, selects a linked child, reviews progress, assignment status, overdue work, completed work, and tutor feedback.

## Wireframe Descriptions

- Login: role selector, demo account preview, primary sign-in action.
- Dashboard: KPI cards, progress chart, recent feedback.
- Tutor Directory: create form on left, table with status actions on right.
- Student Profiles: creation form and responsive student cards with progress bars.
- Parent Mapping: parent form, mapping list, add-child selector.
- Curriculum Builder: source URL and hierarchy form, tree display for subject > unit > topic > outcome.
- Resources: resource cards with type badge and download link.
- Assignments: create form, assignment cards, submit/review actions.
- Parent Dashboard: child cards, progress analytics, assignment status, feedback cards.

## UI Design System

- Layout: desktop sidebar, mobile drawer, sticky top bar.
- Colors: slate base, teal primary, amber accents, rose warnings.
- Components: cards, icon buttons, badges, progress bars, tables, forms, charts.
- Corners: 6-8px radius for cards and controls.
- Typography: system sans serif, compact dashboard hierarchy.
- States: active navigation, status badges, empty-friendly cards, responsive grids.

## Frontend Folder Structure

```text
frontend/src
  components/
    Layout.tsx
    ui.tsx
  data/
    seed.ts
  lib/
    utils.ts
  types/
    index.ts
  App.tsx
  index.css
  main.tsx
```

## Backend Architecture

FastAPI exposes role-protected REST endpoints. SQLAlchemy models represent users, tutor/student/parent profiles, curriculum hierarchy, resources, assignments, join tables, and feedback. JWT claims include role and profile ID.

The API uses SQLite for local development when no PostgreSQL connection string is configured. PostgreSQL is enabled through the `postgresql+psycopg://...` SQLAlchemy database URL.

## Database Schema

- `UserAccount`: login identity, role, status, profile ID.
- `TutorProfile`: tutor details, subjects, status.
- `StudentProfile`: board, grade, tutor, progress, status.
- `ParentProfile`: parent contact details.
- `StudentParent`: many-to-many parent-student links.
- `Subject`: board/grade subject with source URL.
- `CurriculumUnit`: subject unit with progress.
- `Topic`: unit topic.
- `LearningOutcome`: topic outcome completion state.
- `Resource`: references, worksheets, videos, documents.
- `Assignment`: due date, status, score, submission URL, feedback.
- `AssignmentStudent`: many-to-many assignment-student links.
- `Feedback`: tutor comments visible to parents/students.

## API Endpoint Design

- `POST /api/auth/login`
- `GET /api/admin/dashboard`
- `GET /api/admin/tutors`
- `POST /api/admin/tutors`
- `PUT /api/admin/tutors/{id}`
- `PATCH /api/admin/tutors/{id}/status`
- `DELETE /api/admin/tutors/{id}`
- `GET /api/tutor/students`
- `POST /api/tutor/students`
- `PATCH /api/tutor/students/{id}/progress`
- `GET /api/tutor/parents`
- `POST /api/tutor/parents`
- `POST /api/tutor/parent-student-links`
- `POST /api/tutor/feedback`
- `GET /api/curriculum/subjects`
- `POST /api/curriculum/subjects`
- `POST /api/curriculum/subjects/import/csv`
- `POST /api/curriculum/subjects/extract/pdf`
- `PUT /api/curriculum/subjects/{id}`
- `DELETE /api/curriculum/subjects/{id}`
- `PATCH /api/curriculum/subjects/{id}/progress`
- `GET /api/curriculum/resources`
- `POST /api/curriculum/resources`
- `GET /api/assignments`
- `POST /api/assignments`
- `POST /api/assignments/{id}/submit`
- `POST /api/assignments/{id}/review`
- `GET /api/portal/student/me`
- `GET /api/portal/parent/children`
- `GET /api/portal/feedback`

## Sample Seed Data

Seeded users:

- Admin: Meera Admin
- Tutor: Arjun Rao
- Tutor: Leena Mathew
- Student: Anika Shah
- Student: Kabir Shah
- Parent: Rhea Shah

Seeded curriculum includes CBSC Mathematics, Number Systems, Fractions and Decimals, and learning outcomes.

## Workflows

Tutor student creation: Tutor creates a student profile with board, grade, email, and password. The API creates a `StudentProfile` and matching `UserAccount`.

Tutor parent creation: Tutor creates parent contact details and optionally links one or more students. The API creates a `ParentProfile`, `UserAccount`, and `StudentParent` links.

Parent-student tagging: Tutor selects an existing parent and student. The API inserts a `StudentParent` record if the link does not already exist.

Assignment workflow: Tutor creates an assignment and maps it to students. Student submits a URL. Tutor reviews, scores, and adds feedback.

Curriculum builder workflow: Tutor creates subject metadata with board source URL and first unit/topic/outcome. Later phases can add granular edit/reorder screens.

Student progress workflow: Tutor updates progress percentage and can add feedback in the same action.

Parent dashboard workflow: Parent loads linked children, progress, assignments, overdue status, and tutor feedback.

## Testing Checklist

- Login succeeds for each seeded role and rejects bad credentials.
- Admin can create, edit, activate, and deactivate tutors.
- Tutor can create student and parent profiles.
- Parent-student mapping supports one parent to multiple students.
- Curriculum tree renders subject, unit, topic, and outcome.
- Resource cards show type and URL.
- Assignment can be created, submitted, reviewed, scored, and marked complete.
- Student only sees assigned work in frontend flow.
- Parent only sees linked children in parent portal endpoint.
- Mobile drawer navigation works.
- Frontend production build completes.
- API authorization blocks unauthorized role access.

## Deployment Plan

- Frontend: build with `npm run build`, deploy static assets to S3 + CloudFront, Azure Static Web Apps, Netlify, or Vercel.
- API: deploy the FastAPI container to AWS ECS, Azure App Service, Render, Fly.io, or similar.
- Database: managed PostgreSQL with migrations.
- Storage: AWS S3 private bucket with signed upload/download URLs.
- Secrets: store JWT key, database credentials, and S3 credentials in managed secret storage.
- Observability: structured logs, request tracing, API health check, database backups.

## Future Enhancement Roadmap

- Multi-center tenancy and center-level admin.
- Fine-grained tutor permissions.
- Calendar scheduling and attendance.
- File upload pipeline with virus scanning.
- Rubrics and rubric-based grading.
- Parent notifications through email/WhatsApp.
- Student goal plans and mastery heatmaps.
- Billing and package management.
- Board-specific curriculum importers.
- AI-assisted worksheet generation and feedback drafts.
