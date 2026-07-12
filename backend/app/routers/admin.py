from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.curriculum_allocation import allocate_matching_curriculum, normalize_grade
from app.database import get_db
from app.dependencies import require_roles
from app.mappers import parent_out, student_out, tutor_out
from app.models import (
    Assignment,
    AssignmentStatus,
    AttendanceRecord,
    CurriculumProgress,
    EntityStatus,
    Feedback,
    ParentProfile,
    StudentProfile,
    Subject,
    TutorProfile,
    UserAccount,
    UserRole,
)
from app.schemas import (
    CreateParentRequest,
    CreateStudentRequest,
    CreateTutorRequest,
    DashboardOut,
    LinkParentStudentRequest,
    ParentOut,
    StudentOut,
    TutorOut,
    UpdateParentRequest,
    UpdateStatusRequest,
    UpdateStudentFeeRequest,
    UpdateStudentRequest,
    UpdateTutorRequest,
)
from app.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(_: UserAccount = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)) -> DashboardOut:
    return DashboardOut(
        active_students=db.query(StudentProfile).filter(StudentProfile.status == EntityStatus.active).count(),
        tutors=db.query(TutorProfile).count(),
        parents=db.query(UserAccount).filter(UserAccount.role == UserRole.parent).count(),
        pending_assignments=db.query(Assignment).filter(Assignment.status == AssignmentStatus.pending).count(),
        overdue_assignments=db.query(Assignment).filter(Assignment.status == AssignmentStatus.overdue).count(),
        curriculum_subjects=db.query(Subject).count(),
    )


@router.get("/tutors", response_model=list[TutorOut])
def tutors(_: UserAccount = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)) -> list[TutorOut]:
    rows = db.query(TutorProfile).options(selectinload(TutorProfile.students)).order_by(TutorProfile.name).all()
    return [tutor_out(tutor) for tutor in rows]


@router.get("/students", response_model=list[StudentOut])
def students(_: UserAccount = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)) -> list[StudentOut]:
    rows = db.query(StudentProfile).options(selectinload(StudentProfile.parents)).order_by(StudentProfile.name).all()
    return [student_out(student) for student in rows]


