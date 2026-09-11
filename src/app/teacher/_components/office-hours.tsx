import {
  CalendarIcon,
  ClipboardIcon,
  ClockIcon,
} from "~/app/_components/icons";
import { clock } from "~/app/_components/format";
import { Card, CardHeader } from "~/app/_components/ui";

type OfficeHour = {
  id: string;
  startTime: string;
  endTime: string;
  mode: string;
  location: string | null;
  label: string | null;
  capacity: number;
  _count: { bookings: number };
};

type Deadline = {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  location: string | null;
};

export function OfficeHours({
  officeHours,
  deadlines,
  pacing,
  termName,
}: {
  officeHours: OfficeHour[];
  deadlines: Deadline[];
  pacing: { completedModules: number; totalModules: number; percent: number };
  termName: string;
}) {
  return (
    <Card>
      <CardHeader
        icon={<CalendarIcon className="size-[18px]" />}
        title="Instructor Office Hours"
      />

      <div className="space-y-3 p-4">
        {officeHours.length === 0 ? (
          <p className="border-line bg-canvas text-muted rounded-xl border px-4 py-3 text-xs">
            No office hours scheduled today.
          </p>
        ) : (
          officeHours.map((slot) => (
            <div
              key={slot.id}
              className="border-line bg-canvas flex items-start gap-3 rounded-xl border px-4 py-3"
            >
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <ClockIcon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-ink text-sm font-bold">
                  Today: {clock(slot.startTime)} – {clock(slot.endTime)}
                </p>
                <p className="text-muted mt-0.5 text-xs">
                  {slot.label ?? "Office hours"}
                  {slot.location && `: ${slot.location}`} (
                  {slot._count.bookings} of {slot.capacity} reserved)
                </p>
              </div>
            </div>
          ))
        )}

        {deadlines.map((deadline) => (
          <div
            key={deadline.id}
            className="border-line bg-canvas flex items-start gap-3 rounded-xl border px-4 py-3"
          >
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <ClipboardIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-ink text-sm font-bold">{deadline.title}</p>
              <p className="text-muted mt-0.5 text-xs">
                {deadline.description ? `${deadline.description}: ` : ""}
                {deadline.startAt.toLocaleDateString("en-US", {
                  weekday: "long",
                })}
                ,{" "}
                {deadline.startAt.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-line border-t px-4 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-ink text-xs font-bold">
            {termName} curriculum pacing
          </p>
          <p className="text-brand text-xs font-semibold">
            {pacing.completedModules} of {pacing.totalModules} modules •{" "}
            {pacing.percent}%
          </p>
        </div>
        <div
          className="bg-line mt-2 h-2 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={pacing.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Curriculum pacing"
        >
          <div
            className="to-brand h-full rounded-full bg-gradient-to-r from-teal-500"
            style={{ width: `${pacing.percent}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
