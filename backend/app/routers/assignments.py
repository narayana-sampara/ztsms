from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.mappers import assignment_out
from app.models import Assignment, AssignmentStatus, ParentProfile, StudentProfile, Subject, UserAccount, UserRole
from app.schemas import AssignmentOut, CreateAssignmentRequest, ReviewAssignmentRequest, SubmitAssignmentRequest

router = APIRouter(prefix="/api/assignments", tags=["assignments"], dependencies=[Depends(get_current_user)])
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "submissions"


@router.get("", response_model=list[AssignmentOut])
def assignments(current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)) -> list[AssignmentOut]:
    query = db.query(Assignment).options(selectinload(Assignment.students))
    if current_user.role == UserRole.student:
        query = query.filter(Assignment.students.any(StudentProfile.id == current_user.profile_id))
    elif current_user.role == UserRole.parent:
        parent = db.query(ParentProfile).options(selectinload(ParentProfile.students)).filter(ParentProfile.id == current_user.profile_id).one_or_none()
        child_ids = [student.id for student in parent.students] if parent else []
        query = query.filter(Assignment.students.any(StudentProfile.id.in_(child_ids)))

    rows = query.order_by(Assignment.due_date).all()
    return [assignment_out(assignment) for assignment in rows]


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    request: CreateAssignmentRequest,
    db: Session = Depends(get_db),
    _: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
) -> AssignmentOut:
    if db.get(Subject, request.subject_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    students = db.query(StudentProfile).filter(StudentProfile.id.in_(request.student_ids)).all()
    if len(students) != len(set(request.student_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more students do not exist.")

    assignment = Assignment(
        title=request.title,
        subject_id=request.subject_id,
        due_date=request.due_date,
        max_score=request.max_score,
        status=AssignmentStatus.pending,
        students=students,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment_out(assignment)


@router.post("/{assignment_id}/submit", response_model=AssignmentOut)
def submit_assignment(
    assignment_id: str,
    request: SubmitAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(require_roles(UserRole.student)),
) -> AssignmentOut:
    assignment = db.query(Assignment).options(selectinload(Assignment.students)).filter(Assignment.id == assignment_id).one_or_none()
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    if all(student.id != current_user.profile_id for student in assignment.students):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Assignment is not assigned to this student.")

    assignment.submission_url = str(request.submission_url)
    assignment.status = AssignmentStatus.submitted
    db.commit()
    db.refresh(assignment)
    return assignment_out(assignment)


@router.post("/{assignment_id}/submit-image", response_model=AssignmentOut)
async def submit_assignment_image(
    assignment_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(require_roles(UserRole.student)),
) -> AssignmentOut:
    assignment = db.query(Assignment).options(selectinload(Assignment.students)).filter(Assignment.id == assignment_id).one_or_none()
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    if all(student.id != current_user.profile_id for student in assignment.students):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Assignment is not assigned to this student.")
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a JPEG, PNG, or WebP image.")

    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg" if file.content_type == "image/jpeg" else f".{file.content_type.split('/')[-1]}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{assignment_id}-{current_user.profile_id}-{uuid4().hex}{suffix}"
    target = UPLOAD_DIR / filename
    target.write_bytes(await file.read())

    assignment.submission_url = f"/uploads/submissions/{filename}"
    assignment.status = AssignmentStatus.submitted
    db.commit()
    db.refresh(assignment)
    return assignment_out(assignment)


@router.post("/{assignment_id}/review", response_model=AssignmentOut)
def review_assignment(
    assignment_id: str,
    request: ReviewAssignmentRequest,
    db: Session = Depends(get_db),
    _: UserAccount = Depends(require_roles(UserRole.tutor, UserRole.admin)),
) -> AssignmentOut:
    assignment = db.query(Assignment).options(selectinload(Assignment.students)).filter(Assignment.id == assignment_id).one_or_none()
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")

    assignment.score = min(request.score, assignment.max_score)
    assignment.feedback = request.feedback
    assignment.status = AssignmentStatus.reviewed
    db.commit()
    db.refresh(assignment)
    return assignment_out(assignment)