@router.post("/students", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    request: CreateStudentRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> StudentOut:
    if db.get(TutorProfile, request.tutor_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tutor does not exist.")
    if db.query(UserAccount).filter(UserAccount.email == request.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use.")

    student = StudentProfile(
        name=request.name,
        email=request.email,
        board=request.board.strip().upper() if request.board.strip().upper() == "CBSC" else request.board.strip(),
        grade=normalize_grade(request.grade) if request.board.strip().upper() == "CBSC" else request.grade.strip(),
        tutor_id=request.tutor_id,
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
    student = db.query(StudentProfile).options(selectinload(StudentProfile.parents)).filter(StudentProfile.id == student.id).one()
    return student_out(student)


@router.put("/students/{student_id}", response_model=StudentOut)
def update_student(
    student_id: str,
    request: UpdateStudentRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> StudentOut:
    student = db.query(StudentProfile).options(selectinload(StudentProfile.parents)).filter(StudentProfile.id == student_id).one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    if request.tutor_id and db.get(TutorProfile, request.tutor_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tutor does not exist.")

    student.name = request.name
    student.email = request.email
    student.board = request.board.strip().upper() if request.board.strip().upper() == "CBSC" else request.board.strip()
    student.grade = normalize_grade(request.grade) if student.board == "CBSC" else request.grade.strip()
    if request.tutor_id:
        student.tutor_id = request.tutor_id
    allocate_matching_curriculum(db, student)
    user = db.query(UserAccount).filter(UserAccount.profile_id == student.id, UserAccount.role == UserRole.student).one_or_none()
    if user:
        user.name = request.name
        user.email = request.email
    db.commit()
    db.refresh(student)
    return student_out(student)


@router.patch("/students/{student_id}/fee", response_model=StudentOut)
def update_student_fee(
    student_id: str,
    request: UpdateStudentFeeRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> StudentOut:
    student = db.query(StudentProfile).options(selectinload(StudentProfile.parents)).filter(StudentProfile.id == student_id).one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    student.total_fee = request.total_fee
    student.fee_paid = request.fee_paid
    db.commit()
    db.refresh(student)
    return student_out(student)


@router.patch("/students/{student_id}/status", response_model=StudentOut)
def update_student_status(
    student_id: str,
    request: UpdateStatusRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> StudentOut:
    student = db.query(StudentProfile).options(selectinload(StudentProfile.parents)).filter(StudentProfile.id == student_id).one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
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
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> None:
    student = db.query(StudentProfile).options(selectinload(StudentProfile.parents), selectinload(StudentProfile.assignments)).filter(StudentProfile.id == student_id).one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    student.parents.clear()
    student.assignments.clear()
    db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student.id).delete(synchronize_session=False)
    db.query(CurriculumProgress).filter(CurriculumProgress.student_id == student.id).delete(synchronize_session=False)
    db.query(Feedback).filter(Feedback.student_id == student.id).delete(synchronize_session=False)
    db.query(UserAccount).filter(UserAccount.profile_id == student.id, UserAccount.role == UserRole.student).delete(synchronize_session=False)
    db.delete(student)
    db.commit()


@router.get("/parents", response_model=list[ParentOut])
def parents(_: UserAccount = Depends(require_roles(UserRole.admin)), db: Session = Depends(get_db)) -> list[ParentOut]:
    rows = db.query(ParentProfile).options(selectinload(ParentProfile.students)).order_by(ParentProfile.name).all()
    return [parent_out(parent) for parent in rows]


@router.post("/parents", response_model=ParentOut, status_code=status.HTTP_201_CREATED)
def create_parent(
    request: CreateParentRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> ParentOut:
    if db.query(UserAccount).filter(UserAccount.email == request.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use.")
    linked_students = db.query(StudentProfile).filter(StudentProfile.id.in_(request.student_ids)).all() if request.student_ids else []
    if len(linked_students) != len(set(request.student_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more students do not exist.")
    parent = ParentProfile(name=request.name, email=request.email, phone=request.phone, status=EntityStatus.active, students=linked_students)
    db.add(parent)
    db.flush()
    db.add(UserAccount(name=request.name, email=request.email, password_hash=hash_password(request.password), role=UserRole.parent, profile_id=parent.id))
    db.commit()
    db.refresh(parent)
    return parent_out(parent)


@router.put("/parents/{parent_id}", response_model=ParentOut)
def update_parent(
    parent_id: str,
    request: UpdateParentRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> ParentOut:
    parent = db.query(ParentProfile).options(selectinload(ParentProfile.students)).filter(ParentProfile.id == parent_id).one_or_none()
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found.")
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
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> ParentOut:
    parent = db.query(ParentProfile).options(selectinload(ParentProfile.students)).filter(ParentProfile.id == parent_id).one_or_none()
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found.")
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
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> None:
    parent = db.query(ParentProfile).options(selectinload(ParentProfile.students)).filter(ParentProfile.id == parent_id).one_or_none()
    if parent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent not found.")
    parent.students.clear()
    db.query(UserAccount).filter(UserAccount.profile_id == parent.id, UserAccount.role == UserRole.parent).delete(synchronize_session=False)
    db.delete(parent)
    db.commit()


@router.post("/parent-student-links", status_code=status.HTTP_204_NO_CONTENT)
def link_parent_student(
    request: LinkParentStudentRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> None:
    parent = db.query(ParentProfile).options(selectinload(ParentProfile.students)).filter(ParentProfile.id == request.parent_id).one_or_none()
    student = db.get(StudentProfile, request.student_id)
    if parent is None or student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent or student not found.")
    if student not in parent.students:
        parent.students.append(student)
        db.commit()


@router.post("/tutors", response_model=TutorOut, status_code=status.HTTP_201_CREATED)
def create_tutor(
    request: CreateTutorRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> TutorOut:
    if db.query(UserAccount).filter(UserAccount.email == request.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already in use.")

    tutor = TutorProfile(name=request.name, email=request.email, subjects_csv=",".join(request.subjects), status=EntityStatus.active)
    db.add(tutor)
    db.flush()
    db.add(
        UserAccount(
            name=request.name,
            email=request.email,
            password_hash=hash_password(request.password),
            role=UserRole.tutor,
            profile_id=tutor.id,
        )
    )
    db.commit()
    db.refresh(tutor)
    return tutor_out(tutor)


@router.put("/tutors/{tutor_id}", response_model=TutorOut)
def update_tutor(
    tutor_id: str,
    request: UpdateTutorRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> TutorOut:
    tutor = db.get(TutorProfile, tutor_id)
    if tutor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor not found.")

    tutor.name = request.name
    tutor.email = request.email
    tutor.subjects_csv = ",".join(request.subjects)
    user = db.query(UserAccount).filter(UserAccount.profile_id == tutor.id, UserAccount.role == UserRole.tutor).one_or_none()
    if user:
        user.name = request.name
        user.email = request.email
    db.commit()
    db.refresh(tutor)
    return tutor_out(tutor)


@router.patch("/tutors/{tutor_id}/status", response_model=TutorOut)
def update_tutor_status(
    tutor_id: str,
    request: UpdateStatusRequest,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> TutorOut:
    tutor = db.get(TutorProfile, tutor_id)
    if tutor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor not found.")

    tutor.status = request.status
    user = db.query(UserAccount).filter(UserAccount.profile_id == tutor.id, UserAccount.role == UserRole.tutor).one_or_none()
    if user:
        user.status = request.status
    db.commit()
    db.refresh(tutor)
    return tutor_out(tutor)


@router.delete("/tutors/{tutor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tutor(
    tutor_id: str,
    _: UserAccount = Depends(require_roles(UserRole.admin)),
    db: Session = Depends(get_db),
) -> None:
    tutor = db.query(TutorProfile).options(selectinload(TutorProfile.students)).filter(TutorProfile.id == tutor_id).one_or_none()
    if tutor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor not found.")
    if tutor.students:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Reassign students before deleting this tutor.")

    db.query(UserAccount).filter(UserAccount.profile_id == tutor.id, UserAccount.role == UserRole.tutor).delete(synchronize_session=False)
    db.delete(tutor)
    db.commit()
