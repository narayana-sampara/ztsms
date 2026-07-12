from datetime import date
from enum import StrEnum
from uuid import uuid4

from sqlalchemy import Boolean, Column, Date, Enum, ForeignKey, Integer, String, Table, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def new_id() -> str:
    return str(uuid4())


def _enum_values(enum_class):
    return [e.value for e in enum_class]


class UserRole(StrEnum):
    admin = "Admin"
    tutor = "Tutor"
    student = "Student"
    parent = "Parent"


class EntityStatus(StrEnum):
    active = "Active"
    inactive = "Inactive"


class AssignmentStatus(StrEnum):
    pending = "Pending"
    submitted = "Submitted"
    reviewed = "Reviewed"
    overdue = "Overdue"


class FeeStatus(StrEnum):
    pending = "Pending"
    completed = "Completed"


class AttendanceStatus(StrEnum):
    present = "Present"
    absent = "Absent"
    late = "Late"
    excused = "Excused"


class ResourceType(StrEnum):
    reference = "Reference"
    worksheet = "Worksheet"
    video = "Video"
    document = "Document"


student_parent_table = Table(
    "student_parents",
    Base.metadata,
    Column("student_id", String, ForeignKey("students.id"), primary_key=True),
    Column("parent_id", String, ForeignKey("parents.id"), primary_key=True),
    Column("relationship", String(80), default="Guardian", nullable=False),
)

assignment_student_table = Table(
    "assignment_students",
    Base.metadata,
    Column("assignment_id", String, ForeignKey("assignments.id"), primary_key=True),
    Column("student_id", String, ForeignKey("students.id"), primary_key=True),
)


class UserAccount(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, values_callable=_enum_values), nullable=False)
    profile_id: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[EntityStatus] = mapped_column(Enum(EntityStatus, values_callable=_enum_values), default=EntityStatus.active, nullable=False)


class TutorProfile(Base):
    __tablename__ = "tutors"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    subjects_csv: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    status: Mapped[EntityStatus] = mapped_column(Enum(EntityStatus, values_callable=_enum_values), default=EntityStatus.active, nullable=False)

    students: Mapped[list["StudentProfile"]] = relationship(back_populates="tutor")
    feedback: Mapped[list["Feedback"]] = relationship(back_populates="tutor")


class StudentProfile(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    board: Mapped[str] = mapped_column(String(80), nullable=False)
    grade: Mapped[str] = mapped_column(String(80), nullable=False)
    tutor_id: Mapped[str] = mapped_column(String, ForeignKey("tutors.id"), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_fee: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fee_paid: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[EntityStatus] = mapped_column(Enum(EntityStatus, values_callable=_enum_values), default=EntityStatus.active, nullable=False)

    tutor: Mapped[TutorProfile] = relationship(back_populates="students")
    parents: Mapped[list["ParentProfile"]] = relationship(secondary=student_parent_table, back_populates="students")
    assignments: Mapped[list["Assignment"]] = relationship(secondary=assignment_student_table, back_populates="students")
    feedback: Mapped[list["Feedback"]] = relationship(back_populates="student")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship(back_populates="student", cascade="all, delete-orphan")


class ParentProfile(Base):
    __tablename__ = "parents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[EntityStatus] = mapped_column(Enum(EntityStatus, values_callable=_enum_values), default=EntityStatus.active, nullable=False)

    students: Mapped[list[StudentProfile]] = relationship(secondary=student_parent_table, back_populates="parents")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    board: Mapped[str] = mapped_column(String(80), nullable=False)
    grade: Mapped[str] = mapped_column(String(80), nullable=False)
    source_url: Mapped[str] = mapped_column(String(600), nullable=False)

    units: Mapped[list["CurriculumUnit"]] = relationship(back_populates="subject", cascade="all, delete-orphan")
    resources: Mapped[list["Resource"]] = relationship(back_populates="subject", cascade="all, delete-orphan")
    progress_records: Mapped[list["CurriculumProgress"]] = relationship(back_populates="subject", cascade="all, delete-orphan")


class CurriculumProgress(Base):
    __tablename__ = "curriculum_progress"

    subject_id: Mapped[str] = mapped_column(String, ForeignKey("subjects.id"), primary_key=True)
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id"), primary_key=True)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    subject: Mapped[Subject] = relationship(back_populates="progress_records")
    student: Mapped[StudentProfile] = relationship()


class CurriculumUnit(Base):
    __tablename__ = "curriculum_units"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    subject_id: Mapped[str] = mapped_column(String, ForeignKey("subjects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    subject: Mapped[Subject] = relationship(back_populates="units")
    topics: Mapped[list["Topic"]] = relationship(back_populates="unit", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    unit_id: Mapped[str] = mapped_column(String, ForeignKey("curriculum_units.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)

    unit: Mapped[CurriculumUnit] = relationship(back_populates="topics")
    outcomes: Mapped[list["LearningOutcome"]] = relationship(back_populates="topic", cascade="all, delete-orphan")


class LearningOutcome(Base):
    __tablename__ = "learning_outcomes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    topic_id: Mapped[str] = mapped_column(String, ForeignKey("topics.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    topic: Mapped[Topic] = relationship(back_populates="outcomes")


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    subject_id: Mapped[str] = mapped_column(String, ForeignKey("subjects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    type: Mapped[ResourceType] = mapped_column(Enum(ResourceType, values_callable=_enum_values), nullable=False)
    url: Mapped[str] = mapped_column(String(600), nullable=False)

    subject: Mapped[Subject] = relationship(back_populates="resources")


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    subject_id: Mapped[str] = mapped_column(String, ForeignKey("subjects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[AssignmentStatus] = mapped_column(Enum(AssignmentStatus, values_callable=_enum_values), default=AssignmentStatus.pending, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    submission_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)

    students: Mapped[list[StudentProfile]] = relationship(secondary=assignment_student_table, back_populates="assignments")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id"), nullable=False, index=True)
    tutor_id: Mapped[str] = mapped_column(String, ForeignKey("tutors.id"), nullable=False, index=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus, values_callable=_enum_values), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    student: Mapped[StudentProfile] = relationship(back_populates="attendance_records")
    tutor: Mapped[TutorProfile] = relationship()


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id"), nullable=False)
    tutor_id: Mapped[str] = mapped_column(String, ForeignKey("tutors.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    student: Mapped[StudentProfile] = relationship(back_populates="feedback")
    tutor: Mapped[TutorProfile] = relationship(back_populates="feedback")
