"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";

import { now } from "@/lib/clock";
import {
  addDays,
  dateKeyInTz,
  formatInTz,
  formatTime,
  mediaKindLabel,
  postStatusLabel,
  timezoneLabel,
  tzAbbr,
} from "@/lib/format";
import type { CalendarEntry, Platform, PostStatus } from "@/lib/api/types";
import { useBestTimes, useCalendar, usePostCounts, usePosts } from "@/lib/api/hooks/queries";
import { useWorkspace } from "@/lib/api/hooks/workspace-context";
import { LIVE_PLATFORMS, platformMeta } from "@/config/platforms";
import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformRow } from "@/components/shared/platform-icon";
import { ErrorState, LoadingBlock } from "@/components/shared/query-state";
import { StatusPill, type Tone } from "@/components/shared/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";

type View = "month" | "week" | "list";

const toneByStatus: Record<PostStatus, Tone> = {
  published: "success",
  scheduled: "primary",
  draft: "warning",
  publishing: "info",
  partially_published: "danger",
  failed: "danger",
};
const chipClass: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  primary: "bg-primary-soft text-primary",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-destructive-soft text-destructive",
  neutral: "bg-muted text-muted-foreground",
};
const dotClass: Record<Tone, string> = {
  success: "bg-success",
  primary: "bg-primary",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground",
};

