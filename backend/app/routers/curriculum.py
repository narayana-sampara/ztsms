import csv
from io import BytesIO, StringIO
import re

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Assignment, CurriculumProgress, CurriculumUnit, LearningOutcome, Resource, StudentProfile, Subject, Topic, UserAccount, UserRole
from app.schemas import (
    CreateResourceRequest,
    CreateSubjectRequest,
    ResourceOut,
    SubjectOut,
    UpdateCurriculumProgressRequest,
    UpdateSubjectRequest,
)

router = APIRouter(prefix="/api/curriculum", tags=["curriculum"], dependencies=[Depends(get_current_user)])


def _subject_query(db: Session):
    return db.query(Subject).options(
        selectinload(Subject.units).selectinload(CurriculumUnit.topics).selectinload(Topic.outcomes),
        selectinload(Subject.progress_records),
    )


def _owned_students(db: Session, current_user: UserAccount, student_ids: list[str]) -> list[StudentProfile]:
    if not student_ids:
        return []
    unique_ids = list(dict.fromkeys(student_ids))
    query = db.query(StudentProfile).filter(StudentProfile.id.in_(unique_ids))
    if current_user.role == UserRole.tutor:
        query = query.filter(StudentProfile.tutor_id == current_user.profile_id)
    rows = query.all()
    if len(rows) != len(unique_ids):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="One or more students are not available to this tutor.")
    return rows


def _sync_student_allocations(db: Session, subject: Subject, students: list[StudentProfile]) -> None:
    student_ids = {student.id for student in students}
    if not student_ids:
        db.query(CurriculumProgress).filter(CurriculumProgress.subject_id == subject.id).delete(synchronize_session=False)
        return
    db.query(CurriculumProgress).filter(
        CurriculumProgress.subject_id == subject.id,
        ~CurriculumProgress.student_id.in_(student_ids),
    ).delete(synchronize_session=False)
    existing_ids = {record.student_id for record in subject.progress_records}
    for student in students:
        if student.id not in existing_ids:
            db.add(CurriculumProgress(subject_id=subject.id, student_id=student.id, progress=0))


def _create_subject_from_values(
    db: Session,
    *,
    title: str,
    board: str,
    grade: str,
    source_url: str,
    unit_title: str,
    topic_title: str,
    outcome_title: str,
    students: list[StudentProfile],
) -> Subject:
    subject = Subject(
        title=title.strip(),
        board=board.strip(),
        grade=grade.strip(),
        source_url=source_url.strip(),
        units=[
            CurriculumUnit(
                title=unit_title.strip(),
                progress=0,
                topics=[
                    Topic(
                        title=topic_title.strip(),
                        outcomes=[LearningOutcome(title=outcome_title.strip(), complete=False)],
                    )
                ],
            )
        ],
    )
    db.add(subject)
    db.flush()
    for student in students:
        db.add(CurriculumProgress(subject_id=subject.id, student_id=student.id, progress=0))
    return subject


def _first_non_empty_lines(text: str, limit: int = 4) -> list[str]:
    lines = [re.sub(r"\s+", " ", line).strip() for line in text.splitlines()]
    return [line for line in lines if len(line) >= 4][:limit]


