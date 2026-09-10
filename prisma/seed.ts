/**
 * Development seed for the Momo Smart LMS.
 *
 * Builds one coherent slice of a school: a science department, an AP Biology
 * course with three sections taught by Dr. Aris Chen, a full unit of lessons,
 * a rubric-graded lab report, a timed formative assessment, attendance for the
 * day, and the at-risk students that drive the intervention panel.
 *
 * Run with `npm run db:seed`. It is idempotent — re-running resets the seeded
 * rows rather than duplicating them.
 */
import { hashSync } from "bcryptjs";

import { PrismaClient } from "../generated/prisma";
import type { AttendanceStatus } from "../generated/prisma";

const db = new PrismaClient();

/**
 * Every demo account shares one password. Development data only — real accounts
 * are created through the school's own provisioning flow.
 */
const DEMO_PASSWORD = "momo1234";
const DEMO_HASH = hashSync(DEMO_PASSWORD, 10);

/** Fixed "today" anchor so relative dates stay coherent across a run. */
const NOW = new Date();
const at = (days: number, hours = 0, minutes = 0) => {
  const date = new Date(NOW);
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date;
};
const dateOnly = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

const DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;
const TODAY_DOW = DAYS[NOW.getDay()]!;

/**
 * Class meetings on the section's regular day plus, when they differ, today —
 * so the teacher's daily roster has periods to show whichever day it is run.
 */
const meetsOn = (
  regularDay: (typeof DAYS)[number],
  startTime: string,
  endTime: string,
  room: string,
) => {
  const days = new Set<(typeof DAYS)[number]>([regularDay, TODAY_DOW]);
  return [...days].map((dayOfWeek) => ({
    dayOfWeek,
    rotation: "ALL" as const,
    startTime,
    endTime,
    room,
  }));
};

async function reset() {
  // Ordered by dependency; cascades handle the rest.
  await db.$transaction([
    db.notification.deleteMany(),
    db.message.deleteMany(),
    db.conversationParticipant.deleteMany(),
    db.conversation.deleteMany(),
    db.announcementRead.deleteMany(),
    db.announcement.deleteMany(),
    db.interventionAction.deleteMany(),
    db.peerTutorAssignment.deleteMany(),
    db.alert.deleteMany(),
    db.attendanceRecord.deleteMany(),
    db.attendanceSession.deleteMany(),
    db.proctorEvent.deleteMany(),
    db.responseAttachment.deleteMany(),
    db.questionResponse.deleteMany(),
    db.assessmentAttempt.deleteMany(),
    db.questionOption.deleteMany(),
    db.question.deleteMany(),
    db.assessment.deleteMany(),
    db.rubricScore.deleteMany(),
    db.grade.deleteMany(),
    db.submissionAttachment.deleteMany(),
    db.submission.deleteMany(),
    db.assignment.deleteMany(),
    db.rubricLevel.deleteMany(),
    db.rubricCriterion.deleteMany(),
    db.rubric.deleteMany(),
    db.gradeCategory.deleteMany(),
    db.lessonNote.deleteMany(),
    db.lessonProgress.deleteMany(),
    db.lessonMarker.deleteMany(),
    db.lessonResource.deleteMany(),
    db.lessonSection.deleteMany(),
    db.lesson.deleteMany(),
    db.sectionPacing.deleteMany(),
    db.unit.deleteMany(),
    db.gradeSnapshot.deleteMany(),
    db.enrollment.deleteMany(),
    db.sectionMeeting.deleteMany(),
    db.section.deleteMany(),
    db.course.deleteMany(),
    db.term.deleteMany(),
    db.officeHourBooking.deleteMany(),
    db.officeHour.deleteMany(),
    db.calendarEvent.deleteMany(),
    db.fileObject.deleteMany(),
    db.accommodation.deleteMany(),
    db.guardianLink.deleteMany(),
    db.guardian.deleteMany(),
    db.teacherProfile.deleteMany(),
    db.studentProfile.deleteMany(),
    db.department.deleteMany(),
    db.session.deleteMany(),
    db.account.deleteMany(),
    db.user.deleteMany(),
  ]);
}

