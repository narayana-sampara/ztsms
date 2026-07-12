from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.curriculum_allocation import allocate_matching_curriculum, normalize_grade
from app.database import get_db
from app.dependencies import require_roles
from app.mappers import parent_out, student_out
from app.models import AttendanceRecord, CurriculumProgress, EntityStatus, Feedback, ParentProfile, StudentProfile, TutorProfile, UserAccount, UserRole
from app.schemas import (
    AttendanceOut,
    CreateFeedbackRequest,
    CreateParentRequest,
    CreateStudentRequest,
    FeedbackOut,
    LinkParentStudentRequest,
    ParentOut,
    StudentOut,
    UpdateParentRequest,
    UpdateProgressRequest,
    UpdateStatusRequest,
    UpdateStudentRequest,
    UpsertAttendanceRequest,
)
from app.security import hash_password

router = APIRouter(prefix="/api/tutor", tags=["tutor"])


def _tutor_id_for(current_user: UserAccount) -> str | None:
    return current_user.profile_id if current_user.role == UserRole.tutor else None


def _get_owned_student(db: Session, current_user: UserAccount, student_id: str) -> StudentProfile:
    query = db.query(StudentProfile).options(selectinload(StudentProfile.parents)).filter(StudentProfile.id == student_id)
    if current_user.role == UserRole.tutor:
        query = query.filter(StudentProfile.tutor_id == current_user.profile_id)
    student = query.one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    return student


def _get_owned_parent(db: Session, current_user: UserAccount, parent_id: str) -> ParentProfile:
    query = db.query(ParentProfile).options(selectinload(ParentProfile.students)).filter(ParentProfile.id == parent_id)
    if current_user.role == UserRole.tutor:
        query = query.filter(ParentProfile.students.any(StudentProfile.tutor_id == current_user.profile_id))
    parent = query.one_or_none()
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found.")
    return parent


