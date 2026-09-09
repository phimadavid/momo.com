import { alertRouter } from "~/server/api/routers/alert";
import { announcementRouter } from "~/server/api/routers/announcement";
import { assessmentRouter } from "~/server/api/routers/assessment";
import { assignmentRouter } from "~/server/api/routers/assignment";
import { attendanceRouter } from "~/server/api/routers/attendance";
import { calendarRouter } from "~/server/api/routers/calendar";
import { courseRouter } from "~/server/api/routers/course";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { gradingRouter } from "~/server/api/routers/grading";
import { lessonRouter } from "~/server/api/routers/lesson";
import { messageRouter } from "~/server/api/routers/message";
import { notificationRouter } from "~/server/api/routers/notification";
import { submissionRouter } from "~/server/api/routers/submission";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * The primary router for the Momo Smart LMS API.
 *
 *   user          identity, profiles, roster search
 *   course        sections, rosters, syllabus, enrolment
 *   lesson        lesson delivery, video progress, notes
 *   assignment    assignment + rubric authoring, "due soon"
 *   submission    student submissions and attachments
 *   grading       priority queue, rubric grading, gradebook
 *   assessment    timed online assessments and proctoring
 *   attendance    period attendance and daily rates
 *   alert         at-risk detection and interventions
 *   dashboard     teacher command center + student overview
 *   announcement  section and school announcements
 *   message       direct messaging
 *   notification  in-app notification feed
 *   calendar      agenda, timetable and office hours
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  course: courseRouter,
  lesson: lessonRouter,
  assignment: assignmentRouter,
  submission: submissionRouter,
  grading: gradingRouter,
  assessment: assessmentRouter,
  attendance: attendanceRouter,
  alert: alertRouter,
  dashboard: dashboardRouter,
  announcement: announcementRouter,
  message: messageRouter,
  notification: notificationRouter,
  calendar: calendarRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.dashboard.teacherOverview();
 */
export const createCaller = createCallerFactory(appRouter);