async function main() {
  console.log("Resetting seeded data…");
  await reset();

  // --- Departments and term -------------------------------------------------
  const science = await db.department.create({
    data: { name: "Science Department", code: "SCI" },
  });
  const social = await db.department.create({
    data: { name: "Social Studies", code: "SOC" },
  });
  const math = await db.department.create({
    data: { name: "Mathematics", code: "MATH" },
  });
  const english = await db.department.create({
    data: { name: "English Language", code: "ENG" },
  });

  const term = await db.term.create({
    data: {
      name: "Fall 2024 – Term 1",
      schoolYear: "2024-2025",
      // Week 9 of the term as of "today".
      startDate: at(-56, 8, 0),
      endDate: at(45, 16, 0),
      isCurrent: true,
    },
  });

  // --- Staff ----------------------------------------------------------------
  const chenUser = await db.user.create({
    data: {
      name: "Aris Chen",
      title: "Dr.",
      email: "aris.chen@momosmart.edu",
      role: "TEACHER",
      passwordHash: DEMO_HASH,
      teacherProfile: {
        create: {
          employeeNumber: "EMP-1042",
          departmentId: science.id,
          officeLocation: "BioLab 204",
          bio: "AP Biology Lead Instructor, Department of Natural Sciences.",
        },
      },
    },
    include: { teacherProfile: true },
  });
  const chen = chenUser.teacherProfile!;

  const davisUser = await db.user.create({
    data: {
      name: "Marcus Davis",
      title: "Mr.",
      email: "m.davis@momosmart.edu",
      role: "TEACHER",
      passwordHash: DEMO_HASH,
      teacherProfile: {
        create: { employeeNumber: "EMP-1088", departmentId: social.id },
      },
    },
    include: { teacherProfile: true },
  });

  const patelUser = await db.user.create({
    data: {
      name: "Rina Patel",
      title: "Dr.",
      email: "r.patel@momosmart.edu",
      role: "TEACHER",
      passwordHash: DEMO_HASH,
      teacherProfile: {
        create: { employeeNumber: "EMP-1120", departmentId: math.id },
      },
    },
    include: { teacherProfile: true },
  });

  const vanceUser = await db.user.create({
    data: {
      name: "Helen Vance",
      title: "Mrs.",
      email: "h.vance@momosmart.edu",
      role: "TEACHER",
      passwordHash: DEMO_HASH,
      teacherProfile: {
        create: { employeeNumber: "EMP-1150", departmentId: english.id },
      },
    },
    include: { teacherProfile: true },
  });

  await db.user.create({
    data: {
      name: "Momo Registrar",
      email: "registrar@momosmart.edu",
      role: "ADMIN",
      passwordHash: DEMO_HASH,
    },
  });

  // --- Courses --------------------------------------------------------------
  const apBio = await db.course.create({
    data: {
      code: "AP-BIO",
      name: "AP Biology",
      description:
        "College-level biology covering cellular energetics, genetics and evolution.",
      level: "AP",
      credits: 1,
      departmentId: science.id,
      colorToken: "emerald",
    },
  });

  const anatomy = await db.course.create({
    data: {
      code: "HON-ANAT",
      name: "Honors Anatomy",
      level: "HONORS",
      credits: 1,
      departmentId: science.id,
      colorToken: "amber",
    },
  });

  const apush = await db.course.create({
    data: {
      code: "AP-USH",
      name: "AP US History",
      level: "AP",
      credits: 1,
      departmentId: social.id,
      colorToken: "orange",
    },
  });

  const precalc = await db.course.create({
    data: {
      code: "HON-PRECALC",
      name: "Pre-Calculus Honors",
      level: "HONORS",
      credits: 1,
      departmentId: math.id,
      colorToken: "indigo",
    },
  });

  const englit = await db.course.create({
    data: {
      code: "ENG-11",
      name: "English Literature 11",
      level: "REGULAR",
      credits: 1,
      departmentId: english.id,
      colorToken: "blue",
    },
  });

  // --- Sections -------------------------------------------------------------
  const bioSec1 = await db.section.create({
    data: {
      courseId: apBio.id,
      termId: term.id,
      teacherId: chen.id,
      code: "Sec 1",
      period: 1,
      room: "Room 304",
      capacity: 34,
      meetings: { create: meetsOn("THURSDAY", "08:15", "09:45", "Room 304") },
      gradeCategories: {
        create: [
          { name: "Labs", weightPercent: 40 },
          { name: "Assessments", weightPercent: 40 },
          { name: "Homework", weightPercent: 20 },
        ],
      },
    },
    include: { gradeCategories: true },
  });

  const bioSec2 = await db.section.create({
    data: {
      courseId: apBio.id,
      termId: term.id,
      teacherId: chen.id,
      code: "Sec 2",
      period: 3,
      room: "Lab B",
      capacity: 32,
      meetings: { create: meetsOn("THURSDAY", "10:00", "11:30", "Lab B") },
      gradeCategories: {
        create: [
          { name: "Labs", weightPercent: 40 },
          { name: "Assessments", weightPercent: 40 },
          { name: "Homework", weightPercent: 20 },
        ],
      },
    },
    include: { gradeCategories: true },
  });

  const anatSec = await db.section.create({
    data: {
      courseId: anatomy.id,
      termId: term.id,
      teacherId: chen.id,
      code: "Sec 4",
      period: 5,
      room: "Room 304",
      capacity: 30,
      meetings: { create: meetsOn("THURSDAY", "13:15", "14:45", "Room 304") },
      gradeCategories: {
        create: [
          { name: "Practicums", weightPercent: 50 },
          { name: "Assessments", weightPercent: 30 },
          { name: "Homework", weightPercent: 20 },
        ],
      },
    },
    include: { gradeCategories: true },
  });

  const bioSec3 = await db.section.create({
    data: {
      courseId: apBio.id,
      termId: term.id,
      teacherId: chen.id,
      code: "Sec 3",
      period: 7,
      room: "Lab B",
      capacity: 30,
      meetings: {
        create: [
          {
            dayOfWeek: "FRIDAY",
            rotation: "ALL",
            startTime: "14:00",
            endTime: "15:30",
            room: "Lab B",
          },
        ],
      },
    },
  });

  const apushSec = await db.section.create({
    data: {
      courseId: apush.id,
      termId: term.id,
      teacherId: davisUser.teacherProfile!.id,
      code: "Sec 1",
      period: 1,
      room: "Room 118",
      meetings: {
        create: [
          {
            dayOfWeek: "THURSDAY",
            rotation: "ALL",
            startTime: "08:15",
            endTime: "09:45",
            room: "Room 118",
          },
        ],
      },
    },
  });

  const precalcSec = await db.section.create({
    data: {
      courseId: precalc.id,
      termId: term.id,
      teacherId: patelUser.teacherProfile!.id,
      code: "Sec 2",
      period: 4,
      room: "Room 302",
      meetings: {
        create: [
          {
            dayOfWeek: "THURSDAY",
            rotation: "ALL",
            startTime: "12:00",
            endTime: "13:00",
            room: "Room 302",
          },
        ],
      },
    },
  });

  const englitSec = await db.section.create({
    data: {
      courseId: englit.id,
      termId: term.id,
      teacherId: vanceUser.teacherProfile!.id,
      code: "Sec 1",
      period: 6,
      room: "Room 105",
      meetings: {
        create: [
          {
            dayOfWeek: "THURSDAY",
            rotation: "ALL",
            startTime: "15:00",
            endTime: "16:00",
            room: "Room 105",
          },
        ],
      },
    },
  });

  // --- Students -------------------------------------------------------------
  const studentSeeds = [
    {
      name: "Alex Rivera",
      number: "OHS-28491",
      grade: 11,
      gpa: 3.84,
      percentile: 95,
    },
    { name: "Marcus Rivera", number: "OHS-2026-88", grade: 11, gpa: 3.5 },
    { name: "Maya Lin", number: "OHS-94021", grade: 11, gpa: 3.9 },
    { name: "Marcus Vance", number: "OHS-94119", grade: 11, gpa: 3.4 },
    { name: "Sofia Ramirez", number: "OHS-94302", grade: 11, gpa: 3.6 },
    { name: "Lucas Bennet", number: "OHS-94088", grade: 12, gpa: 3.2 },
    { name: "Ethan Brooks", number: "OHS-94155", grade: 11, gpa: 2.1 },
    { name: "Chloe Nguyen", number: "OHS-94177", grade: 12, gpa: 2.6 },
    { name: "Jordan Rivera", number: "OHS-94190", grade: 11, gpa: 2.9 },
    { name: "Priya Anand", number: "OHS-94210", grade: 11, gpa: 3.7 },
    { name: "Noah Kim", number: "OHS-94222", grade: 11, gpa: 3.1 },
    { name: "Grace Okafor", number: "OHS-94240", grade: 11, gpa: 3.95 },
  ];

  const students = new Map<string, { id: string; userId: string }>();
  for (const seed of studentSeeds) {
    const user = await db.user.create({
      data: {
        name: seed.name,
        email: `${seed.number.toLowerCase()}@student.momosmart.edu`,
        role: "STUDENT",
        passwordHash: DEMO_HASH,
        studentProfile: {
          create: {
            studentNumber: seed.number,
            gradeLevel: seed.grade,
            graduationYear: seed.grade === 12 ? 2025 : 2026,
            cumulativeGpa: seed.gpa,
            gpaPercentile: seed.percentile,
          },
        },
      },
      include: { studentProfile: true },
    });
    students.set(seed.name, {
      id: user.studentProfile!.id,
      userId: user.id,
    });
  }

  const studentId = (name: string) => students.get(name)!.id;

  // Chloe has extended-time on timed assessments.
  await db.accommodation.create({
    data: {
      studentId: studentId("Chloe Nguyen"),
      type: "EXTENDED_TIME",
      multiplier: 1.5,
      notes: "504 plan — time and a half on timed assessments.",
    },
  });

  // A guardian to contact for the at-risk panel.
  const guardian = await db.guardian.create({
    data: {
      name: "Denise Brooks",
      email: "d.brooks@example.com",
      phone: "+1-555-0142",
      relationship: "MOTHER",
    },
  });
  await db.guardianLink.create({
    data: {
      guardianId: guardian.id,
      studentId: studentId("Ethan Brooks"),
      isPrimary: true,
    },
  });

  // --- Enrollments ----------------------------------------------------------
  const enroll = async (
    sectionId: string,
    names: string[],
    grades: Record<string, number> = {},
  ) => {
    for (const [index, name] of names.entries()) {
      const percent = grades[name];
      await db.enrollment.create({
        data: {
          sectionId,
          studentId: studentId(name),
          seatNo: index + 1,
          currentPercent: percent ?? null,
          currentLetter: percent ? letter(percent) : null,
          syllabusPercent: percent
            ? Math.min(100, Math.round(percent * 0.95))
            : 0,
        },
      });
    }
  };

  await enroll(
    bioSec1.id,
    [
      "Marcus Vance",
      "Jordan Rivera",
      "Priya Anand",
      "Grace Okafor",
      "Noah Kim",
    ],
    {
      "Marcus Vance": 88.5,
      "Jordan Rivera": 73.5,
      "Priya Anand": 92.4,
      "Grace Okafor": 96.1,
      "Noah Kim": 84.2,
    },
  );

  await enroll(
    bioSec2.id,
    [
      "Alex Rivera",
      "Marcus Rivera",
      "Maya Lin",
      "Sofia Ramirez",
      "Ethan Brooks",
    ],
    {
      "Alex Rivera": 88.0,
      "Marcus Rivera": 85.3,
      "Maya Lin": 91.2,
      "Sofia Ramirez": 86.7,
      "Ethan Brooks": 68.4,
    },
  );

  await enroll(anatSec.id, ["Lucas Bennet", "Chloe Nguyen", "Grace Okafor"], {
    "Lucas Bennet": 89.4,
    "Chloe Nguyen": 71.0,
    "Grace Okafor": 94.8,
  });

  await enroll(bioSec3.id, ["Noah Kim", "Priya Anand"], {
    "Noah Kim": 81.0,
    "Priya Anand": 90.5,
  });

  await enroll(apushSec.id, ["Alex Rivera"], { "Alex Rivera": 94 });
  await enroll(precalcSec.id, ["Alex Rivera"], { "Alex Rivera": 91 });
  await enroll(englitSec.id, ["Alex Rivera"], { "Alex Rivera": 96 });

  // Grade history for Jordan Rivera: 86% → 73.5% triggers the drop alert.
  const jordanEnrollment = await db.enrollment.findFirstOrThrow({
    where: { sectionId: bioSec1.id, studentId: studentId("Jordan Rivera") },
  });
  await db.gradeSnapshot.createMany({
    data: [
      {
        enrollmentId: jordanEnrollment.id,
        percent: 86,
        letter: "B",
        capturedAt: at(-14),
      },
      {
        enrollmentId: jordanEnrollment.id,
        percent: 73.5,
        letter: "C",
        capturedAt: at(-1),
      },
    ],
  });

  // --- Curriculum -----------------------------------------------------------
  const unitTitles = [
    "Unit 1: Chemistry of Life",
    "Unit 2: Cell Structure & Function",
    "Unit 3: Cell Biology & Transport",
    "Unit 4: Cellular Energetics",
    "Unit 5: Cell Communication",
    "Unit 6: Gene Expression",
    "Unit 7: Natural Selection",
    "Unit 8: Ecology",
    "Unit 9: Systems Biology",
    "Unit 10: Exam Review",
  ];

  const units = [];
  for (const [index, title] of unitTitles.entries()) {
    units.push(
      await db.unit.create({
        data: {
          courseId: apBio.id,
          order: index + 1,
          title,
          description:
            index === 3
              ? "Glycolysis, the citric acid cycle and oxidative phosphorylation."
              : undefined,
          examDate: index === 3 ? at(9, 8, 0) : undefined,
        },
      }),
    );
  }
  const unit4 = units[3]!;

  // Pacing: units 1-3 finished, unit 4 (cellular energetics) being taught now.
  for (const [index, unit] of units.entries()) {
    for (const sectionId of [bioSec1.id, bioSec2.id]) {
      await db.sectionPacing.create({
        data: {
          sectionId,
          unitId: unit.id,
          status:
            index < 3
              ? "COMPLETED"
              : index === 3
                ? "IN_PROGRESS"
                : "NOT_STARTED",
          startedAt: index <= 3 ? at(-30 + index * 6) : null,
          completedAt: index < 3 ? at(-25 + index * 6) : null,
        },
      });
    }
  }

  const lesson41 = await db.lesson.create({
    data: {
      unitId: unit4.id,
      order: 1,
      title: "Intro to Energetics",
      summary: "Enzymatic kinetics, free energy, Gibbs law.",
      estimatedMinutes: 35,
      videoUrl: "https://media.momosmart.edu/apbio/4-1.m3u8",
      videoDurationSeconds: 2100,
    },
  });

  const lesson42 = await db.lesson.create({
    data: {
      unitId: unit4.id,
      order: 2,
      title: "Glycolysis and the Citric Acid Cycle",
      summary: "Substrate-level phosphorylation, NADH generation.",
      estimatedMinutes: 45,
      videoUrl: "https://media.momosmart.edu/apbio/4-2.m3u8",
      videoDurationSeconds: 1450,
      transcriptUrl: "https://media.momosmart.edu/apbio/4-2.vtt",
      sections: {
        create: [
          {
            kind: "READING",
            order: 0,
            title: "Key Reading Material",
            body: [
              "## Core Biochemical Principles",
              "",
              "Cellular respiration involves the coordinated catabolism of organic molecules to generate Adenosine Triphosphate (ATP). During Glycolysis, a single molecule of glucose (6-carbon) undergoes enzymatic cleaving into two molecules of pyruvate (3-carbon) within the cytoplasm, occurring independently of molecular oxygen.",
              "",
              "- **Energy Investment Phase:** 2 ATP consumed to phosphorylate hexose intermediates, catalyzed by hexokinase and phosphofructokinase-1 (PFK-1).",
              "- **Energy Payoff Phase:** 4 ATP synthesized via substrate-level phosphorylation, alongside reduction of 2 NAD+ to 2 NADH.",
              "- **Net Yield:** 2 Pyruvate + 2 ATP (net) + 2 NADH + 2 H2O + 2 H+ per mole of oxidized glucose.",
            ].join("\n"),
          },
          {
            kind: "FORMULA",
            order: 1,
            title: "Net Glycolytic Equation",
            body: "C6H12O6 + 2 NAD+ + 2 ADP + 2 Pi → 2 C3H4O3 (Pyruvate) + 2 NADH + 2 H+ + 2 ATP + 2 H2O",
          },
          {
            kind: "LAB_PROTOCOL",
            order: 2,
            title: "Lab Protocol & Safety",
            body: "Experiment 4B: measure CO2 evolution from yeast cultures. Goggles and gloves are required for all bench work.",
          },
          {
            kind: "SELF_CHECK",
            order: 3,
            title: "Self-Check Checks",
            body: "Four quick checks covering ATP accounting, NADH yield, PFK-1 regulation and pyruvate translocation.",
          },
        ],
      },
      markers: {
        create: [
          { label: "Substrate-Level Phosphorylation", positionSeconds: 855 },
          { label: "Citric Acid Cycle Overview", positionSeconds: 1120 },
        ],
      },
    },
  });

  const lesson43 = await db.lesson.create({
    data: {
      unitId: unit4.id,
      order: 3,
      title: "Electron Transport Chain",
      summary: "Chemiosmosis, proton gradient, oxidative phosphorylation.",
      estimatedMinutes: 50,
      videoUrl: "https://media.momosmart.edu/apbio/4-3.m3u8",
      videoDurationSeconds: 3000,
      // Gated behind completing 4.2.
      prerequisiteId: lesson42.id,
    },
  });

  const protocolFile = await db.fileObject.create({
    data: {
      storageKey: "seed/lab-4b-protocol.pdf",
      url: "https://files.momosmart.edu/seed/lab-4b-protocol.pdf",
      fileName: "Lab_4B_Respiration_Protocol.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2_516_582,
      uploadedById: chenUser.id,
    },
  });

  const slidesFile = await db.fileObject.create({
    data: {
      storageKey: "seed/lecture-slides-cellular-energetics.pptx",
      url: "https://files.momosmart.edu/seed/lecture-slides-cellular-energetics.pptx",
      fileName: "Lecture_Slides_CellularEnergetics.pptx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      sizeBytes: 8_493_465,
      uploadedById: chenUser.id,
    },
  });

  await db.lessonResource.createMany({
    data: [
      {
        lessonId: lesson42.id,
        fileId: protocolFile.id,
        title: "Lab 4B Respiration Protocol",
        kind: "PDF",
        detail: "Updated Oct 12",
        order: 0,
      },
      {
        lessonId: lesson42.id,
        fileId: slidesFile.id,
        title: "Lecture Slides — Cellular Energetics",
        kind: "SLIDES",
        detail: "42 Slides",
        order: 1,
      },
    ],
  });

  // Lesson progress: 4.1 done, 4.2 in progress (paused at 14:22 of 24:10).
  await db.lessonProgress.createMany({
    data: [
      {
        lessonId: lesson41.id,
        studentId: studentId("Marcus Rivera"),
        status: "COMPLETED",
        positionSeconds: 2100,
        percentComplete: 100,
        lastViewedAt: at(-2, 10),
        completedAt: at(-2, 10),
      },
      {
        lessonId: lesson42.id,
        studentId: studentId("Marcus Rivera"),
        status: "IN_PROGRESS",
        positionSeconds: 862,
        percentComplete: 59,
        lastViewedAt: at(0, 9, 40),
      },
      {
        lessonId: lesson43.id,
        studentId: studentId("Alex Rivera"),
        status: "IN_PROGRESS",
        positionSeconds: 1452,
        percentComplete: 74,
        lastViewedAt: at(0, 9, 55),
      },
      {
        lessonId: lesson41.id,
        studentId: studentId("Alex Rivera"),
        status: "COMPLETED",
        positionSeconds: 2100,
        percentComplete: 100,
        lastViewedAt: at(-4, 11),
        completedAt: at(-4, 11),
      },
      {
        lessonId: lesson42.id,
        studentId: studentId("Alex Rivera"),
        status: "COMPLETED",
        positionSeconds: 1450,
        percentComplete: 100,
        lastViewedAt: at(-1, 20),
        completedAt: at(-1, 20),
      },
    ],
  });

  await db.lessonNote.create({
    data: {
      lessonId: lesson42.id,
      studentId: studentId("Marcus Rivera"),
      timestampSeconds: 855,
      body: "Substrate-level phosphorylation — ATP made directly, not via the ETC.",
    },
  });

  // --- Rubric and assignments ----------------------------------------------
  const labRubric = await db.rubric.create({
    data: {
      title: "AP Bio Lab Report Rubric",
      description: "Standard four-criterion rubric for formal lab write-ups.",
      type: "STANDARD",
      totalPoints: 50,
      criteria: {
        create: [
          {
            title: "Hypothesis & Design",
            maxPoints: 10,
            order: 0,
            levels: {
              create: [
                { label: "Exemplary", points: 10, order: 0 },
                { label: "Proficient", points: 8, order: 1 },
                { label: "Developing", points: 5, order: 2 },
              ],
            },
          },
          {
            title: "Data & Analysis",
            maxPoints: 20,
            order: 1,
            levels: {
              create: [
                { label: "Exemplary", points: 20, order: 0 },
                { label: "Proficient", points: 16, order: 1 },
                { label: "Developing", points: 11, order: 2 },
              ],
            },
          },
          {
            title: "Conclusion & Error Analysis",
            maxPoints: 15,
            order: 2,
            levels: {
              create: [
                { label: "Exemplary", points: 15, order: 0 },
                { label: "Proficient", points: 12, order: 1 },
                { label: "Developing", points: 8, order: 2 },
              ],
            },
          },
          {
            title: "Scientific Communication",
            maxPoints: 5,
            order: 3,
            levels: {
              create: [
                { label: "Exemplary", points: 5, order: 0 },
                { label: "Proficient", points: 4, order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  const manualRubric = await db.rubric.create({
    data: {
      title: "Practicum Manual Scale",
      type: "MANUAL",
      totalPoints: 40,
      criteria: {
        create: [
          { title: "Overall practicum performance", maxPoints: 40, order: 0 },
        ],
      },
    },
  });

  const labsCategory1 = bioSec1.gradeCategories.find((c) => c.name === "Labs")!;
  const labsCategory2 = bioSec2.gradeCategories.find((c) => c.name === "Labs")!;
  const assessmentCategory2 = bioSec2.gradeCategories.find(
    (c) => c.name === "Assessments",
  )!;
  const practicumCategory = anatSec.gradeCategories.find(
    (c) => c.name === "Practicums",
  )!;

  const lab4Sec2 = await db.assignment.create({
    data: {
      sectionId: bioSec2.id,
      unitId: unit4.id,
      lessonId: lesson42.id,
      categoryId: labsCategory2.id,
      rubricId: labRubric.id,
      title: "Lab 4: Enzyme Catalysis Writeup",
      description:
        "Formal write-up of the enzyme catalysis investigation, including data tables and error analysis.",
      type: "LAB_REPORT",
      format: "FILE_UPLOAD",
      pointsPossible: 50,
      dueAt: at(0, 23, 59),
      graceMinutes: 120,
      publishedAt: at(-7),
    },
  });

  const quizSec1 = await db.assignment.create({
    data: {
      sectionId: bioSec1.id,
      unitId: unit4.id,
      categoryId: labsCategory1.id,
      title: "Unit 3 Review Quiz Essay",
      type: "ESSAY",
      format: "TEXT_ENTRY",
      pointsPossible: 30,
      dueAt: at(-1, 23, 59),
      publishedAt: at(-8),
    },
  });

  const practicum = await db.assignment.create({
    data: {
      sectionId: anatSec.id,
      categoryId: practicumCategory.id,
      rubricId: manualRubric.id,
      title: "Skeletal System Practicum Diagram",
      type: "DIAGRAM",
      format: "FILE_UPLOAD",
      pointsPossible: 40,
      dueAt: at(-1, 15, 0),
      graceMinutes: 480,
      publishedAt: at(-9),
    },
  });

  const respirationQuiz = await db.assignment.create({
    data: {
      sectionId: bioSec2.id,
      unitId: unit4.id,
      categoryId: assessmentCategory2.id,
      title: "Cellular Respiration Lab Quiz",
      type: "QUIZ",
      format: "ONLINE_ASSESSMENT",
      pointsPossible: 40,
      dueAt: at(4, 23, 59),
      publishedAt: at(-3),
    },
  });

  // --- Submissions in the grading queue ------------------------------------
  const makeFile = (name: string, mime: string, size: number, key: string) =>
    db.fileObject.create({
      data: {
        storageKey: key,
        url: `https://files.momosmart.edu/${key}`,
        fileName: name,
        mimeType: mime,
        sizeBytes: size,
      },
    });

  const mayaFile = await makeFile(
    "Lab4_Enzyme_Catalysis_MayaLin.pdf",
    "application/pdf",
    4_404_019,
    "seed/lab4-maya.pdf",
  );
  const lucasFile = await makeFile(
    "Skeletal_Diagram_LucasBennet.png",
    "image/png",
    6_291_456,
    "seed/skeletal-lucas.png",
  );

  const queued: Array<{
    assignmentId: string;
    student: string;
    submittedAt: Date;
    timeliness: "ON_TIME" | "GRACE_PERIOD" | "LATE";
    fileId?: string;
    textBody?: string;
    wordCount?: number;
    externalUrl?: string;
  }> = [
    {
      assignmentId: lab4Sec2.id,
      student: "Maya Lin",
      submittedAt: at(0, NOW.getHours() - 2),
      timeliness: "ON_TIME",
      fileId: mayaFile.id,
    },
    {
      assignmentId: quizSec1.id,
      student: "Marcus Vance",
      submittedAt: at(0, NOW.getHours() - 3),
      timeliness: "ON_TIME",
      textBody:
        "The citric acid cycle completes the oxidation of glucose-derived carbon...",
      wordCount: 640,
    },
    {
      assignmentId: lab4Sec2.id,
      student: "Sofia Ramirez",
      submittedAt: at(0, NOW.getHours() - 5),
      timeliness: "ON_TIME",
      externalUrl: "https://docs.google.com/document/d/seed-sofia-lab4",
    },
    {
      assignmentId: practicum.id,
      student: "Lucas Bennet",
      submittedAt: at(0, NOW.getHours() - 7),
      timeliness: "GRACE_PERIOD",
      fileId: lucasFile.id,
    },
  ];

  for (const entry of queued) {
    const submission = await db.submission.create({
      data: {
        assignmentId: entry.assignmentId,
        studentId: studentId(entry.student),
        status: "SUBMITTED",
        timeliness: entry.timeliness,
        submittedAt: entry.submittedAt,
        textBody: entry.textBody,
        wordCount: entry.wordCount,
        externalUrl: entry.externalUrl,
        grade: { create: { status: "PENDING" } },
      },
    });
    if (entry.fileId) {
      await db.submissionAttachment.create({
        data: { submissionId: submission.id, fileId: entry.fileId },
      });
    }
  }

  // Ethan is missing three pieces of work.
  for (const assignmentId of [lab4Sec2.id, respirationQuiz.id]) {
    await db.submission.create({
      data: {
        assignmentId,
        studentId: studentId("Ethan Brooks"),
        status: "MISSING",
      },
    });
  }

  // A graded, released lab so the gradebook is not empty.
  const gracedSubmission = await db.submission.create({
    data: {
      assignmentId: quizSec1.id,
      studentId: studentId("Grace Okafor"),
      status: "GRADED",
      timeliness: "ON_TIME",
      submittedAt: at(-2, 20),
      textBody:
        "Oxidative phosphorylation accounts for the bulk of ATP yield...",
      wordCount: 705,
      grade: {
        create: {
          status: "RELEASED",
          score: 29,
          letter: "A",
          feedback: "Excellent mechanistic detail on the proton gradient.",
          graderId: chenUser.id,
          gradedAt: at(-1, 16),
          releasedAt: at(-1, 16),
        },
      },
    },
  });
  console.log(`  graded sample submission ${gracedSubmission.id}`);

  // --- Timed assessment -----------------------------------------------------
  const assessment = await db.assessment.create({
    data: {
      sectionId: bioSec2.id,
      unitId: unit4.id,
      assignmentId: respirationQuiz.id,
      title: "Unit 4 Formative Assessment: Cellular Respiration & ATP Yield",
      instructions:
        "Select the single best answer for each question. Show supporting work in the scratchpad where useful.",
      standards: "Aligns with College Board AP Bio Standard 3.1 & 3.3.",
      totalPoints: 40,
      timeLimitMinutes: 30,
      maxAttempts: 1,
      opensAt: at(-1, 8),
      closesAt: at(4, 23, 59),
      allowScratchpad: true,
      allowAttachments: true,
      lockdownEnabled: true,
      publishedAt: at(-3),
    },
  });

  const questionSeeds = [
    {
      prompt:
        "During aerobic cellular respiration, which process yields the highest net quantity of ATP molecules per glucose molecule metabolized?",
      helperText:
        "Select the single best answer. Consider both substrate-level phosphorylation and oxidative mechanisms under standard biological efficiency.",
      explanation:
        "Chemiosmosis across the inner mitochondrial membrane drives the large majority of ATP synthesis.",
      options: [
        {
          label: "A",
          text: "Glycolysis (Cytoplasmic Substrate-Level Phosphorylation)",
          description: "Net yield of approximately 2 ATP molecules and 2 NADH.",
          isCorrect: false,
        },
        {
          label: "B",
          text: "Pyruvate Oxidation & Acetyl-CoA Synthesis",
          description:
            "Yields high-energy electron carriers without direct high-energy phosphate generation.",
          isCorrect: false,
        },
        {
          label: "C",
          text: "The Citric Acid Cycle (Krebs Cycle)",
          description:
            "Yields 2 ATP/GTP equivalents along with 6 NADH and 2 FADH2 carriers.",
          isCorrect: false,
        },
        {
          label: "D",
          text: "Oxidative Phosphorylation (Chemiosmosis & ETC)",
          description:
            "Utilizes inner mitochondrial membrane proton gradients across ATP synthase complexes to generate approximately 26–28 net ATP.",
          isCorrect: true,
        },
      ],
    },
    {
      prompt: "Where does glycolysis occur within a eukaryotic cell?",
      options: [
        { label: "A", text: "Mitochondrial matrix", isCorrect: false },
        { label: "B", text: "Cytoplasm", isCorrect: true },
        { label: "C", text: "Inner mitochondrial membrane", isCorrect: false },
        { label: "D", text: "Nucleus", isCorrect: false },
      ],
    },
    {
      prompt:
        "Oxygen serves as the final electron acceptor in the electron transport chain.",
      options: [
        { label: "A", text: "True", isCorrect: true },
        { label: "B", text: "False", isCorrect: false },
      ],
    },
  ];

  for (const [index, seed] of questionSeeds.entries()) {
    await db.question.create({
      data: {
        assessmentId: assessment.id,
        order: index + 1,
        type: index === 2 ? "TRUE_FALSE" : "MULTIPLE_CHOICE",
        prompt: seed.prompt,
        helperText: seed.helperText,
        points: 2,
        explanation: seed.explanation,
        options: {
          create: seed.options.map((option, optionIndex) => ({
            ...option,
            order: optionIndex,
          })),
        },
      },
    });
  }

  // Fill out the remaining questions so the navigator has 20 items.
  for (let index = questionSeeds.length; index < 20; index += 1) {
    await db.question.create({
      data: {
        assessmentId: assessment.id,
        order: index + 1,
        type: "MULTIPLE_CHOICE",
        prompt: `Cellular respiration practice question ${index + 1}.`,
        points: 2,
        options: {
          create: ["A", "B", "C", "D"].map((label, optionIndex) => ({
            label,
            text: `Choice ${label}`,
            isCorrect: optionIndex === 1,
            order: optionIndex,
          })),
        },
      },
    });
  }

  // An in-progress attempt: 15 of 20 answered, 2 flagged, ~16 minutes left.
  const questions = await db.question.findMany({
    where: { assessmentId: assessment.id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      options: { select: { id: true, label: true } },
    },
  });

  const attempt = await db.assessmentAttempt.create({
    data: {
      assessmentId: assessment.id,
      studentId: studentId("Marcus Rivera"),
      attempt: 1,
      status: "IN_PROGRESS",
      startedAt: new Date(NOW.getTime() - 14 * 60_000),
      expiresAt: new Date(NOW.getTime() + 16 * 60_000),
      lastAutosaveAt: new Date(NOW.getTime() - 60_000),
    },
  });

  const answeredOrders = [
    1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 19,
  ];
  for (const question of questions) {
    if (!answeredOrders.includes(question.order)) continue;
    const chosen =
      question.order === 1
        ? question.options.find((o) => o.label === "D")!
        : question.options[1]!;

    await db.questionResponse.create({
      data: {
        attemptId: attempt.id,
        questionId: question.id,
        selectedOptionIds: [chosen.id],
        isAnswered: true,
        isFlagged: question.order === 7 || question.order === 12,
        answeredAt: new Date(NOW.getTime() - 5 * 60_000),
        scratchpad:
          question.order === 1
            ? "Glycolysis 2 ATP + Krebs 2 ATP + OxPhos ~26-28 → D"
            : undefined,
      },
    });
  }

  await db.proctorEvent.create({
    data: {
      attemptId: attempt.id,
      type: "TAB_SWITCH",
      detail: "Focus lost for 4s",
      occurredAt: new Date(NOW.getTime() - 8 * 60_000),
    },
  });

  // --- Attendance for today -------------------------------------------------
  const today = dateOnly(NOW);

  const sec1Session = await db.attendanceSession.create({
    data: {
      sectionId: bioSec1.id,
      date: today,
      period: 1,
      status: "SUBMITTED",
      takenById: chenUser.id,
      submittedAt: at(0, 8, 22),
    },
  });

  const sec1Roster = await db.enrollment.findMany({
    where: { sectionId: bioSec1.id, status: "ACTIVE" },
    select: { studentId: true },
  });
  await db.attendanceRecord.createMany({
    data: sec1Roster.map((entry) => ({
      sessionId: sec1Session.id,
      studentId: entry.studentId,
      status: "PRESENT" as AttendanceStatus,
    })),
  });

  const sec2Session = await db.attendanceSession.create({
    data: {
      sectionId: bioSec2.id,
      date: today,
      period: 3,
      status: "IN_SESSION",
      takenById: chenUser.id,
    },
  });
  const sec2Roster = await db.enrollment.findMany({
    where: { sectionId: bioSec2.id, status: "ACTIVE" },
    select: { studentId: true },
  });
  await db.attendanceRecord.createMany({
    data: sec2Roster.map((entry) => ({
      sessionId: sec2Session.id,
      studentId: entry.studentId,
      status:
        entry.studentId === studentId("Ethan Brooks")
          ? ("ABSENT" as AttendanceStatus)
          : ("PRESENT" as AttendanceStatus),
    })),
  });

  // Attendance history so the student dashboard shows 42 present / 1 excused.
  const alex = studentId("Alex Rivera");
  for (let day = 43; day >= 1; day -= 1) {
    const date = dateOnly(at(-day));
    const session = await db.attendanceSession.upsert({
      where: { sectionId_date: { sectionId: apushSec.id, date } },
      create: {
        sectionId: apushSec.id,
        date,
        period: 1,
        status: "SUBMITTED",
        submittedAt: at(-day, 8, 30),
      },
      update: {},
    });
    await db.attendanceRecord.create({
      data: {
        sessionId: session.id,
        studentId: alex,
        status: day === 12 ? "EXCUSED" : "PRESENT",
      },
    });
  }

  // --- Alerts and interventions --------------------------------------------
  await db.alert.create({
    data: {
      studentId: studentId("Ethan Brooks"),
      sectionId: bioSec2.id,
      type: "MISSING_WORK",
      severity: "CRITICAL",
      status: "OPEN",
      title: "3 missing assignments",
      message:
        "Missing Lab 3 Writeup, Quiz 2, and Genetics Worksheet. No login in 4 days.",
      metadata: { count: 3, lastLoginDays: 4 },
    },
  });

  await db.alert.create({
    data: {
      studentId: studentId("Chloe Nguyen"),
      sectionId: anatSec.id,
      type: "MISSED_ASSESSMENT",
      severity: "CRITICAL",
      status: "OPEN",
      title: "Missed Practicum Exam",
      message:
        "Missed Practicum Exam on Tuesday due to illness. Make-up window closes in 48h.",
      dueBy: at(2, 15, 0),
      metadata: { reason: "illness" },
    },
  });

  await db.alert.create({
    data: {
      studentId: studentId("Jordan Rivera"),
      sectionId: bioSec1.id,
      type: "GRADE_DROP",
      severity: "WARNING",
      status: "OPEN",
      title: "Grade drop",
      message:
        "Drop from 86% to 73% following Unit 2 exam. Tutoring requested by student.",
      metadata: { from: 86, to: 73.5, drop: 12.5 },
    },
  });

  // --- Announcements, events, office hours ---------------------------------
  const registrar = await db.user.findFirstOrThrow({
    where: { role: "ADMIN" },
  });

  await db.announcement.createMany({
    data: [
      {
        authorId: registrar.id,
        scope: "SCHOOL",
        title: "Spirit Week Pep Rally schedule updated",
        body: "Gymnasium session begins at 1:45 PM on Thursday. Modified bell schedules posted.",
        publishedAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        authorId: registrar.id,
        scope: "SCHOOL",
        title: "PSAT sign-up deadline Friday",
        body: "All juniors must verify their test registration with Guidance Office in Room 102.",
        publishedAt: new Date(NOW.getTime() - 5 * 60 * 60 * 1000),
      },
    ],
  });

  await db.announcement.create({
    data: {
      authorId: chenUser.id,
      scope: "SECTION",
      sectionId: bioSec2.id,
      title: "Unit 4 exam moved to Oct 24",
      body: "We will use Thursday's lab period for review. Bring your data tables.",
      isPinned: true,
    },
  });

  await db.calendarEvent.createMany({
    data: [
      {
        title: "Mid-Term Progress Reports Due",
        description: "District Submission",
        type: "ADMIN_DEADLINE",
        startAt: at(2, 17, 0),
        createdById: registrar.id,
      },
      {
        title: "Unit 4 Exam — Cellular Energetics",
        type: "EXAM",
        startAt: at(9, 10, 0),
        endAt: at(9, 11, 30),
        location: "Lab B",
        sectionId: bioSec2.id,
        createdById: chenUser.id,
      },
    ],
  });

  const officeHour = await db.officeHour.create({
    data: {
      teacherId: chen.id,
      dayOfWeek: TODAY_DOW,
      startTime: "15:00",
      endTime: "16:15",
      mode: "HYBRID",
      location: "Lab Room 304",
      meetingUrl: "https://zoom.momosmart.edu/j/room4",
      capacity: 8,
      label: "Drop-in Help",
    },
  });

  for (const name of [
    "Maya Lin",
    "Sofia Ramirez",
    "Noah Kim",
    "Jordan Rivera",
  ]) {
    await db.officeHourBooking.create({
      data: {
        officeHourId: officeHour.id,
        studentId: studentId(name),
        date: today,
        topic: "Unit 4 review",
      },
    });
  }

  // --- Message threads ------------------------------------------------------
  const userIdOf = (name: string) => students.get(name)!.userId;

  const conversations: Array<{
    student: string;
    subject: string;
    messages: Array<{
      from: "teacher" | "student";
      body: string;
      minutesAgo: number;
    }>;
  }> = [
    {
      student: "Marcus Rivera",
      subject: "Lab 4 write-up question",
      messages: [
        {
          from: "student",
          body: "Dr. Chen — for the enzyme catalysis write-up, should the error analysis cover the pipetting variance as well, or just the temperature drift?",
          minutesAgo: 190,
        },
        {
          from: "teacher",
          body: "Cover both. Temperature drift is the dominant term, but a sentence on pipetting variance shows you understand where the noise comes from.",
          minutesAgo: 120,
        },
        {
          from: "student",
          body: "Got it, thank you! I'll have it in before tonight's deadline.",
          minutesAgo: 95,
        },
      ],
    },
    {
      student: "Ethan Brooks",
      subject: "Missing work — catching up",
      messages: [
        {
          from: "teacher",
          body: "Ethan, I have three missing items for you in AP Bio Sec 2. Can you come to office hours today at 3:00 so we can build a catch-up plan?",
          minutesAgo: 55,
        },
      ],
    },
  ];

  for (const thread of conversations) {
    const conversation = await db.conversation.create({
      data: {
        subject: thread.subject,
        participants: {
          create: [
            { userId: chenUser.id, lastReadAt: NOW },
            { userId: userIdOf(thread.student) },
          ],
        },
      },
    });

    for (const message of thread.messages) {
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId:
            message.from === "teacher" ? chenUser.id : userIdOf(thread.student),
          body: message.body,
          sentAt: new Date(NOW.getTime() - message.minutesAgo * 60_000),
        },
      });
    }

    // Leave the student's last word unread so the inbox shows a badge.
    const lastFromStudent = thread.messages
      .filter((message) => message.from === "student")
      .at(-1);
    if (lastFromStudent) {
      await db.conversationParticipant.updateMany({
        where: { conversationId: conversation.id, userId: chenUser.id },
        data: {
          lastReadAt: new Date(
            NOW.getTime() - (lastFromStudent.minutesAgo + 5) * 60_000,
          ),
        },
      });
    }
  }

  console.log("Seed complete:");
  console.log(`  term       ${term.name}`);
  console.log(
    `  sections   ${[bioSec1, bioSec2, anatSec, bioSec3].length} for Dr. Chen`,
  );
  console.log(`\n  Sign in with password "${DEMO_PASSWORD}":`);
  console.log(`    teacher  ${chenUser.email}`);
  console.log(`    student  ohs-28491@student.momosmart.edu   (Alex Rivera)`);
  console.log(`    student  ohs-2026-88@student.momosmart.edu (Marcus Rivera)`);
  console.log(`    admin    registrar@momosmart.edu`);
}

/** Local copy of the letter-grade scale so the seed stays self-contained. */
function letter(percent: number): string {
  const cutoffs: Array<[number, string]> = [
    [97, "A+"],
    [93, "A"],
    [90, "A-"],
    [87, "B+"],
    [83, "B"],
    [80, "B-"],
    [77, "C+"],
    [73, "C"],
    [70, "C-"],
    [67, "D+"],
    [63, "D"],
    [60, "D-"],
  ];
  for (const [cutoff, grade] of cutoffs) {
    if (percent >= cutoff) return grade;
  }
  return "F";
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
