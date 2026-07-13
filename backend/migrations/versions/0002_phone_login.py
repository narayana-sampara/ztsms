"""add phone numbers for login

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(10), nullable=True))
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    op.add_column("tutors", sa.Column("phone", sa.String(10), nullable=True))
    op.create_index("ix_tutors_phone", "tutors", ["phone"], unique=True)

    op.add_column("students", sa.Column("phone", sa.String(10), nullable=True))
    op.create_index("ix_students_phone", "students", ["phone"], unique=True)

    op.execute("UPDATE parents SET phone = right(regexp_replace(phone, '[^0-9]', '', 'g'), 10)")
    op.alter_column("parents", "phone", existing_type=sa.String(40), type_=sa.String(10))


def downgrade() -> None:
    op.alter_column("parents", "phone", existing_type=sa.String(10), type_=sa.String(40))

    op.drop_index("ix_students_phone", table_name="students")
    op.drop_column("students", "phone")

    op.drop_index("ix_tutors_phone", table_name="tutors")
    op.drop_column("tutors", "phone")

    op.drop_index("ix_users_phone", table_name="users")
    op.drop_column("users", "phone")
