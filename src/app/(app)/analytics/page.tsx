"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformTile } from "@/components/shared/platform-icon";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/data/mock";

export default function AnalyticsPage() {
  const [range, setRange] = useState("Mar 1–23, 2026");
  const peak = Math.max(...analytics.daily.map((item) => item.current));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Understand what resonates."
        description="Small signals. Clearer decisions. A little more growth."
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <ArrowDownToLine aria-hidden /> Export report
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Analytics date range"
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className="h-10 rounded-lg border bg-card px-3 text-sm"
        >
          <option>Mar 1–23, 2026</option>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
        </select>
        <select
          aria-label="Filter by platform"
          className="h-10 min-w-40 rounded-lg border bg-card px-3 text-sm"
        >
          <option>All platforms</option>
          {analytics.byPlatform.map((item) => (
            <option key={item.platform}>
              {item.platform[0].toUpperCase() + item.platform.slice(1)}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">
          Compared with Feb 6–28, 2026 · Updated 12 minutes ago
        </span>
      </div>

      <section
        aria-label="Key metrics"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {analytics.kpis.map((item) => (
          <Panel key={item.label} className="p-4 sm:p-5">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {item.value}
            </p>
            <p className="mt-2 flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="size-3.5" aria-hidden />
              {item.delta}
            </p>
          </Panel>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <PanelTitle className="text-base">
                A steady season of growth
              </PanelTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Daily impressions · {range}
              </p>
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
          <div className="mt-6 grid h-56 grid-cols-[repeat(12,minmax(0,1fr))] items-end gap-2 border-b border-l bg-[linear-gradient(to_bottom,transparent_24%,var(--border)_25%,transparent_25.5%,transparent_49%,var(--border)_50%,transparent_50.5%,transparent_74%,var(--border)_75%,transparent_75.5%)] px-2 sm:grid-cols-[repeat(23,minmax(0,1fr))] sm:gap-1">
            {analytics.daily.map((item) => (
              <div
                key={item.day}
                className="flex h-full items-end justify-center gap-px"
                title={`March ${item.day}: ${item.current.toLocaleString()} impressions`}
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
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>1</span>
            <span>5</span>
            <span>9</span>
            <span>13</span>
            <span>17</span>
            <span>21</span>
            <span>23</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {analytics.insight}
          </p>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <PanelTitle className="text-base">Engagement by platform</PanelTitle>
          <div className="mt-5 space-y-4">
            {analytics.byPlatform.map((item) => (
              <div key={item.platform}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm">
                    <PlatformTile platform={item.platform} size="sm" />
                    {item.platform[0].toUpperCase() + item.platform.slice(1)}
                  </span>
                  <span className="text-xs font-medium tabular-nums">
                    {item.engagements.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(item.engagements / 2840) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="p-4 sm:p-5">
          <PanelTitle className="text-base">
            The bigger picture, platform by platform
          </PanelTitle>
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
              {analytics.byPlatform.map((item) => (
                <tr key={item.platform}>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2">
                      <PlatformTile platform={item.platform} size="sm" />
                      {item.platform[0].toUpperCase() + item.platform.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {item.impressions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {item.engagements.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{item.rate}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {item.audience.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="p-4 text-xs text-muted-foreground">
          Illustrative analytics · Engagement rate = engagements ÷ impressions.
          Platform metrics may report at different times.
        </p>
      </Panel>
    </div>
  );
}
