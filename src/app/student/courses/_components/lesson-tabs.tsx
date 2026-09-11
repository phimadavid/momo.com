"use client";

import { useId, useState } from "react";

import {
  BookOpenIcon,
  CheckCircleIcon,
  FlaskIcon,
} from "~/app/_components/icons";

export type LessonTab = {
  id: string;
  label: string;
  icon: "reading" | "lab" | "check";
  /** Rendered on the server; the client only switches between panels. */
  content: React.ReactNode;
};

const ICONS = {
  reading: BookOpenIcon,
  lab: FlaskIcon,
  check: CheckCircleIcon,
};

export function LessonTabs({
  tabs,
  footer,
}: {
  tabs: LessonTab[];
  footer: React.ReactNode;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? null);
  const baseId = useId();
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <section className="border-line bg-surface shadow-card overflow-hidden rounded-2xl border">
      {active && (
        <>
          <div
            role="tablist"
            aria-label="Lesson material"
            className="border-line flex overflow-x-auto border-b"
          >
            {tabs.map((tab) => {
              const Icon = ICONS[tab.icon];
              const selected = tab.id === active.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  onClick={() => setActiveId(tab.id)}
                  className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-semibold transition ${
                    selected
                      ? "border-brand text-navy"
                      : "text-muted hover:text-ink border-transparent"
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div
            role="tabpanel"
            id={`${baseId}-panel`}
            aria-labelledby={`${baseId}-tab-${active.id}`}
            className="px-6 py-6"
          >
            {active.content}
          </div>
        </>
      )}
      {footer && (
        <div className={`px-6 pb-6 ${active ? "" : "pt-6"}`}>{footer}</div>
      )}
    </section>
  );
}
