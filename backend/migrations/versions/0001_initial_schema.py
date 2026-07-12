"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "tutors",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("subjects_csv", sa.String(500), nullable=False, server_default=""),
        sa.Column(
            "status",
            sa.Enum("Active", "Inactive", name="entitystatus"),
            nullable=False,
            server_default="Active",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_tutors_email", "tutors", ["email"])

    op.create_table(
        "students",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("board", sa.String(80), nullable=False),
        sa.Column("grade", sa.String(80), nullable=False),
        sa.Column("tutor_id", sa.String(), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_fee", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fee_paid", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "status",
            sa.Enum("Active", "Inactive", name="entitystatus"),
            nullable=False,
            server_default="Active",
        ),
        sa.ForeignKeyConstraint(["tutor_id"], ["tutors.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_students_email", "students", ["email"])

    op.create_table(
        "parents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(40), nullable=False),
        sa.Column(
            "status",
            sa.Enum("Active", "Inactive", name="entitystatus"),
            nullable=False,
            server_default="Active",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_parents_email", "parents", ["email"])

    op.create_table(
        "users",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("Admin", "Tutor", "Student", "Parent", name="userrole"),
            nullable=False,
        ),
        sa.Column("profile_id", sa.String(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("Active", "Inactive", name="entitystatus"),
            nullable=False,
            server_default="Active",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "subjects",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("board", sa.String(80), nullable=False),
        sa.Column("grade", sa.String(80), nullable=False),
        sa.Column("source_url", sa.String(600), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "student_parents",
        sa.Column("student_id", sa.String(), nullable=False),
        sa.Column("parent_id", sa.String(), nullable=False),
        sa.Column("relationship", sa.String(80), nullable=False, server_default="Guardian"),
        sa.ForeignKeyConstraint(["parent_id"], ["parents.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("student_id", "parent_id"),
    )

    op.create_table(
        "assignments",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("subject_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("Pending", "Submitted", "Reviewed", "Overdue", name="assignmentstatus"),
            nullable=False,
            server_default="Pending",
        ),
        sa.Column("max_score", sa.Integer(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("submission_url", sa.String(600), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "assignment_students",
        sa.Column("assignment_id", sa.String(), nullable=False),
        sa.Column("student_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("assignment_id", "student_id"),
    )

    op.create_table(
        "curriculum_units",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("subject_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "topics",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("unit_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["curriculum_units.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "learning_outcomes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("topic_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("complete", sa.Boolean(), nullable=False, server_default="false"),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "resources",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("subject_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(180), nullable=False),
        sa.Column(
            "type",
            sa.Enum("Reference", "Worksheet", "Video", "Document", name="resourcetype"),
            nullable=False,
        ),
        sa.Column("url", sa.String(600), nullable=False),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "curriculum_progress",
        sa.Column("subject_id", sa.String(), nullable=False),
        sa.Column("student_id", sa.String(), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("subject_id", "student_id"),
    )

    op.create_table(
        "attendance_records",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("student_id", sa.String(), nullable=False),
        sa.Column("tutor_id", sa.String(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("Present", "Absent", "Late", "Excused", name="attendancestatus"),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tutor_id"], ["tutors.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("student_id", "date", name="uq_attendance_student_date"),
    )
    op.create_index("ix_attendance_records_student_id", "attendance_records", ["student_id"])
    op.create_index("ix_attendance_records_tutor_id", "attendance_records", ["tutor_id"])
    op.create_index("ix_attendance_records_date", "attendance_records", ["date"])

    op.create_table(
        "feedback",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("student_id", sa.String(), nullable=False),
        sa.Column("tutor_id", sa.String(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["tutor_id"], ["tutors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("feedback")
    op.drop_index("ix_attendance_records_date", "attendance_records")
    op.drop_index("ix_attendance_records_tutor_id", "attendance_records")
    op.drop_index("ix_attendance_records_student_id", "attendance_records")
    op.drop_table("attendance_records")
    op.drop_table("curriculum_progress")
    op.drop_table("resources")
    op.drop_table("learning_outcomes")
    op.drop_table("topics")
    op.drop_table("curriculum_units")
    op.drop_table("assignment_students")
    op.drop_table("assignments")
    op.drop_table("student_parents")
    op.drop_table("subjects")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
    op.drop_index("ix_parents_email", "parents")
    op.drop_table("parents")
    op.drop_index("ix_students_email", "students")
    op.drop_table("students")
    op.drop_index("ix_tutors_email", "tutors")
    op.drop_table("tutors")

    op.execute("DROP TYPE IF EXISTS entitystatus")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS assignmentstatus")
    op.execute("DROP TYPE IF EXISTS attendancestatus")
    op.execute("DROP TYPE IF EXISTS resourcetype")