@router.get("/students", response_model=list[StudentOut])
def students(
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> list[StudentOut]:
    query = db.query(StudentProfile).options(selectinload(StudentProfile.parents))
    if current_user.role == UserRole.tutor:
        query = query.filter(StudentProfile.tutor_id == current_user.profile_id)
    rows = query.order_by(StudentProfile.name).all()
    return [student_out(student) for student in rows]


@router.post("/students", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    request: CreateStudentRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> StudentOut:
    tutor_id = _tutor_id_for(current_user) or request.tutor_id
    if db.get(TutorProfile, tutor_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tutor does not exist.")
    if db.query(UserAccount).filter(UserAccount.email == request.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use.")

    student = StudentProfile(
        name=request.name,
        email=request.email,
        board=request.board.strip().upper() if request.board.strip().upper() == "CBSC" else request.board.strip(),
        grade=normalize_grade(request.grade) if request.board.strip().upper() == "CBSC" else request.grade.strip(),
        tutor_id=tutor_id,
        progress=0,
        total_fee=request.total_fee,
        fee_paid=request.fee_paid,
        status=EntityStatus.active,
    )
    db.add(student)
    db.flush()
    allocate_matching_curriculum(db, student)
    db.add(
        UserAccount(
            name=request.name,
            email=request.email,
            password_hash=hash_password(request.password),
            role=UserRole.student,
            profile_id=student.id,
        )
    )
    db.commit()
    db.refresh(student)
    return student_out(student)


@router.put("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: str,
    request: UpdateStudentRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> StudentOut:
    student = _get_owned_student(db, current_user, student_id)
    student.name = request.name
    student.email = request.email
    student.board = request.board.strip().upper() if request.board.strip().upper() == "CBSC" else request.board.strip()
    student.grade = normalize_grade(request.grade) if student.board == "CBSC" else request.grade.strip()
    allocate_matching_curriculum(db, student)
    user = db.query(UserAccount).filter(UserAccount.profile_id == student.id, UserAccount.role == UserRole.student).one_or_none()
    if user:
        user.name = request.name
        user.email = request.email
    db.commit()
    db.refresh(student)
    return student_out(student)


@router.patch("/students/{student_id}/status", response_model=StudentOut)
def update_student_status(
    student_id: str,
    request: UpdateStatusRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> StudentOut:
    student = _get_owned_student(db, current_user, student_id)
    student.status = request.status
    user = db.query(UserAccount).filter(UserAccount.profile_id == student.id, UserAccount.role == UserRole.student).one_or_none()
    if user:
        user.status = request.status
    db.commit()
    db.refresh(student)
    return student_out(student)


@router.delete("/students/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: str,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> None:
    student = _get_owned_student(db, current_user, student_id)
    student.parents.clear()
    student.assignments.clear()
    db.query(CurriculumProgress).filter(CurriculumProgress.student_id == student.id).delete(synchronize_session=False)
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).delete(synchronize_session=False)
    db.query(Feedback).filter(Feedback.student_id == student.id).delete(synchronize_session=False)
    db.query(UserAccount).filter(UserAccount.profile_id == student.id, UserAccount.role == UserRole.student).delete(synchronize_session=False)
    db.delete(student)
    db.commit()


@router.patch("/students/{student_id}/progress", response_model=StudentOut)
def update_progress(
    student_id: str,
    request: UpdateProgressRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> StudentOut:
    student = _get_owned_student(db, current_user, student_id)
    student.progress = request.progress
    if request.feedback:
        db.add(Feedback(student_id=student.id, tutor_id=student.tutor_id, date=date.today(), message=request.feedback))
    db.commit()
    db.refresh(student)
    return student_out(student)


@router.get("/attendance", response_model=list[AttendanceOut])
def attendance(
    student_id: str | None = None,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor)),
    db: Session = Depends(get_db),
) -> list[AttendanceOut]:
    query = db.query(AttendanceRecord).join(StudentProfile).filter(StudentProfile.tutor_id == current_user.profile_id)
    if student_id:
        query = query.filter(AttendanceRecord.student_id == student_id)
    rows = query.order_by(AttendanceRecord.date.desc(), StudentProfile.name).all()
    return [AttendanceOut.model_validate(row) for row in rows]


@router.post("/attendance", response_model=AttendanceOut)
def upsert_attendance(
    request: UpsertAttendanceRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor)),
    db: Session = Depends(get_db),
) -> AttendanceOut:
    student = _get_owned_student(db, current_user, request.student_id)
    record = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.student_id == student.id, AttendanceRecord.date == request.date)
        .one_or_none()
    )
    if record is None:
        record = AttendanceRecord(student_id=student.id, tutor_id=student.tutor_id, date=request.date, status=request.status, notes=request.notes)
        db.add(record)
    else:
        record.tutor_id = student.tutor_id
        record.status = request.status
        record.notes = request.notes
    db.commit()
    db.refresh(record)
    return AttendanceOut.model_validate(record)


@router.get("/parents", response_model=list[ParentOut])
def parents(
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> list[ParentOut]:
    query = db.query(ParentProfile).options(selectinload(ParentProfile.students))
    if current_user.role == UserRole.tutor:
        query = query.filter(ParentProfile.students.any(StudentProfile.tutor_id == current_user.profile_id))
    rows = query.order_by(ParentProfile.name).all()
    return [parent_out(parent) for parent in rows]


@router.post("/parents", response_model=ParentOut, status_code=status.HTTP_201_CREATED)
def create_parent(
    request: CreateParentRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> ParentOut:
    if db.query(UserAccount).filter(UserAccount.email == request.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use.")

    linked_students = db.query(StudentProfile).filter(StudentProfile.id.in_(request.student_ids)).all() if request.student_ids else []
    if current_user.role == UserRole.tutor and not linked_students:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link the parent to at least one of your students.")
    if current_user.role == UserRole.tutor and any(student.tutor_id != current_user.profile_id for student in linked_students):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot link parent to another tutor's student.")
    parent = ParentProfile(name=request.name, email=request.email, phone=request.phone, status=EntityStatus.active, students=linked_students)
    db.add(parent)
    db.flush()
    db.add(
        UserAccount(
            name=request.name,
            email=request.email,
            password_hash=hash_password(request.password),
            role=UserRole.parent,
            profile_id=parent.id,
        )
    )
    db.commit()
    db.refresh(parent)
    return parent_out(parent)


@router.put("/parents/{parent_id}", response_model=ParentOut)
def update_parent(
    parent_id: str,
    request: UpdateParentRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> ParentOut:
    parent = _get_owned_parent(db, current_user, parent_id)
    parent.name = request.name
    parent.email = request.email
    parent.phone = request.phone
    user = db.query(UserAccount).filter(UserAccount.profile_id == parent.id, UserAccount.role == UserRole.parent).one_or_none()
    if user:
        user.name = request.name
        user.email = request.email
    db.commit()
    db.refresh(parent)
    return parent_out(parent)


@router.patch("/parents/{parent_id}/status", response_model=ParentOut)
def update_parent_status(
    parent_id: str,
    request: UpdateStatusRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> ParentOut:
    parent = _get_owned_parent(db, current_user, parent_id)
    parent.status = request.status
    user = db.query(UserAccount).filter(UserAccount.profile_id == parent.id, UserAccount.role == UserRole.parent).one_or_none()
    if user:
        user.status = request.status
    db.commit()
    db.refresh(parent)
    return parent_out(parent)


@router.delete("/parents/{parent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_parent(
    parent_id: str,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> None:
    parent = _get_owned_parent(db, current_user, parent_id)
    parent.students.clear()
    db.query(UserAccount).filter(UserAccount.profile_id == parent.id, UserAccount.role == UserRole.parent).delete(synchronize_session=False)
    db.delete(parent)
    db.commit()


@router.post("/parent-student-links", status_code=status.HTTP_204_NO_CONTENT)
def link_parent_student(
    request: LinkParentStudentRequest,
    current_user: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
    db: Session = Depends(get_db),
) -> None:
    parent = _get_owned_parent(db, current_user, request.parent_id)
    student = _get_owned_student(db, current_user, request.student_id)
    if student not in parent.students:
        parent.students.append(student)
        db.commit()


@router.post("/feedback", response_model=FeedbackOut)
def add_feedback(request: CreateFeedbackRequest, db: Session = Depends(get_db)) -> FeedbackOut:
    if db.get(StudentProfile, request.student_id) is None or db.get(TutorProfile, request.tutor_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student or tutor not found.")

    feedback = Feedback(student_id=request.student_id, tutor_id=request.tutor_id, date=date.today(), message=request.message)
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return FeedbackOut.model_validate(feedback)
