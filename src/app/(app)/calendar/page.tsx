"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformRow } from "@/components/shared/platform-icon";
import { StatusPill, type Tone } from "@/components/shared/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { calendarEntries, posts } from "@/lib/data/mock";
import type { CalendarEntry } from "@/lib/data/types";

const toneByStatus: Record<CalendarEntry["status"], Tone> = {
  published: "success",
  scheduled: "primary",
  draft: "warning",
};

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date(2026, 2, 1));
  const [selectedDate, setSelectedDate] = useState("2026-03-24");
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const offset = new Date(year, monthIndex, 1).getDay();
  const cells = Array.from({ length: 42 }, (_, index) => index - offset + 1);
  const monthLabel = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const selectedEntries = calendarEntries.filter(
    (entry) => entry.date === selectedDate,
  );
  const upcoming = calendarEntries
    .filter((entry) => entry.status === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date));
  const moveMonth = (amount: number) =>
    setMonth(new Date(year, monthIndex + amount, 1));
  const dateKey = (day: number) =>
    `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your content, in rhythm."
        description="A little planning makes room for good ideas."
        actions={
          <Link href="/compose" className={buttonVariants()}>
            <Plus aria-hidden /> Create post
          </Link>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="min-w-40 text-lg font-semibold">{monthLabel}</h2>
          <Button
            aria-label="Previous month"
            variant="outline"
            size="icon-sm"
            onClick={() => moveMonth(-1)}
          >
            <ArrowLeft aria-hidden />
          </Button>
          <Button
            aria-label="Next month"
            variant="outline"
            size="icon-sm"
            onClick={() => moveMonth(1)}
          >
            <ArrowRight aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMonth(new Date(2026, 2, 1));
              setSelectedDate("2026-03-23");
            }}
          >
            Today
          </Button>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Filter by channel"
            className="h-9 rounded-lg border bg-card px-3 text-sm"
          >
            <option>All channels</option>
            <option>Instagram</option>
            <option>LinkedIn</option>
          </select>
          <select
            aria-label="Calendar view"
            className="h-9 rounded-lg border bg-card px-3 text-sm"
          >
            <option>Month</option>
            <option>Week</option>
            <option>List</option>
          </select>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel className="overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-3">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, index) => {
              const isCurrent = day > 0 && day <= daysInMonth;
              const key = isCurrent ? dateKey(day) : "";
              const entries = calendarEntries.filter(
                (entry) => entry.date === key,
              );
              const isSelected = key === selectedDate;
              return (
                <button
                  key={index}
                  type="button"
                  disabled={!isCurrent}
                  onClick={() => setSelectedDate(key)}
                  className={`min-h-24 border-r border-b p-1.5 text-left transition-colors last:border-r-0 sm:min-h-28 sm:p-2 ${isSelected ? "bg-primary-soft/60" : "hover:bg-muted/50"} ${!isCurrent ? "bg-muted/10" : ""}`}
                >
                  <span
                    className={`inline-flex size-7 items-center justify-center rounded-full text-xs ${isSelected ? "bg-primary font-semibold text-primary-foreground" : "text-foreground"}`}
                  >
                    {isCurrent ? day : ""}
                  </span>
                  <span className="mt-1 flex flex-col gap-1">
                    {entries.slice(0, 2).map((entry) => (
                      <span
                        key={entry.id}
                        className={`hidden truncate rounded px-1.5 py-1 text-[10px] sm:block ${entry.status === "scheduled" ? "bg-primary-soft text-primary" : entry.status === "draft" ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}
                      >
                        <span className="block truncate">
                          {entry.time} · {entry.title}
                        </span>
                      </span>
                    ))}
                    {entries.length > 0 && (
                      <span className="flex gap-1 sm:hidden">
                        {entries.map((entry) => (
                          <i
                            key={entry.id}
                            className={`size-1.5 rounded-full ${entry.status === "scheduled" ? "bg-primary" : entry.status === "draft" ? "bg-warning" : "bg-success"}`}
                          />
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3 p-3 text-xs text-muted-foreground sm:p-4">
            <StatusPill tone="success" dot>
              Published
            </StatusPill>
            <StatusPill tone="primary" dot>
              Scheduled
            </StatusPill>
            <StatusPill tone="warning" dot>
              Draft
            </StatusPill>
            <span>America/Los_Angeles · PDT</span>
          </div>
        </Panel>

        <aside className="space-y-4">
          <Panel className="p-4">
            <PanelTitle className="text-base">Coming up</PanelTitle>
            {selectedEntries.length ? (
              selectedEntries.map((entry) => {
                const post = entry.postId
                  ? posts.find((item) => item.id === entry.postId)
                  : undefined;
                return (
                  <div key={entry.id} className="mt-4 border-t pt-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      {new Date(`${entry.date}T12:00:00`).toLocaleDateString(
                        "en-US",
                        { weekday: "long", month: "long", day: "numeric" },
                      )}
                    </p>
                    <StatusPill
                      className="mt-3"
                      tone={toneByStatus[entry.status]}
                      dot
                    >
                      {entry.status}
                    </StatusPill>
                    <h3 className="mt-3 text-sm font-semibold">
                      {entry.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.time} PDT
                      {post ? ` · ${post.mediaType} campaign` : ""}
                    </p>
                    <PlatformRow platforms={entry.platforms} className="mt-3" />
                  </div>
                );
              })
            ) : (
              <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">
                Nothing planned for this day yet.
              </p>
            )}
            <Link
              href="/compose"
              className={`${buttonVariants({ variant: "outline", size: "sm" })} mt-4 w-full`}
            >
              <Plus aria-hidden /> Schedule a post
            </Link>
          </Panel>
          <Panel className="p-4">
            <PanelTitle className="text-base">This week</PanelTitle>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled posts</span>
                <strong>4</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Drafts to finish</span>
                <strong>2</strong>
              </div>
              <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
                Your audience is most active Tuesday and Thursday at 10 AM.
              </p>
            </div>
          </Panel>
          <Panel className="p-4">
            <PanelTitle className="text-base">Next scheduled</PanelTitle>
            <div className="mt-3 space-y-3">
              {upcoming.slice(0, 3).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => {
                    setMonth(new Date(`${entry.date}T12:00:00`));
                    setSelectedDate(entry.date);
                  }}
                  className="block w-full text-left"
                >
                  <p className="truncate text-sm font-medium">{entry.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.date} · {entry.time}
                  </p>
                </button>
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
