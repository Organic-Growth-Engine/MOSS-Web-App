"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { apiConfig } from "@/lib/api/config";
import { now } from "@/lib/clock";
import { addDays, dateKeyInTz, formatCompact, formatNumber, formatRange, platformName, timeAgo } from "@/lib/format";
import type { Kpi, Platform } from "@/lib/api/types";
import { useAnalyticsOverview, usePlatformMetrics, useTimeseries } from "@/lib/api/hooks/queries";
import { useWorkspace, useWorkspaceId } from "@/lib/api/hooks/workspace-context";
import { analyticsService } from "@/lib/api/services/analytics-service";
import { PageHeader } from "@/components/layout/page-header";
import { ExportMenu } from "@/components/shared/export-menu";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformTile } from "@/components/shared/platform-icon";
import { ErrorState, LoadingBlock } from "@/components/shared/query-state";

type RangeId = "month" | "7d" | "30d";

const delta = (k: Kpi) =>
  `${Math.abs(k.change)}${k.changeUnit === "points" ? " pts" : "%"} vs. previous period`;

export default function AnalyticsPage() {
  const [rangeId, setRangeId] = useState<RangeId>("month");
  const [platform, setPlatform] = useState<Platform | "">("");
  const workspaceId = useWorkspaceId();
  const tz = useWorkspace().data?.timezone ?? "UTC";
  const today = dateKeyInTz(now(), tz);
  const ranges: Record<RangeId, { from: string; to: string; label: string }> = {
    month: { from: `${today.slice(0, 8)}01`, to: today, label: formatRange(`${today.slice(0, 8)}01`, today) },
    "7d": { from: addDays(today, -6), to: today, label: "Last 7 days" },
    "30d": { from: addDays(today, -29), to: today, label: "Last 30 days" },
  };
  const range = ranges[rangeId];
  const params = { from: range.from, to: range.to, platform: platform || undefined };

  const overview = useAnalyticsOverview(params);
  const series = useTimeseries({ ...params, metric: "impressions" });
  const platforms = usePlatformMetrics({ from: range.from, to: range.to });

  const points = series.data?.data ?? [];
  const peak = Math.max(1, ...points.map((p) => Math.max(p.current, p.previous)));
  const step = Math.max(1, Math.round(points.length / 6));
  const ticks = points.filter((_, i) => i % step === 0 || i === points.length - 1);
  const rows = platforms.data?.data ?? [];
  const maxEngagements = Math.max(1, ...rows.map((r) => r.engagements));
  const o = overview.data;
  const kpis = o
    ? [
        { label: "Impressions", value: formatCompact(o.kpis.impressions.value), kpi: o.kpis.impressions },
        { label: "Engagements", value: formatNumber(o.kpis.engagements.value), kpi: o.kpis.engagements },
        { label: "Engagement rate", value: `${o.kpis.engagementRate.value}%`, kpi: o.kpis.engagementRate },
        { label: "Audience", value: formatNumber(o.kpis.audience.value), kpi: o.kpis.audience },
      ]
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Understand what resonates."
        description="Small signals. Clearer decisions. A little more growth."
        actions={
          <ExportMenu
            label="Export report"
            size="default"
            filename={(format) => `analytics-${range.from}-${range.to}.${format}`}
            run={(format) => analyticsService.exportReport(workspaceId!, format, params)}
          />
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Analytics date range"
          value={rangeId}
          onChange={(event) => setRangeId(event.target.value as RangeId)}
          className="h-10 rounded-lg border bg-card px-3 text-sm"
        >
          {(Object.keys(ranges) as RangeId[]).map((id) => (
            <option key={id} value={id}>
              {ranges[id].label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by platform"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as Platform | "")}
          className="h-10 min-w-40 rounded-lg border bg-card px-3 text-sm"
        >
          <option value="">All platforms</option>
          {rows.map((item) => (
            <option key={item.platform} value={item.platform}>
              {platformName(item.platform)}
            </option>
          ))}
        </select>
        {o && (
          <span className="text-xs text-muted-foreground">
            Compared with {formatRange(o.comparisonRange.from, o.comparisonRange.to)} · Updated{" "}
            {timeAgo(o.updatedAt, now())}
          </span>
        )}
      </div>

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {overview.isError ? (
          <ErrorState className="col-span-2 xl:col-span-4" error={overview.error} onRetry={() => overview.refetch()} />
        ) : !kpis ? (
          [0, 1, 2, 3].map((i) => <LoadingBlock key={i} className="h-[108px]" />)
        ) : (
          kpis.map((item) => {
            const down = item.kpi.change < 0;
            const Arrow = down ? ArrowDownRight : ArrowUpRight;
            return (
              <Panel key={item.label} className="p-4 sm:p-5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{item.value}</p>
                <p className={`mt-2 flex items-center gap-1 text-xs ${down ? "text-destructive" : "text-success"}`}>
                  <Arrow className="size-3.5" aria-hidden />
                  {delta(item.kpi)}
                </p>
              </Panel>
            );
          })
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <PanelTitle className="text-base">A steady season of growth</PanelTitle>
              <p className="mt-1 text-xs text-muted-foreground">Daily impressions · {range.label}</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-primary" />
                Current period
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-2 rounded-full bg-primary/20" />
                Previous period
              </span>
            </div>
          </div>
          {series.isError ? (
            <ErrorState className="mt-6" error={series.error} onRetry={() => series.refetch()} />
          ) : series.isPending ? (
            <LoadingBlock className="mt-6 h-56" />
          ) : (
            <div
              style={{ "--days": points.length } as React.CSSProperties}
              className="mt-6 grid h-56 grid-cols-[repeat(12,minmax(0,1fr))] items-end gap-2 border-b border-l bg-[linear-gradient(to_bottom,transparent_24%,var(--border)_25%,transparent_25.5%,transparent_49%,var(--border)_50%,transparent_50.5%,transparent_74%,var(--border)_75%,transparent_75.5%)] px-2 sm:grid-cols-[repeat(var(--days),minmax(0,1fr))] sm:gap-1"
            >
              {points.map((item) => (
                <div
                  key={item.date}
                  className="flex h-full items-end justify-center gap-px"
                  title={`${new Date(`${item.date}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric" })}: ${item.current.toLocaleString()} impressions`}
                >
                  <span
                    className="hidden w-1/2 rounded-t-sm bg-primary/20 sm:block"
                    style={{ height: `${(item.previous / peak) * 100}%` }}
                  />
                  <span
                    className="w-2/3 rounded-t-sm bg-primary sm:w-1/2"
                    style={{ height: `${(item.current / peak) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            {ticks.map((t) => (
              <span key={t.date}>{Number(t.date.slice(8))}</span>
            ))}
          </div>
          {o?.insight && <p className="mt-4 text-xs text-muted-foreground">{o.insight}</p>}
        </Panel>

        <Panel className="p-4 sm:p-5">
          <PanelTitle className="text-base">Engagement by platform</PanelTitle>
          {platforms.isError ? (
            <ErrorState className="mt-5" error={platforms.error} onRetry={() => platforms.refetch()} />
          ) : platforms.isPending ? (
            <LoadingBlock lines={8} className="mt-5" />
          ) : (
            <div className="mt-5 space-y-4">
              {rows.map((item) => (
                <div key={item.platform}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm">
                      <PlatformTile platform={item.platform} size="sm" />
                      {platformName(item.platform)}
                    </span>
                    <span className="text-xs font-medium tabular-nums">{item.engagements.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(item.engagements / maxEngagements) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="p-4 sm:p-5">
          <PanelTitle className="text-base">The bigger picture, platform by platform</PanelTitle>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-y bg-muted/30 text-[10px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Impressions</th>
                <th className="px-4 py-3 font-medium">Engagements</th>
                <th className="px-4 py-3 font-medium">Engagement rate</th>
                <th className="px-5 py-3 font-medium">Audience</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {platforms.isPending && (
                <tr>
                  <td colSpan={5} className="px-5 py-3">
                    <LoadingBlock lines={5} />
                  </td>
                </tr>
              )}
              {rows.map((item) => (
                <tr key={item.platform}>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2">
                      <PlatformTile platform={item.platform} size="sm" />
                      {platformName(item.platform)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{item.impressions.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums">{item.engagements.toLocaleString()}</td>
                  <td className="px-4 py-3 tabular-nums">{item.engagementRate}%</td>
                  <td className="px-5 py-3 tabular-nums">{item.audience.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="p-4 text-xs text-muted-foreground">
          {apiConfig.useMock.analytics && "Illustrative analytics · "}Engagement rate = engagements ÷ impressions.
          Platform metrics may report at different times.
        </p>
      </Panel>
    </div>
  );
}