def _extract_pdf_text(pdf_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Install pypdf to enable PDF text extraction.") from exc

    reader = PdfReader(BytesIO(pdf_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _parse_student_ids(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in re.split(r"[,;|]", raw) if item.strip()]


@router.get("/subjects", response_model=list[SubjectOut])
def subjects(db: Session = Depends(get_db)) -> list[SubjectOut]:
    rows = (
        _subject_query(db)
        .order_by(Subject.title)
        .all()
    )
    return [SubjectOut.model_validate(subject) for subject in rows]


@router.post("/subjects", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
def create_subject(
    request: CreateSubjectRequest,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(require_roles(UserRole.tutor)),
) -> SubjectOut:
    students = _owned_students(db, current_user, request.student_ids)
    subject = _create_subject_from_values(
        db,
        title=request.title,
        board=request.board,
        grade=request.grade,
        source_url=str(request.source_url),
        unit_title=request.unit_title,
        topic_title=request.topic_title,
        outcome_title=request.outcome_title,
        students=students,
    )
    db.commit()
    subject = _subject_query(db).filter(Subject.id == subject.id).one()
    return SubjectOut.model_validate(subject)


@router.put("/subjects/{subject_id}", response_model=SubjectOut)
def update_subject(
    subject_id: str,
    request: UpdateSubjectRequest,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(require_roles(UserRole.tutor)),
) -> SubjectOut:
    subject = _subject_query(db).filter(Subject.id == subject_id).one_or_none()
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    subject.title = request.title
    subject.board = request.board
    subject.grade = request.grade
    subject.source_url = str(request.source_url)
    first_unit = subject.units[0] if subject.units else None
    first_topic = first_unit.topics[0] if first_unit and first_unit.topics else None
    first_outcome = first_topic.outcomes[0] if first_topic and first_topic.outcomes else None
    if request.unit_title and first_unit:
        first_unit.title = request.unit_title
    if request.topic_title and first_topic:
        first_topic.title = request.topic_title
    if request.outcome_title and first_outcome:
        first_outcome.title = request.outcome_title
    if request.student_ids is not None:
        students = _owned_students(db, current_user, request.student_ids)
        _sync_student_allocations(db, subject, students)
    db.commit()
    subject = _subject_query(db).filter(Subject.id == subject_id).one()
    return SubjectOut.model_validate(subject)


@router.delete("/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: str,
    db: Session = Depends(get_db),
    _: UserAccount = Depends(require_roles(UserRole.tutor)),
) -> None:
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    db.query(Assignment).filter(Assignment.subject_id == subject_id).delete(synchronize_session=False)
    db.delete(subject)
    db.commit()


@router.post("/subjects/import/csv", response_model=list[SubjectOut], status_code=status.HTTP_201_CREATED)
async def import_subjects_csv(
    file: UploadFile = File(...),
    student_ids: str = Form(""),
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(require_roles(UserRole.tutor)),
) -> list[SubjectOut]:
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a CSV file.")
    default_students = _owned_students(db, current_user, _parse_student_ids(student_ids))
    content = (await file.read()).decode("utf-8-sig")
    rows = csv.DictReader(StringIO(content))
    created: list[Subject] = []
    for row in rows:
        title = (row.get("title") or row.get("subject") or "").strip()
        if not title:
            continue
        row_students = _owned_students(db, current_user, _parse_student_ids(row.get("student_ids") or row.get("studentIds") or row.get("students")))
        created.append(
            _create_subject_from_values(
                db,
                title=title,
                board=row.get("board") or "CBSC",
                grade=row.get("grade") or row.get("level") or "Grade 5",
                source_url=row.get("source_url") or row.get("sourceUrl") or row.get("source") or f"uploaded://{file.filename}",
                unit_title=row.get("unit_title") or row.get("unitTitle") or row.get("unit") or "Imported unit",
                topic_title=row.get("topic_title") or row.get("topicTitle") or row.get("topic") or "Imported topic",
                outcome_title=row.get("outcome_title") or row.get("outcomeTitle") or row.get("outcome") or "Review imported curriculum outcome",
                students=row_students or default_students,
            )
        )
    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV did not include any curriculum rows.")
    db.commit()
    rows = _subject_query(db).filter(Subject.id.in_([subject.id for subject in created])).order_by(Subject.title).all()
    return [SubjectOut.model_validate(subject) for subject in rows]


@router.post("/subjects/extract/pdf", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
async def extract_subject_from_pdf(
    pdf_url: str = Form(""),
    board: str = Form(...),
    grade: str = Form(...),
    student_ids: str = Form(""),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(require_roles(UserRole.tutor)),
) -> SubjectOut:
    if file is not None:
        pdf_bytes = await file.read()
        source_url = f"uploaded://{file.filename}"
        source_name = file.filename
    elif pdf_url:
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.get(pdf_url)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to download PDF source.") from exc
        pdf_bytes = response.content
        source_url = pdf_url
        source_name = pdf_url.rsplit("/", 1)[-1] or "curriculum.pdf"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide a PDF file or pdf_url.")

    text = _extract_pdf_text(pdf_bytes)
    lines = _first_non_empty_lines(text)
    title = lines[0] if lines else re.sub(r"[-_]+", " ", source_name.rsplit(".", 1)[0]).title()
    unit_title = lines[1] if len(lines) > 1 else "Extracted PDF unit"
    topic_title = lines[2] if len(lines) > 2 else "Extracted PDF topic"
    outcome_title = lines[3] if len(lines) > 3 else "Review and refine outcomes extracted from the PDF source"
    students = _owned_students(db, current_user, _parse_student_ids(student_ids))
    subject = _create_subject_from_values(
        db,
        title=title[:160],
        board=board,
        grade=grade,
        source_url=source_url,
        unit_title=unit_title[:160],
        topic_title=topic_title[:160],
        outcome_title=outcome_title[:300],
        students=students,
    )
    db.commit()
    subject = _subject_query(db).filter(Subject.id == subject.id).one()
    return SubjectOut.model_validate(subject)


@router.patch("/subjects/{subject_id}/progress", response_model=SubjectOut)
def update_subject_progress(
    subject_id: str,
    request: UpdateCurriculumProgressRequest,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(require_roles(UserRole.tutor)),
) -> SubjectOut:
    subject = db.get(Subject, subject_id)
    if subject is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")
    student = db.get(StudentProfile, request.student_id)
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    if current_user.role == UserRole.tutor and student.tutor_id != current_user.profile_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student is not available to this tutor.")

    progress = db.get(CurriculumProgress, {"subject_id": subject_id, "student_id": request.student_id})
    if progress is None:
        progress = CurriculumProgress(subject_id=subject_id, student_id=request.student_id, progress=request.progress)
        db.add(progress)
    else:
        progress.progress = request.progress

    student_progress_values = [
        row.progress
        for row in db.query(CurriculumProgress).filter(CurriculumProgress.student_id == request.student_id).all()
        if row.subject_id != subject_id
    ]
    student_progress_values.append(request.progress)
    student.progress = round(sum(student_progress_values) / len(student_progress_values))

    db.commit()
    db.refresh(subject)
    return SubjectOut.model_validate(subject)


@router.get("/resources", response_model=list[ResourceOut])
def resources(db: Session = Depends(get_db)) -> list[ResourceOut]:
    rows = db.query(Resource).order_by(Resource.title).all()
    return [ResourceOut.model_validate(resource) for resource in rows]


@router.post("/resources", response_model=ResourceOut, status_code=status.HTTP_201_CREATED)
def create_resource(
    request: CreateResourceRequest,
    db: Session = Depends(get_db),
    _: UserAccount = Depends(require_roles(UserRole.tutor)),
) -> ResourceOut:
    if db.get(Subject, request.subject_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    resource = Resource(subject_id=request.subject_id, title=request.title, type=request.type, url=str(request.url))
    db.add(resource)
    db.commit()
    db.refresh(resource)
    return ResourceOut.model_validate(resource)
