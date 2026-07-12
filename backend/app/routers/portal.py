from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.mappers import student_out
from app.models import AttendanceRecord, AttendanceStatus, Feedback, ParentProfile, StudentProfile, UserAccount, UserRole
from app.schemas import AttendanceOut, AttendanceSummaryOut, FeedbackOut, ParentChildOut, StudentOut

router = APIRouter(prefix="/api/portal", tags=["portal"], dependencies=[Depends(get_current_user)])


@router.get("/student/me", response_model=StudentOut)
def student_me(
    current_user: UserAccount = Depends(require_roles(UserRole.student)),
    db: Session = Depends(get_db),
) -> StudentOut:
    student = (
        db.query(StudentProfile)
        .options(selectinload(StudentProfile.parents))
        .filter(StudentProfile.id == current_user.profile_id)
        .one_or_none()
    )
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found.")
    return student_out(student)


def _attendance_summary(records: list[AttendanceRecord]) -> AttendanceSummaryOut:
    return AttendanceSummaryOut(
        present=sum(1 for record in records if record.status == AttendanceStatus.present),
        absent=sum(1 for record in records if record.status == AttendanceStatus.absent),
        late=sum(1 for record in records if record.status == AttendanceStatus.late),
        excused=sum(1 for record in records if record.status == AttendanceStatus.excused),
    )


@router.get("/parent/children", response_model=list[ParentChildOut])
def parent_children(
    current_user: UserAccount = Depends(require_roles(UserRole.parent)),
    db: Session = Depends(get_db),
) -> list[ParentChildOut]:
    parent = (
        db.query(ParentProfile)
        .options(
            selectinload(ParentProfile.students).selectinload(StudentProfile.parents),
            selectinload(ParentProfile.students).selectinload(StudentProfile.attendance_records),
        )
        .filter(ParentProfile.id == current_user.profile_id)
        .one_or_none()
    )
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent profile not found.")
    children: list[ParentChildOut] = []
    for student in parent.students:
        child = ParentChildOut.model_validate(student_out(student).model_dump() | {"attendance_summary": _attendance_summary(student.attendance_records)})
        children.append(child)
    return children


@router.get("/parent/children/{student_id}/attendance", response_model=list[AttendanceOut])
def parent_child_attendance(
    student_id: str,
    current_user: UserAccount = Depends(require_roles(UserRole.parent)),
    db: Session = Depends(get_db),
) -> list[AttendanceOut]:
    parent = (
        db.query(ParentProfile)
        .options(selectinload(ParentProfile.students))
        .filter(ParentProfile.id == current_user.profile_id)
        .one_or_none()
    )
    if parent is None or all(student.id != student_id for student in parent.students):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found.")
    rows = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id).order_by(AttendanceRecord.date.desc()).all()
    return [AttendanceOut.model_validate(row) for row in rows]


@router.get("/feedback", response_model=list[FeedbackOut])
def feedback(db: Session = Depends(get_db)) -> list[FeedbackOut]:
    rows = db.query(Feedback).order_by(Feedback.date.desc()).all()
    return [FeedbackOut.model_validate(item) for item in rows]
