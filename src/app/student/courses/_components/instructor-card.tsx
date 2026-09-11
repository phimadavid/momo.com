import Link from "next/link";

import { clock } from "~/app/_components/format";
import { ChatIcon } from "~/app/_components/icons";
import { Avatar, Card } from "~/app/_components/ui";
import {
  teacherFullName,
  teacherShortName,
} from "~/app/student/_components/format";
import { dayOfWeekOf } from "~/server/lib/dates";
import type { RouterOutputs } from "~/trpc/react";

type Section = RouterOutputs["course"]["mySections"][number];
type Slot = RouterOutputs["calendar"]["officeHours"][number];

const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export function InstructorCard({
  section,
  officeHours,
  now,
}: {
  section: Section;
  officeHours: Slot[];
  now: Date;
}) {
  const teacher = section.teacher.user;
  const today = dayOfWeekOf(now);
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;

  const todays = officeHours.filter((slot) => slot.dayOfWeek === today);
  const inSession = todays.some(
    (slot) => slot.startTime <= nowTime && nowTime < slot.endTime,
  );
  const laterToday = todays.find((slot) => nowTime < slot.startTime);

  const availability = inSession
    ? {
        text: "In office hours now",
        textTone: "text-emerald-700",
        dotTone: "bg-emerald-500",
      }
    : laterToday
      ? {
          text: `Office hours today at ${clock(laterToday.startTime)}`,
          textTone: "text-amber-700",
          dotTone: "bg-amber-500",
        }
      : {
          text:
            officeHours.length > 0
              ? "Holds weekly office hours"
              : "No office hours posted",
          textTone: "text-muted",
          dotTone: "bg-slate-400",
        };
  const { textTone, dotTone } = availability;

  // Slots sharing a time and place collapse into one row: "Mon / Wed / Fri".
  const rows = new Map<
    string,
    { days: string[]; time: string; where: string }
  >();
  for (const slot of officeHours) {
    const where = [slot.location, slot.meetingUrl ? "online" : null]
      .filter(Boolean)
      .join(" or ");
    const key = `${slot.startTime}|${slot.endTime}|${where}`;
    const row = rows.get(key) ?? {
      days: [],
      time: `${clock(slot.startTime)} – ${clock(slot.endTime)}`,
      where,
    };
    row.days.push(DAY_SHORT[slot.dayOfWeek] ?? slot.dayOfWeek);
    rows.set(key, row);
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <Avatar name={teacher.name} size="lg" />
        <div className="min-w-0">
          <p className="text-ink truncate text-sm font-bold">
            {teacherFullName(teacher)}
          </p>
          <p className="text-muted truncate text-xs">
            {section.course.name} Instructor
          </p>
          <p
            className={`mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold ${textTone}`}
          >
            <span className={`size-1.5 rounded-full ${dotTone}`} />
            {availability.text}
          </p>
        </div>
      </div>

      {rows.size > 0 && (
        <dl className="border-line bg-canvas/60 mt-4 space-y-2.5 rounded-xl border px-4 py-3 text-xs">
          {[...rows.values()].map((row) => (
            <div key={row.days.join() + row.time} className="flex gap-3">
              <dt className="text-ink w-24 shrink-0 font-semibold">
                {row.days.join(" / ")}
              </dt>
              <dd className="text-muted min-w-0">
                {row.time}
                {row.where && <span className="block">{row.where}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <Link
        href="/student/messages"
        className="border-line text-navy hover:bg-canvas mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition"
      >
        <ChatIcon className="size-4" />
        Message {teacherShortName(teacher)}
      </Link>
    </Card>
  );
}
