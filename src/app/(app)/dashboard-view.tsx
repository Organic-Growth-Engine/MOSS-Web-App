"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleCheck,
  CircleX,
  Plus,
} from "lucide-react";

import { apiConfig } from "@/lib/api/config";
import { now } from "@/lib/clock";
import {
  addDays,
  dateKeyInTz,
  formatCompact,
  formatInTz,
  formatNumber,
  formatRange,
  formatShortDate,
  formatTime,
  platformName,
  relativeDay,
  tzAbbr,
} from "@/lib/format";
import type { Kpi, Post } from "@/lib/api/types";
import {
  useAnalyticsOverview,
  usePosts,
  usePublishingStats,
  useSocialAccounts,
  useTimeseries,
} from "@/lib/api/hooks/queries";
import { useCurrentUser, useWorkspace } from "@/lib/api/hooks/workspace-context";
import { PageHeader } from "@/components/layout/page-header";
import { Callout } from "@/components/shared/callout";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformRow, PlatformTile } from "@/components/shared/platform-icon";
import { ErrorState, LoadingBlock } from "@/components/shared/query-state";
import { StatusPill } from "@/components/shared/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";

const changeText = (k: Kpi) =>
  k.changeUnit === "points" ? `${Math.abs(k.change)} pts` : `${Math.abs(k.change)}%`;

/** "Today, 9 AM" / "Yesterday" — the activity-row style. */
function whenLabel(iso: string, tz: string, at: Date) {
  const day = relativeDay(iso, tz, at);
  if (day !== "Today") return day;
  const time = formatInTz(iso, tz, { hour: "numeric", minute: "2-digit" }).replace(":00", "");
  return `${day}, ${time}`;
}

