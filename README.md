# Momo Smart LMS

A learning management system for schools — courses and sections, curriculum
delivery, assignments and rubric grading, timed online assessments, period
attendance, and early-intervention alerts.

Built on the [T3 Stack](https://create.t3.gg/): Next.js 15, tRPC v11, Prisma 6,
NextAuth v5 and PostgreSQL.

## Getting started

```bash
npm install
./start-database.sh        # local Postgres in Docker/Podman
npm run db:generate        # create + apply the migration, generate the client
npm run db:seed            # load a full demo school
npm run dev
```

test

`npm run db:seed` builds one coherent slice of a school: Dr. Aris Chen teaching
four sections, a unit of AP Biology lessons, a rubric-graded lab report, a
20-question timed assessment mid-attempt, today's attendance and three at-risk
students. It is idempotent — re-running resets the seeded rows. The seed
itself lives in `src/server/demo/seed.ts` (`seedDemoSchool`); `prisma/seed.ts`
is the CLI wrapper.

## Public demo & waitlist

`/demo` is the page the landing page's "Try the live demo" and "Join the
waitlist" buttons lead to:

- **Try as Teacher / Try as Student** signs the visitor straight into the
  seeded Dr. Aris Chen or Alex Rivera account (`src/app/demo/actions.ts`).
  Inside the app, a banner marks the session as a demo and links back to the
  waitlist.
- **Request early access** stores email, school, role and a note in
  `WaitlistEntry`. A repeat email updates the existing row. Browse the entries
  with `npm run db:studio`.
- **Scheduled reset.** `GET /api/demo/reset` with
  `Authorization: Bearer $CRON_SECRET` re-runs the seed so visitors' changes
  do not pile up. `vercel.json` schedules it every 6 hours; any external cron
  that sends the header works too. `WaitlistEntry` is never reset.

The one-click sign-in, the banner and the reset route are only active when
`DEMO_MODE="true"`. With it off, `/demo` shows just the waitlist. **A reset
deletes every user**, so only enable `DEMO_MODE` on a dedicated demo database.

## Data model

`prisma/schema.prisma` holds the full schema. Student-scoped academic records
hang off `StudentProfile` rather than `User`, so one person can hold several
roles without polluting the academic record.

| Area | Models |
| --- | --- |
| Identity | `User`, `StudentProfile`, `TeacherProfile`, `Guardian`, `GuardianLink`, `Accommodation` |
| Organisation | `Department`, `Term`, `Course`, `Section`, `SectionMeeting`, `Enrollment`, `GradeSnapshot` |
| Curriculum | `Unit`, `Lesson`, `LessonSection`, `LessonMarker`, `LessonResource`, `SectionPacing` |
| Learning | `LessonProgress`, `LessonNote` |
| Work | `GradeCategory`, `Assignment`, `Rubric`, `RubricCriterion`, `RubricLevel`, `Submission`, `Grade`, `RubricScore` |
| Assessment | `Assessment`, `Question`, `QuestionOption`, `AssessmentAttempt`, `QuestionResponse`, `ProctorEvent` |
| Operations | `AttendanceSession`, `AttendanceRecord`, `Alert`, `InterventionAction`, `PeerTutorAssignment` |
| Communication | `Announcement`, `Conversation`, `Message`, `Notification`, `CalendarEvent`, `OfficeHour`, `OfficeHourBooking` |
| Files | `FileObject` with join tables for submissions, responses and lesson resources |
| Growth | `WaitlistEntry` — early-access requests from `/demo` |

Notable modelling decisions:

- **Grades are computed, then cached.** `Grade` records the marks; released
  grades roll up through `GradeCategory` weights into `Enrollment.currentPercent`
  and are archived to `GradeSnapshot`, which is what grade-drop detection reads.
- **Assessments post through assignments.** An `Assessment` optionally links to
  an `Assignment`, so an online quiz lands in the same gradebook as a lab report.
- **Timeliness is explicit.** `Submission.timeliness` distinguishes on-time,
  grace-period and late work, computed against `Assignment.graceMinutes`.
- **Attendance is per class meeting.** One `AttendanceSession` per section per
  date, with a record for every enrolled student.

## API

tRPC routers live in `src/server/api/routers/` and are mounted in
`src/server/api/root.ts`.

| Router | What it covers |
| --- | --- |
| `user` | current user, profiles, roster search, accommodations |
| `course` | sections, rosters, syllabus tree, pacing, enrolment |
| `lesson` | lesson delivery, video progress and resume, timestamped notes, authoring |
| `assignment` | assignment + rubric authoring, publishing, student "due soon" |
| `submission` | drafts, submitting, attachments, missing-work sweep |
| `grading` | priority grading queue, rubric grading, release, gradebook matrix |
| `assessment` | attempts, autosave, flagging, proctor events, auto-scoring, item analysis |
| `attendance` | daily period schedule, taking attendance, rates |
| `alert` | at-risk detection and logged interventions |
| `dashboard` | teacher command center, student overview and Star Points aggregates |
| `announcement` / `message` / `notification` | communication |
| `calendar` | agenda, timetable, office hours and bookings |

### Authorization

`src/server/api/trpc.ts` defines role-gated procedures — `teacherProcedure`,
`studentProcedure`, `adminProcedure` and `staffOrStudentProcedure` — on top of
the standard `publicProcedure` / `protectedProcedure`. Admins pass every role
check. Session-level roles are not enough on their own, so resolvers also call
the row-level guards in `src/server/lib/permissions.ts`:

- `assertTeachesSection` — the caller teaches this section
- `assertEnrolled` / `assertSectionAccess` — active enrolment, or either side
- `assertStudentAccess` — the student themselves, or a teacher who has them
- `assertLessonAccess`, `assertSubmissionAccess`

Two rules worth knowing: correct answers are never selected while an attempt is
in progress (`assessment.getAttempt` omits `isCorrect`), and students only see a
grade once its status is `RELEASED`.

## Business logic

Shared server logic lives in `src/server/lib/`:

- `grading.ts` — letter scale, 4.0 GPA with AP/honors weighting, weighted
  section averages, late classification, grade distribution buckets
- `permissions.ts` — the row-level guards above
- `dates.ts` — school-day helpers: weekday, term week, odd/even rotation
- `stars.ts` — Star Points: one star per point on released grades for any
  graded work (derived, never stored) and the reward tiers they unlock
- `src/server/uploadthing.ts` — UploadThing file router for submission
  uploads; needs `UPLOADTHING_TOKEN`

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run db:generate` | create and apply a migration |
| `npm run db:migrate` | apply migrations (deploy) |
| `npm run db:seed` | load the demo school |
| `npm run db:studio` | browse the database |
| `npm run check` | lint + typecheck |

## Authentication

NextAuth v5 with the Prisma adapter and database sessions. The session callback
in `src/server/auth/config.ts` attaches `role`, `studentId` and `teacherId` to
`session.user`. The scaffold ships the Discord provider — swap it for your
school's SSO and set `AUTH_*` in `.env` accordingly.
