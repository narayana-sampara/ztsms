from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models import AssignmentStatus, AttendanceStatus, EntityStatus, FeeStatus, ResourceType, UserRole


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    profile_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AuthRequest(BaseModel):
    identifier: str = Field(min_length=3, description="Email address or 10-digit phone number.")
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserOut


class TutorOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None = None
    subjects: list[str]
    status: EntityStatus
    students: int
    temporary_password: str | None = None


class CreateTutorRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    phone: str = Field(min_length=10, max_length=10, pattern=r"^\d{10}$")
    subjects: list[str] = []


class UpdateTutorRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    phone: str = Field(min_length=10, max_length=10, pattern=r"^\d{10}$")
    subjects: list[str] = []


class UpdateStatusRequest(BaseModel):
    status: EntityStatus


class StudentOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str | None = None
    board: str
    grade: str
    tutor_id: str
    parent_ids: list[str]
    progress: int
    total_fee: int
    fee_paid: int
    pending_fee: int
    fee_status: FeeStatus
    status: EntityStatus
    temporary_password: str | None = None


class CreateStudentRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    phone: str = Field(min_length=10, max_length=10, pattern=r"^\d{10}$")
    board: str
    grade: str
    tutor_id: str
    total_fee: int = Field(default=0, ge=0)
    fee_paid: int = Field(default=0, ge=0)


class UpdateStudentRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    phone: str = Field(min_length=10, max_length=10, pattern=r"^\d{10}$")
    board: str
    grade: str
    tutor_id: str | None = None


class UpdateStudentFeeRequest(BaseModel):
    total_fee: int = Field(ge=0)
    fee_paid: int = Field(ge=0)


class UpdateProgressRequest(BaseModel):
    progress: int = Field(ge=0, le=100)
    feedback: str | None = None


class ParentOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    student_ids: list[str]
    status: EntityStatus
    temporary_password: str | None = None


class CreateParentRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    phone: str = Field(min_length=10, max_length=10, pattern=r"^\d{10}$")
    student_ids: list[str] = []


class UpdateParentRequest(BaseModel):
    name: str = Field(min_length=2)
    email: str
    phone: str = Field(min_length=10, max_length=10, pattern=r"^\d{10}$")


class LinkParentStudentRequest(BaseModel):
    parent_id: str
    student_id: str
    relationship: str = "Guardian"


class LearningOutcomeOut(BaseModel):
    id: str
    title: str
    complete: bool

    model_config = ConfigDict(from_attributes=True)


class TopicOut(BaseModel):
    id: str
    title: str
    outcomes: list[LearningOutcomeOut]

    model_config = ConfigDict(from_attributes=True)


class UnitOut(BaseModel):
    id: str
    title: str
    progress: int
    topics: list[TopicOut]

    model_config = ConfigDict(from_attributes=True)


class CurriculumProgressOut(BaseModel):
    subject_id: str
    student_id: str
    progress: int

    model_config = ConfigDict(from_attributes=True)


class SubjectOut(BaseModel):
    id: str
    title: str
    board: str
    grade: str
    source_url: str
    units: list[UnitOut]
    progress_records: list[CurriculumProgressOut] = []

    model_config = ConfigDict(from_attributes=True)


class CreateSubjectRequest(BaseModel):
    title: str = Field(min_length=2)
    board: str
    grade: str
    source_url: str = Field(min_length=2)
    unit_title: str = Field(min_length=2)
    topic_title: str = Field(min_length=2)
    outcome_title: str = Field(min_length=3)
    student_ids: list[str] = []


class UpdateSubjectRequest(BaseModel):
    title: str = Field(min_length=2)
    board: str
    grade: str
    source_url: str = Field(min_length=2)
    unit_title: str | None = Field(default=None, min_length=2)
    topic_title: str | None = Field(default=None, min_length=2)
    outcome_title: str | None = Field(default=None, min_length=3)
    student_ids: list[str] | None = None


class UpdateCurriculumProgressRequest(BaseModel):
    student_id: str
    progress: int = Field(ge=0, le=100)


class ResourceOut(BaseModel):
    id: str
    subject_id: str
    title: str
    type: ResourceType
    url: str

    model_config = ConfigDict(from_attributes=True)


class CreateResourceRequest(BaseModel):
    subject_id: str
    title: str = Field(min_length=2)
    type: ResourceType
    url: HttpUrl


class AssignmentOut(BaseModel):
    id: str
    subject_id: str
    title: str
    student_ids: list[str]
    due_date: date
    status: AssignmentStatus
    max_score: int
    score: int | None = None
    submission_url: str | None = None
    feedback: str | None = None


class CreateAssignmentRequest(BaseModel):
    title: str = Field(min_length=3)
    subject_id: str
    student_ids: list[str] = Field(min_length=1)
    due_date: date
    max_score: int = Field(gt=0, le=100)


class SubmitAssignmentRequest(BaseModel):
    submission_url: HttpUrl


class ReviewAssignmentRequest(BaseModel):
    score: int = Field(ge=0)
    feedback: str = Field(min_length=2)


class AttendanceOut(BaseModel):
    id: str
    student_id: str
    tutor_id: str
    date: date
    status: AttendanceStatus
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UpsertAttendanceRequest(BaseModel):
    student_id: str
    date: date
    status: AttendanceStatus
    notes: str | None = None


class AttendanceSummaryOut(BaseModel):
    present: int = 0
    absent: int = 0
    late: int = 0
    excused: int = 0


class ParentChildOut(StudentOut):
    attendance_summary: AttendanceSummaryOut


class FeedbackOut(BaseModel):
    id: str
    student_id: str
    tutor_id: str
    date: date
    message: str

    model_config = ConfigDict(from_attributes=True)


class CreateFeedbackRequest(BaseModel):
    student_id: str
    tutor_id: str
    message: str = Field(min_length=2)


class DashboardOut(BaseModel):
    active_students: int
    tutors: int
    parents: int
    pending_assignments: int
    overdue_assignments: int
    curriculum_subjects: int
