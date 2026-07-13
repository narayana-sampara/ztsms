from datetime import date

from sqlalchemy.orm import Session

from app.models import (
    Assignment,
    AssignmentStatus,
    CurriculumUnit,
    CurriculumProgress,
    EntityStatus,
    Feedback,
    LearningOutcome,
    ParentProfile,
    Resource,
    ResourceType,
    StudentProfile,
    Subject,
    Topic,
    TutorProfile,
    UserAccount,
    UserRole,
)
from app.security import hash_password


def ensure_seeded(db: Session) -> None:
    remove_non_cbsc_curriculum(db)
    ensure_cbsc_master_curriculum(db)

    if db.query(UserAccount).first():
        db.commit()
        return

    arjun = TutorProfile(
        id="t-1",
        name="Arjun Rao",
        email="arjun@zenith.test",
        phone="9800000001",
        subjects_csv="Mathematics,Physics",
        status=EntityStatus.active,
    )
    leena = TutorProfile(
        id="t-2",
        name="Leena Mathew",
        email="leena@zenith.test",
        phone="9800000002",
        subjects_csv="English,Social Science",
        status=EntityStatus.active,
    )
    anika = StudentProfile(
        id="s-1",
        name="Anika Shah",
        email="anika@zenith.test",
        phone="9800000003",
        board="CBSC",
        grade="Grade 5",
        tutor=arjun,
        progress=68,
        total_fee=60000,
        fee_paid=45000,
        status=EntityStatus.active,
    )
    kabir = StudentProfile(
        id="s-2",
        name="Kabir Shah",
        email="kabir@zenith.test",
        phone="9800000004",
        board="CBSC",
        grade="Grade 6",
        tutor=arjun,
        progress=52,
        total_fee=52000,
        fee_paid=52000,
        status=EntityStatus.active,
    )
    rhea = ParentProfile(
        id="p-1",
        name="Rhea Shah",
        email="rhea@zenith.test",
        phone="9800000005",
        status=EntityStatus.active,
        students=[anika, kabir],
    )
    subject = Subject(
        id="sub-1",
        title="Mathematics",
        board="CBSC",
        grade="Grade 5",
        source_url="https://cbseacademic.nic.in/curriculum.html",
        units=[
            CurriculumUnit(
                id="unit-1",
                title="Grade 5 Number Systems",
                progress=72,
                topics=[
                    Topic(
                        id="topic-1",
                        title="Fractions and Decimals",
                        outcomes=[
                            LearningOutcome(id="lo-1", title="Solve grade-level numerical problems accurately", complete=True),
                            LearningOutcome(id="lo-2", title="Compare fractions and decimals using place value", complete=True),
                            LearningOutcome(id="lo-3", title="Apply mathematics concepts in grade 5 practice work", complete=False),
                        ],
                    )
                ],
            )
        ],
        resources=[
            Resource(id="r-1", title="Number systems reference pack", type=ResourceType.reference, url="https://example.com/number-systems-pack.pdf"),
            Resource(id="r-2", title="Fractions and decimals worksheet 01", type=ResourceType.worksheet, url="https://example.com/fractions-decimals-worksheet.pdf"),
        ],
    )
    assignment = Assignment(
        id="a-1",
        subject_id="sub-1",
        title="Fractions and decimals practice",
        due_date=date(2026, 6, 18),
        status=AssignmentStatus.submitted,
        max_score=20,
        submission_url="https://example.com/submission/anika-fractions.pdf",
        students=[anika],
    )

    db.add_all(
        [
            arjun,
            leena,
            anika,
            kabir,
            rhea,
            subject,
            assignment,
            Feedback(
                id="f-1",
                student=anika,
                tutor=arjun,
                date=date(2026, 6, 12),
                message="Anika is improving in number operations and should practice fraction word problems this week.",
            ),
            Feedback(
                id="f-2",
                student=kabir,
                tutor=arjun,
                date=date(2026, 6, 11),
                message="Kabir understands force diagrams but needs to submit the pending worksheet.",
            ),
            UserAccount(id="u-admin", name="Meera Admin", email="admin@zenith.test", phone="9800000000", role=UserRole.admin, password_hash=hash_password("Password123!")),
            UserAccount(id="u-t-1", name=arjun.name, email=arjun.email, phone=arjun.phone, role=UserRole.tutor, profile_id=arjun.id, password_hash=hash_password("Password123!")),
            UserAccount(id="u-s-1", name=anika.name, email=anika.email, phone=anika.phone, role=UserRole.student, profile_id=anika.id, password_hash=hash_password("Password123!")),
            UserAccount(id="u-p-1", name=rhea.name, email=rhea.email, phone=rhea.phone, role=UserRole.parent, profile_id=rhea.id, password_hash=hash_password("Password123!")),
            CurriculumProgress(subject_id="sub-1", student_id="s-1", progress=68),
        ]
    )
    db.commit()


