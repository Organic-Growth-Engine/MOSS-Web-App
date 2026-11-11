import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  CircleX,
  Plus,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Callout } from "@/components/shared/callout";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformRow, PlatformTile } from "@/components/shared/platform-icon";
import { StatusPill } from "@/components/shared/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  accounts,
  analytics,
  calendarEntries,
  demoToday,
  posts,
  recentActivity,
} from "@/lib/data/mock";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  const scheduled = posts.find((post) => post.status === "scheduled");
  const scheduledEntry = calendarEntries.find(
    (entry) => entry.date === "2026-03-24",
  );
  const nextPosts = calendarEntries
    .filter((entry) => entry.status === "scheduled")
    .slice(1, 2);

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        title="A good day to grow, Maya."
        description="Here’s what’s happening across Studio North. · Monday, March 23"
        actions={
          <Button variant="outline" size="sm">
            <CalendarDays aria-hidden /> Mar 1 – 23, 2026
          </Button>
        }
      />

      <Callout
        tone="warning"
        title="LinkedIn needs a quick reconnect"
        action={
          <Link
            href="/accounts"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Reconnect
          </Link>
        }
      >
        Your authorization expires soon. Reconnect to keep scheduled posts
        publishing smoothly.
      </Callout>

      <section
        aria-label="Performance overview"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {[
          {
            label: "Total audience",
            value: "24,892",
            delta: "8.2%",
            description: "across 5 platforms",
          },
          {
            label: "Impressions",
            value: "128.4K",
            delta: "12.8%",
            description: "vs. previous period",
          },
          {
            label: "Engagement rate",
            value: "4.8%",
            delta: "0.6 pts",
            description: "vs. previous period",
          },
          {
            label: "Posts published",
            value: "32",
            delta: "98% success",
            description: "1 destination needs attention",
          },
        ].map((metric) => (
          <Panel key={metric.label} className="p-4 sm:p-5">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-[28px]">
              {metric.value}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="size-3.5" aria-hidden /> {metric.delta}
              <span className="text-muted-foreground">
                {metric.description}
              </span>
            </p>
          </Panel>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <PanelTitle className="text-base">
                Your audience is finding you
              </PanelTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Impressions across all platforms · Mar 1–23
              </p>
            </div>
            <StatusPill tone="success">+12.8% this month</StatusPill>
          </div>
          <div className="mt-6 grid h-48 grid-cols-[repeat(12,minmax(0,1fr))] items-end gap-2 border-b border-l bg-[linear-gradient(to_bottom,transparent_24%,var(--border)_25%,transparent_25.5%,transparent_49%,var(--border)_50%,transparent_50.5%,transparent_74%,var(--border)_75%,transparent_75.5%)] px-2 sm:h-56 sm:grid-cols-[repeat(23,minmax(0,1fr))] sm:gap-1">
            {analytics.daily.map(({ day, current, previous }) => {
              const max = 10000;
              return (
                <div
                  key={day}
                  className="flex h-full items-end justify-center gap-px"
                  title={`Mar ${day}: ${current.toLocaleString()} impressions`}
                >
                  <span
                    className="hidden w-1/2 rounded-t-sm bg-primary/20 sm:block"
                    style={{ height: `${(previous / max) * 100}%` }}
                  />
                  <span
                    className="w-2/3 rounded-t-sm bg-primary sm:w-1/2"
                    style={{ height: `${(current / max) * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>Mar 1</span>
            <span>Mar 8</span>
            <span>Mar 15</span>
            <span>Mar 23</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Instagram Reels drove 41% of impressions during this period.
          </p>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <PanelTitle className="text-base">Up next</PanelTitle>
            <Link
              href="/calendar"
              className="text-xs font-medium text-primary hover:underline"
            >
              View calendar{" "}
              <ArrowRight className="inline size-3.5" aria-hidden />
            </Link>
          </div>
          {scheduled && scheduledEntry && (
            <div className="mt-5 flex gap-3 border-b pb-5">
              <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-soft text-primary">
                <span className="text-[10px] font-medium uppercase">Mar</span>
                <span className="text-xl font-semibold">24</span>
              </div>
              <div className="min-w-0 flex-1">
                <StatusPill tone="primary" dot>
                  Scheduled
                </StatusPill>
                <h3 className="mt-2 truncate text-sm font-semibold">
                  {scheduled.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tomorrow · {scheduledEntry.time} PDT
                </p>
                <PlatformRow
                  platforms={scheduledEntry.platforms}
                  className="mt-3"
                />
              </div>
            </div>
          )}
          {nextPosts.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 border-b py-4 last:border-0"
            >
              <div className="w-10 text-center">
                <span className="block text-[10px] text-muted-foreground">
                  MAR
                </span>
                <span className="text-lg font-semibold">
                  {entry.date.slice(-2)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.time} ·{" "}
                  {entry.platforms
                    .map(
                      (platform) =>
                        platform[0].toUpperCase() + platform.slice(1),
                    )
                    .join(", ")}
                </p>
              </div>
              <ArrowRight
                className="size-4 text-muted-foreground"
                aria-hidden
              />
            </div>
          ))}
          <Link
            href="/compose"
            className={`${buttonVariants({ variant: "outline" })} mt-4 w-full`}
          >
            <Plus aria-hidden /> Create post
          </Link>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <PanelTitle className="text-base">
            Recent publishing activity
          </PanelTitle>
          <div className="mt-3 divide-y">
            {recentActivity.map((item) => (
              <div key={item.title} className="flex items-center gap-3 py-3">
                <CircleCheck
                  className="size-4 shrink-0 text-success"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
                <ArrowDownToLine
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              </div>
            ))}
            <div className="flex items-center gap-3 py-3">
              <CircleX className="size-4 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Meet the makers</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  4 published · LinkedIn needs a retry
                </p>
              </div>
              <Link href="/posts" className="text-xs font-medium text-primary">
                Review
              </Link>
            </div>
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <PanelTitle className="text-base">Account health</PanelTitle>
            <Link href="/accounts" className="text-xs font-medium text-primary">
              Manage
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {accounts
              .filter((account) => account.status !== "not_connected")
              .map((account) => (
                <div key={account.id} className="flex items-center gap-3">
                  <PlatformTile platform={account.platform} size="sm" />
                  <span className="flex-1 text-sm">{account.displayName}</span>
                  <StatusPill
                    tone={account.status === "expired" ? "warning" : "success"}
                  >
                    {account.status === "expired" ? "Reconnect" : "Connected"}
                  </StatusPill>
                </div>
              ))}
          </div>
        </Panel>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Illustrative workspace data · {demoToday}
      </p>
    </div>
  );
}
