from app.models import Assignment, FeeStatus, ParentProfile, StudentProfile, TutorProfile
from app.schemas import AssignmentOut, ParentOut, StudentOut, TutorOut


def split_subjects(subjects_csv: str) -> list[str]:
    return [item.strip() for item in subjects_csv.split(",") if item.strip()]


def tutor_out(tutor: TutorProfile) -> TutorOut:
    return TutorOut(
        id=tutor.id,
        name=tutor.name,
        email=tutor.email,
        subjects=split_subjects(tutor.subjects_csv),
        status=tutor.status,
        students=len(tutor.students),
    )


def student_out(student: StudentProfile) -> StudentOut:
    pending_fee = max(student.total_fee - student.fee_paid, 0)
    return StudentOut(
        id=student.id,
        name=student.name,
        email=student.email,
        board=student.board,
        grade=student.grade,
        tutor_id=student.tutor_id,
        parent_ids=[parent.id for parent in student.parents],
        progress=student.progress,
        total_fee=student.total_fee,
        fee_paid=student.fee_paid,
        pending_fee=pending_fee,
        fee_status=FeeStatus.completed if pending_fee == 0 else FeeStatus.pending,
        status=student.status,
    )


def parent_out(parent: ParentProfile) -> ParentOut:
    return ParentOut(
        id=parent.id,
        name=parent.name,
        email=parent.email,
        phone=parent.phone,
        student_ids=[student.id for student in parent.students],
        status=parent.status,
    )


def assignment_out(assignment: Assignment) -> AssignmentOut:
    return AssignmentOut(
        id=assignment.id,
        subject_id=assignment.subject_id,
        title=assignment.title,
        student_ids=[student.id for student in assignment.students],
        due_date=assignment.due_date,
        status=assignment.status,
        max_score=assignment.max_score,
        score=assignment.score,
        submission_url=assignment.submission_url,
        feedback=assignment.feedback,
    )