def remove_non_cbsc_curriculum(db: Session) -> None:
    removed_boards = {"PYP", "MYP", "ICSE", "IGCSE", "AP", "IB", "IB DIPLOMA"}

    db.query(Subject).filter(Subject.board == "CBSE").update({Subject.board: "CBSC"}, synchronize_session=False)
    db.query(StudentProfile).filter(StudentProfile.board == "CBSE").update({StudentProfile.board: "CBSC"}, synchronize_session=False)

    old_sample = db.get(Subject, "sub-1")
    if old_sample is not None:
        old_sample.title = "Mathematics"
        old_sample.board = "CBSC"
        old_sample.grade = "Grade 5"
        old_sample.source_url = "https://cbseacademic.nic.in/curriculum.html"
        sync_sample_resources(old_sample)
        sync_sample_units(old_sample)
        for assignment in db.query(Assignment).filter(Assignment.subject_id == old_sample.id).all():
            if "polynomial" in assignment.title.lower():
                assignment.title = "Fractions and decimals practice"
            if assignment.submission_url and "poly" in assignment.submission_url.lower():
                assignment.submission_url = "https://example.com/submission/anika-fractions.pdf"

    for student in db.query(StudentProfile).all():
        if student.board.strip().upper() in removed_boards:
            student.board = "CBSC"
            student.grade = normalize_grade_for_seed(student.grade)

    for tutor in db.query(TutorProfile).all():
        subjects = [subject.strip() for subject in tutor.subjects_csv.split(",") if subject.strip()]
        tutor.subjects_csv = ",".join("Social Science" if subject.upper() == "TOK" else subject for subject in subjects)

    for feedback in db.query(Feedback).all():
        if "logarithmic" in feedback.message.lower() or "function interpretation" in feedback.message.lower():
            feedback.message = "Anika is improving in number operations and should practice fraction word problems this week."

    subjects_to_remove = [
        subject
        for subject in db.query(Subject).all()
        if subject.board.strip().upper() in removed_boards and subject.id != "sub-1"
    ]
    for subject in subjects_to_remove:
        for assignment in db.query(Assignment).filter(Assignment.subject_id == subject.id).all():
            db.delete(assignment)
        db.delete(subject)

    db.flush()


def normalize_grade_for_seed(value: str) -> str:
    digits = "".join(character for character in value if character.isdigit())
    if digits:
        return f"Grade {int(digits)}"
    return "Grade 5"


def sync_sample_resources(subject: Subject) -> None:
    desired = [
        ("Number systems reference pack", ResourceType.reference, "https://example.com/number-systems-pack.pdf"),
        ("Fractions and decimals worksheet 01", ResourceType.worksheet, "https://example.com/fractions-decimals-worksheet.pdf"),
    ]
    while len(subject.resources) < len(desired):
        subject.resources.append(Resource())
    del subject.resources[len(desired):]
    for resource, (title, resource_type, url) in zip(subject.resources, desired, strict=True):
        resource.title = title
        resource.type = resource_type
        resource.url = url


def sync_sample_units(subject: Subject) -> None:
    if not subject.units:
        subject.units.append(CurriculumUnit())
    del subject.units[1:]
    unit = subject.units[0]
    unit.title = "Grade 5 Number Systems"
    unit.progress = 72

    if not unit.topics:
        unit.topics.append(Topic())
    del unit.topics[1:]
    topic = unit.topics[0]
    topic.title = "Fractions and Decimals"

    desired_outcomes = [
        ("Solve grade-level numerical problems accurately", True),
        ("Compare fractions and decimals using place value", True),
        ("Apply mathematics concepts in grade 5 practice work", False),
    ]
    while len(topic.outcomes) < len(desired_outcomes):
        topic.outcomes.append(LearningOutcome())
    del topic.outcomes[len(desired_outcomes):]
    for outcome, (title, complete) in zip(topic.outcomes, desired_outcomes, strict=True):
        outcome.title = title
        outcome.complete = complete


def ensure_cbsc_master_curriculum(db: Session) -> None:
    if db.query(Subject).filter(Subject.board == "CBSC", Subject.grade == "Grade 5").first():
        return

    curriculum = {
        "Mathematics": ("Number Systems", "Fractions and Decimals", "Solve grade-level numerical problems accurately"),
        "Science": ("Living World", "Plants and Animals", "Describe structures, functions, and adaptations"),
        "English": ("Reading and Writing", "Comprehension and Composition", "Read, infer, summarize, and write clearly"),
        "Social Science": ("People and Places", "History, Geography, and Civics", "Connect events, places, and civic ideas"),
        "Hindi": ("Bhasha Adhyayan", "Pathan aur Lekhan", "Read, understand, and write grade-level Hindi"),
    }

    subjects: list[Subject] = []
    for grade_number in range(5, 11):
        grade = f"Grade {grade_number}"
        for subject_title, (unit_title, topic_title, outcome_title) in curriculum.items():
            subjects.append(
                Subject(
                    id=f"cbsc-{grade_number}-{subject_title.lower().replace(' ', '-')}",
                    title=subject_title,
                    board="CBSC",
                    grade=grade,
                    source_url="https://cbseacademic.nic.in/curriculum.html",
                    units=[
                        CurriculumUnit(
                            id=f"cbsc-{grade_number}-{subject_title.lower().replace(' ', '-')}-unit-1",
                            title=f"{grade} {unit_title}",
                            progress=0,
                            topics=[
                                Topic(
                                    id=f"cbsc-{grade_number}-{subject_title.lower().replace(' ', '-')}-topic-1",
                                    title=topic_title,
                                    outcomes=[
                                        LearningOutcome(
                                            id=f"cbsc-{grade_number}-{subject_title.lower().replace(' ', '-')}-lo-1",
                                            title=outcome_title,
                                            complete=False,
                                        ),
                                        LearningOutcome(
                                            id=f"cbsc-{grade_number}-{subject_title.lower().replace(' ', '-')}-lo-2",
                                            title=f"Apply {subject_title.lower()} concepts in grade {grade_number} practice work",
                                            complete=False,
                                        ),
                                    ],
                                )
                            ],
                        )
                    ],
                )
            )
    db.add_all(subjects)
