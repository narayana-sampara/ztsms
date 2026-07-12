import re

from sqlalchemy.orm import Session

from app.models import CurriculumProgress, StudentProfile, Subject


def normalize_board(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().upper()


def normalize_grade(value: str) -> str:
    text = re.sub(r"\s+", " ", value).strip().lower()
    match = re.search(r"\d+", text)
    if match:
        return f"Grade {int(match.group(0))}"
    return text.title()


def allocate_matching_curriculum(db: Session, student: StudentProfile) -> None:
    board = normalize_board(student.board)
    grade = normalize_grade(student.grade)
    if board != "CBSC":
        db.query(CurriculumProgress).filter(CurriculumProgress.student_id == student.id).delete(synchronize_session=False)
        return

    subjects = db.query(Subject).filter(Subject.board == "CBSC", Subject.grade == grade).all()
    subject_ids = {subject.id for subject in subjects}
    if subject_ids:
        db.query(CurriculumProgress).filter(
            CurriculumProgress.student_id == student.id,
            ~CurriculumProgress.subject_id.in_(subject_ids),
        ).delete(synchronize_session=False)
    else:
        db.query(CurriculumProgress).filter(CurriculumProgress.student_id == student.id).delete(synchronize_session=False)

    existing_subject_ids = {
        row.subject_id
        for row in db.query(CurriculumProgress).filter(CurriculumProgress.student_id == student.id).all()
    }
    for subject in subjects:
        if subject.id not in existing_subject_ids:
            db.add(CurriculumProgress(subject_id=subject.id, student_id=student.id, progress=0))