/** Day of week (0 = Sunday) of a YYYY-MM-DD key. */
const weekday = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay();
const weekStart = (key: string) => addDays(key, -weekday(key));
const keyLabel = (key: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

export default function CalendarPage() {
  const tz = useWorkspace().data?.timezone ?? "UTC";
  const todayKey = dateKeyInTz(now(), tz);
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>("month");
  const [platform, setPlatform] = useState<Platform | "">("");

  const upcoming = usePosts({ status: ["scheduled"], from: todayKey, sort: "publishAt", pageSize: 3 });
  const month = monthKey ?? `${todayKey.slice(0, 8)}01`;
  const firstUpcoming = upcoming.data?.data[0]?.publishAt;
  // Like the design: open on the next scheduled day, falling back to today.
  const selectedDate = selected ?? (firstUpcoming ? dateKeyInTz(firstUpcoming, tz) : todayKey);

  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const gridStart = addDays(month, -weekday(month));
  const range =
    view === "week"
      ? { from: weekStart(selectedDate), to: addDays(weekStart(selectedDate), 6) }
      : view === "list"
        ? { from: month, to: addDays(month, daysInMonth - 1) }
        : { from: gridStart, to: addDays(gridStart, 41) };

  const calendar = useCalendar({ ...range, platform: platform || undefined });
  const thisWeek = { from: weekStart(todayKey), to: addDays(weekStart(todayKey), 6) };
  const weekCounts = usePostCounts(thisWeek);
  const bestTimes = useBestTimes();

  const entries = calendar.data?.data ?? [];
  const byDate = (key: string) => entries.filter((e) => dateKeyInTz(e.publishAt, tz) === key);
  const selectedEntries = byDate(selectedDate);
  const monthLabel = keyLabel(month, { month: "long", year: "numeric" });
  const zone = timezoneLabel(tz, new Date(`${selectedDate}T12:00:00Z`), false);
  const abbr = (iso: string) => tzAbbr(tz, new Date(iso));

  const moveMonth = (amount: number) => {
    const d = new Date(Date.UTC(year, monthIndex - 1 + amount, 1));
    setMonthKey(d.toISOString().slice(0, 10));
  };
  const jumpTo = (key: string) => {
    setMonthKey(`${key.slice(0, 8)}01`);
    setSelected(key);
  };
  const move = (amount: number) =>
    view === "week" ? jumpTo(addDays(selectedDate, amount * 7)) : moveMonth(amount);

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
          <h2 className="min-w-40 text-lg font-semibold">
            {view === "week"
              ? `Week of ${keyLabel(range.from, { month: "short", day: "numeric" })}`
              : monthLabel}
          </h2>
          <Button aria-label={view === "week" ? "Previous week" : "Previous month"} variant="outline" size="icon-sm" onClick={() => move(-1)}>
            <ArrowLeft aria-hidden />
          </Button>
          <Button aria-label={view === "week" ? "Next week" : "Next month"} variant="outline" size="icon-sm" onClick={() => move(1)}>
            <ArrowRight aria-hidden />
          </Button>
          <Button variant="outline" size="sm" onClick={() => jumpTo(todayKey)}>
            Today
          </Button>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Filter by channel"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform | "")}
            className="h-9 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="">All channels</option>
            {LIVE_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {platformMeta[p].name}
              </option>
            ))}
          </select>
          <select
            aria-label="Calendar view"
            value={view}
            onChange={(e) => setView(e.target.value as View)}
            className="h-9 rounded-lg border bg-card px-3 text-sm"
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="list">List</option>
          </select>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel className="overflow-hidden p-0">
          {calendar.isError ? (
            <div className="p-4">
              <ErrorState error={calendar.error} onRetry={() => calendar.refetch()} />
            </div>
          ) : view === "list" ? (
            <ListView
              loading={calendar.isPending}
              entries={entries}
              tz={tz}
              selectedDate={selectedDate}
              onSelect={setSelected}
            />
          ) : (
            <>
              <div className="grid grid-cols-7 border-b bg-muted/30 text-center text-xs font-medium text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-3">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7" aria-busy={calendar.isPending}>
                {Array.from({ length: view === "week" ? 7 : 42 }, (_, index) => {
                  const key = addDays(range.from, index);
                  const isCurrent = view === "week" || key.slice(0, 7) === month.slice(0, 7);
                  const dayEntries = isCurrent ? byDate(key) : [];
                  const isSelected = key === selectedDate;
                  const shown = view === "week" ? dayEntries : dayEntries.slice(0, 2);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!isCurrent}
                      onClick={() => setSelected(key)}
                      className={`${view === "week" ? "min-h-64" : "min-h-24 sm:min-h-28"} border-r border-b p-1.5 text-left transition-colors last:border-r-0 sm:p-2 ${isSelected ? "bg-primary-soft/60" : "hover:bg-muted/50"} ${!isCurrent ? "bg-muted/10" : ""}`}
                    >
                      <span
                        className={`inline-flex size-7 items-center justify-center rounded-full text-xs ${isSelected ? "bg-primary font-semibold text-primary-foreground" : "text-foreground"}`}
                      >
                        {isCurrent ? Number(key.slice(8)) : ""}
                      </span>
                      <span className="mt-1 flex flex-col gap-1">
                        {shown.map((entry) => (
                          <span
                            key={entry.postId}
                            className={`hidden truncate rounded px-1.5 py-1 text-[10px] sm:block ${chipClass[toneByStatus[entry.status]]}`}
                          >
                            <span className="block truncate">
                              {formatTime(entry.publishAt, tz)} · {entry.title}
                            </span>
                          </span>
                        ))}
                        {dayEntries.length > shown.length && (
                          <span className="hidden px-1.5 text-[10px] text-muted-foreground sm:block">
                            +{dayEntries.length - shown.length} more
                          </span>
                        )}
                        {dayEntries.length > 0 && (
                          <span className="flex gap-1 sm:hidden">
                            {dayEntries.map((entry) => (
                              <i key={entry.postId} className={`size-1.5 rounded-full ${dotClass[toneByStatus[entry.status]]}`} />
                            ))}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <div className={`flex flex-wrap items-center gap-3 p-3 text-xs text-muted-foreground sm:p-4 ${view === "list" ? "border-t" : ""}`}>
            <StatusPill tone="success" dot>
              Published
            </StatusPill>
            <StatusPill tone="primary" dot>
              Scheduled
            </StatusPill>
            <StatusPill tone="warning" dot>
              Draft
            </StatusPill>
            <span>{zone}</span>
          </div>
        </Panel>

        <aside className="space-y-4">
          <Panel className="p-4">
            <PanelTitle className="text-base">Coming up</PanelTitle>
            {calendar.isPending ? (
              <LoadingBlock lines={4} className="mt-4 border-t pt-4" />
            ) : selectedEntries.length ? (
              selectedEntries.map((entry) => (
                <div key={entry.postId} className="mt-4 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {keyLabel(selectedDate, { weekday: "long", month: "long", day: "numeric" })}
                  </p>
                  <StatusPill className="mt-3" tone={toneByStatus[entry.status]} dot>
                    {postStatusLabel[entry.status]}
                  </StatusPill>
                  <h3 className="mt-3 text-sm font-semibold">
                    <Link href={`/posts/${entry.postId}`} className="hover:underline">
                      {entry.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTime(entry.publishAt, tz)} {abbr(entry.publishAt)}
                    {entry.mediaType ? ` · ${mediaKindLabel(entry.mediaType)}` : ""}
                  </p>
                  <PlatformRow platforms={entry.platforms} className="mt-3" />
                </div>
              ))
            ) : (
              <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">Nothing planned for this day yet.</p>
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
                <strong>{weekCounts.data?.scheduled ?? "–"}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Drafts to finish</span>
                <strong>{weekCounts.data?.draft ?? "–"}</strong>
              </div>
              {bestTimes.data && (
                <p className="pt-1 text-xs leading-relaxed text-muted-foreground">{bestTimes.data.summary}</p>
              )}
            </div>
          </Panel>
          <Panel className="p-4">
            <PanelTitle className="text-base">Next scheduled</PanelTitle>
            {upcoming.isError ? (
              <ErrorState className="mt-3" error={upcoming.error} onRetry={() => upcoming.refetch()} />
            ) : upcoming.isPending ? (
              <LoadingBlock lines={4} className="mt-3" />
            ) : upcoming.data.data.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nothing scheduled yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {upcoming.data.data.map((post) => {
                  const key = dateKeyInTz(post.publishAt!, tz);
                  return (
                    <button key={post.id} onClick={() => jumpTo(key)} className="block w-full text-left">
                      <p className="truncate text-sm font-medium">{post.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {key} · {formatTime(post.publishAt!, tz)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function ListView({
  loading,
  entries,
  tz,
  selectedDate,
  onSelect,
}: {
  loading: boolean;
  entries: CalendarEntry[];
  tz: string;
  selectedDate: string;
  onSelect: (key: string) => void;
}) {
  if (loading) return <LoadingBlock lines={8} className="p-5" />;
  if (!entries.length)
    return <p className="px-5 py-16 text-center text-sm text-muted-foreground">Nothing planned this month yet.</p>;
  return (
    <ul className="divide-y">
      {entries.map((entry) => {
        const key = dateKeyInTz(entry.publishAt, tz);
        return (
          <li key={entry.postId}>
            <button
              type="button"
              onClick={() => onSelect(key)}
              className={`grid w-full grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 text-left sm:px-5 ${key === selectedDate ? "bg-primary-soft/60" : "hover:bg-muted/50"}`}
            >
              <span className="text-xs text-muted-foreground">
                {formatInTz(entry.publishAt, tz, { weekday: "short", month: "short", day: "numeric" })}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{entry.title}</span>
                <span className="text-xs text-muted-foreground">{formatTime(entry.publishAt, tz)}</span>
              </span>
              <span className="flex items-center gap-3">
                <PlatformRow platforms={entry.platforms} className="hidden sm:inline-flex" />
                <StatusPill tone={toneByStatus[entry.status]} dot>
                  {postStatusLabel[entry.status]}
                </StatusPill>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
