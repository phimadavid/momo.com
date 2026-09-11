import { UserCheckIcon } from "~/app/_components/icons";
import { Card, CardHeader, Pill } from "~/app/_components/ui";
import type { RouterOutputs } from "~/trpc/react";

type Attendance = RouterOutputs["dashboard"]["studentOverview"]["attendance"];

export function AttendanceCard({ attendance }: { attendance: Attendance }) {
  const cells = [
    { label: "Present", value: attendance.present, className: "text-brand" },
    {
      label: "Excused",
      value: attendance.excused,
      className: "text-orange-600",
    },
    { label: "Tardies", value: attendance.tardy, className: "text-ink" },
  ];

  return (
    <Card>
      <CardHeader
        icon={<UserCheckIcon className="size-4" />}
        title="Attendance Record"
        subtitle={`${attendance.totalDays} day${attendance.totalDays === 1 ? "" : "s"} recorded this term`}
        action={
          <Pill tone={attendance.inGoodStanding ? "green" : "rose"}>
            {attendance.inGoodStanding ? "Good Standing" : "Needs Attention"}
          </Pill>
        }
      />

      <div className="grid grid-cols-3 gap-3 p-5">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="border-line bg-canvas/60 rounded-xl border px-2 py-3 text-center"
          >
            <p className={`text-xl font-extrabold ${cell.className}`}>
              {cell.value}
            </p>
            <p className="text-muted mt-1 text-[10px] font-bold tracking-wide uppercase">
              {cell.label}
            </p>
          </div>
        ))}
      </div>

      <p className="text-muted px-5 pb-5 text-center text-xs">
        {attendance.absent === 0
          ? "No unexcused absences"
          : `${attendance.absent} unexcused absence${attendance.absent === 1 ? "" : "s"}`}
        {attendance.rate !== null && ` • ${attendance.rate}% attendance`}
      </p>
    </Card>
  );
}