export function DashboardView() {
  const router = useRouter();
  const today = now();
  const { data: me } = useCurrentUser();
  const { data: workspace } = useWorkspace();
  const tz = workspace?.timezone ?? "UTC";
  const todayKey = dateKeyInTz(today, tz);
  const range = { from: `${todayKey.slice(0, 8)}01`, to: todayKey };

  const overview = useAnalyticsOverview(range);
  const series = useTimeseries({ ...range, metric: "impressions" });
  const stats = usePublishingStats(range);
  const accounts = useSocialAccounts();
  const upNext = usePosts({ status: ["scheduled"], from: todayKey, sort: "publishAt", pageSize: 2 });
  const activity = usePosts({
    status: ["published", "partially_published", "failed"],
    to: todayKey,
    sort: "-publishAt",
    pageSize: 3,
  });

  const needsReconnect = accounts.data?.data.find(
    (a) => a.status === "expired" || a.status === "expires_soon",
  );
  const k = overview.data?.kpis;
  const s = stats.data;
  const metrics =
    k && s
      ? [
          { label: "Total audience", value: formatNumber(k.audience.value), kpi: k.audience, description: `across ${s.connectedPlatforms} platforms` },
          { label: "Impressions", value: formatCompact(k.impressions.value), kpi: k.impressions, description: "vs. previous period" },
          { label: "Engagement rate", value: `${k.engagementRate.value}%`, kpi: k.engagementRate, description: "vs. previous period" },
          {
            label: "Posts published",
            value: formatNumber(s.postsPublished),
            delta: `${Math.round(s.destinationSuccessRate * 100)}% success`,
            description: s.destinationsNeedingAttention
              ? `${s.destinationsNeedingAttention} destination${s.destinationsNeedingAttention === 1 ? " needs" : "s need"} attention`
              : "every destination published",
          },
        ]
      : null;

  const points = series.data?.data ?? [];
  const max = Math.max(10000, ...points.map((p) => Math.max(p.current, p.previous)));
  const ticks = [range.from, addDays(range.from, 7), addDays(range.from, 14), range.to].filter(
    (d, i, all) => d <= range.to && all.indexOf(d) === i,
  );
  const impressionsChange = k?.impressions.change ?? 0;

  return (
    <div className="space-y-6 sm:space-y-7">
      <PageHeader
        title={`A good day to grow${me ? `, ${me.name.split(" ")[0]}` : ""}.`}
        description={
          workspace
            ? `Here’s what’s happening across ${workspace.name}. · ${formatInTz(today, tz, { weekday: "long", month: "long", day: "numeric" })}`
            : " "
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push("/analytics")}>
            <CalendarDays aria-hidden /> {formatRange(range.from, range.to, true)}
          </Button>
        }
      />

      {needsReconnect && (
        <Callout
          tone="warning"
          title={`${platformName(needsReconnect.platform)} needs a quick reconnect`}
          action={
            <Link href="/accounts" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Reconnect
            </Link>
          }
        >
          {needsReconnect.status === "expired"
            ? "Your authorization has expired. Reconnect to keep scheduled posts publishing smoothly."
            : "Your authorization expires soon. Reconnect to keep scheduled posts publishing smoothly."}
        </Callout>
      )}

      <section aria-label="Performance overview" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {overview.isError || stats.isError ? (
          <ErrorState
            className="col-span-2 xl:col-span-4"
            error={overview.error ?? stats.error}
            onRetry={() => {
              overview.refetch();
              stats.refetch();
            }}
          />
        ) : !metrics ? (
          [0, 1, 2, 3].map((i) => <LoadingBlock key={i} className="h-[110px] sm:h-[122px]" />)
        ) : (
          metrics.map((metric) => {
            const down = metric.kpi ? metric.kpi.change < 0 : false;
            const Arrow = down ? ArrowDownRight : ArrowUpRight;
            return (
              <Panel key={metric.label} className="p-4 sm:p-5">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums sm:text-[28px]">{metric.value}</p>
                <p className={`mt-2 flex items-center gap-1 text-xs ${down ? "text-destructive" : "text-success"}`}>
                  <Arrow className="size-3.5" aria-hidden /> {metric.kpi ? changeText(metric.kpi) : metric.delta}
                  <span className="text-muted-foreground">{metric.description}</span>
                </p>
              </Panel>
            );
          })
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="min-w-0 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <PanelTitle className="text-base">Your audience is finding you</PanelTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Impressions across all platforms · {formatRange(range.from, range.to).replace(/, \d{4}$/, "")}
              </p>
            </div>
            {k && (
              <StatusPill tone={impressionsChange < 0 ? "danger" : "success"}>
                {impressionsChange < 0 ? "−" : "+"}
                {Math.abs(impressionsChange)}% this month
              </StatusPill>
            )}
          </div>
          {series.isError ? (
            <ErrorState className="mt-6" error={series.error} onRetry={() => series.refetch()} />
          ) : series.isPending ? (
            <LoadingBlock className="mt-6 h-48 sm:h-56" />
          ) : (
            <div
              style={{ "--days": points.length } as React.CSSProperties}
              className="mt-6 grid h-48 grid-cols-[repeat(12,minmax(0,1fr))] items-end gap-2 border-b border-l bg-[linear-gradient(to_bottom,transparent_24%,var(--border)_25%,transparent_25.5%,transparent_49%,var(--border)_50%,transparent_50.5%,transparent_74%,var(--border)_75%,transparent_75.5%)] px-2 sm:h-56 sm:grid-cols-[repeat(var(--days),minmax(0,1fr))] sm:gap-1"
            >
              {points.map(({ date, current, previous }) => (
                <div
                  key={date}
                  className="flex h-full items-end justify-center gap-px"
                  title={`${formatShortDate(`${date}T12:00:00Z`, "UTC")}: ${current.toLocaleString()} impressions`}
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
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            {ticks.map((d) => (
              <span key={d}>{formatShortDate(`${d}T12:00:00Z`, "UTC")}</span>
            ))}
          </div>
          {overview.data?.insight && (
            <p className="mt-4 text-xs text-muted-foreground">{overview.data.insight}</p>
          )}
        </Panel>

        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <PanelTitle className="text-base">Up next</PanelTitle>
            <Link href="/calendar" className="text-xs font-medium text-primary hover:underline">
              View calendar <ArrowRight className="inline size-3.5" aria-hidden />
            </Link>
          </div>
          {upNext.isError ? (
            <ErrorState className="mt-5" error={upNext.error} onRetry={() => upNext.refetch()} />
          ) : upNext.isPending ? (
            <LoadingBlock className="mt-5 h-36" />
          ) : upNext.data.data.length === 0 ? (
            <p className="mt-5 border-b pb-5 text-sm text-muted-foreground">Nothing scheduled yet.</p>
          ) : (
            upNext.data.data.map((post, i) => {
              const at = post.publishAt!;
              const platforms = post.destinations.map((d) => d.platform);
              const month = formatInTz(at, tz, { month: "short" });
              const day = formatInTz(at, tz, { day: "numeric" });
              return i === 0 ? (
                <Link key={post.id} href={`/posts/${post.id}`} className="mt-5 flex gap-3 border-b pb-5">
                  <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <span className="text-[10px] font-medium uppercase">{month}</span>
                    <span className="text-xl font-semibold">{day}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <StatusPill tone="primary" dot>
                      Scheduled
                    </StatusPill>
                    <h3 className="mt-2 truncate text-sm font-semibold">{post.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeDay(at, tz, today)} · {formatTime(at, tz)} {tzAbbr(tz, new Date(at))}
                    </p>
                    <PlatformRow platforms={platforms} className="mt-3" />
                  </div>
                </Link>
              ) : (
                <Link key={post.id} href={`/posts/${post.id}`} className="flex items-center gap-3 border-b py-4 last:border-0">
                  <div className="w-10 text-center">
                    <span className="block text-[10px] text-muted-foreground uppercase">{month}</span>
                    <span className="text-lg font-semibold">{day}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{post.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(at, tz)} · {platforms.map(platformName).join(", ")}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              );
            })
          )}
          <Link href="/compose" className={`${buttonVariants({ variant: "outline" })} mt-4 w-full`}>
            <Plus aria-hidden /> Create post
          </Link>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <PanelTitle className="text-base">Recent publishing activity</PanelTitle>
          {activity.isError ? (
            <ErrorState className="mt-3" error={activity.error} onRetry={() => activity.refetch()} />
          ) : activity.isPending ? (
            <LoadingBlock className="mt-3" lines={6} />
          ) : activity.data.data.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            <div className="mt-3 divide-y">
              {activity.data.data.map((post) => (
                <ActivityRow key={post.id} post={post} tz={tz} today={today} />
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <PanelTitle className="text-base">Account health</PanelTitle>
            <Link href="/accounts" className="text-xs font-medium text-primary">
              Manage
            </Link>
          </div>
          {accounts.isError ? (
            <ErrorState className="mt-4" error={accounts.error} onRetry={() => accounts.refetch()} />
          ) : accounts.isPending ? (
            <LoadingBlock className="mt-4" lines={5} />
          ) : (
            <div className="mt-4 space-y-3">
              {accounts.data.data
                .filter((account) => account.status !== "not_connected")
                .map((account) => {
                  const attention = account.status === "expired" || account.status === "expires_soon";
                  return (
                    <div key={account.id} className="flex items-center gap-3">
                      <PlatformTile platform={account.platform} size="sm" />
                      <span className="flex-1 text-sm">{account.displayName}</span>
                      <StatusPill tone={attention ? "warning" : "success"}>
                        {attention ? "Reconnect" : "Connected"}
                      </StatusPill>
                    </div>
                  );
                })}
            </div>
          )}
        </Panel>
      </div>
      {apiConfig.useMock.content && (
        <p className="text-center text-xs text-muted-foreground">Illustrative workspace data · {todayKey}</p>
      )}
    </div>
  );
}

function ActivityRow({ post, tz, today }: { post: Post; tz: string; today: Date }) {
  const published = post.destinations.filter((d) => d.status === "published");
  const failed = post.destinations.filter((d) => d.status === "failed");
  if (post.status === "published") {
    return (
      <div className="flex items-center gap-3 py-3">
        <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{post.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Published to {published.length} accounts · {post.publishAt ? whenLabel(post.publishAt, tz, today) : ""}
          </p>
        </div>
        <ArrowDownToLine className="size-4 text-muted-foreground" aria-hidden />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 py-3">
      <CircleX className="size-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{post.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {published.length} published · {failed.map((d) => platformName(d.platform)).join(", ")}{" "}
          {failed.length === 1 ? "needs" : "need"} a retry
        </p>
      </div>
      <Link href={`/posts/${post.id}`} className="text-xs font-medium text-primary">
        Review
      </Link>
    </div>
  );
}

