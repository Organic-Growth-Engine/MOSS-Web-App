import { now } from "@/lib/clock"
import { addDays, daysBetween, formatRange } from "@/lib/format"
import { workspaceFor } from "@/lib/api/mocks/db"
import * as fx from "@/lib/api/mocks/fixtures"
import { csv, respond, textPdf } from "@/lib/api/mocks/util"
import type { AnalyticsService } from "@/lib/api/services/analytics-service"
import type { AnalyticsOverview, Kpi, Platform, PlatformMetrics } from "@/lib/api/types"
import { platformMeta } from "@/config/platforms"

const FIXTURE_TOTAL = 128_400

/** Daily impressions for any date: fixture values where they exist, a smooth curve elsewhere. */
function dailyImpressions(dateKey: string) {
  const cur = daysBetween("2026-03-01", dateKey)
  if (cur >= 0 && cur < fx.dailyCurrent.length) return fx.dailyCurrent[cur]
  const prev = daysBetween("2026-02-06", dateKey)
  if (prev >= 0 && prev < fx.dailyPrevious.length) return fx.dailyPrevious[prev]
  const n = daysBetween("2026-01-01", dateKey)
  return Math.round(3600 + 1400 * Math.sin(n / 3) + (n % 7) * 180)
}

const share = (platform?: Platform) =>
  platform ? fx.platformMetrics.find((p) => p.platform === platform)!.impressions / FIXTURE_TOTAL : 1

function days(from: string, to: string) {
  return Array.from({ length: daysBetween(from, to) + 1 }, (_, i) => addDays(from, i))
}

function comparison(from: string, to: string) {
  const len = daysBetween(from, to) + 1
  return { from: addDays(from, -len), to: addDays(from, -1) }
}

const kpi = (value: number, previous: number, unit: Kpi["changeUnit"] = "percent"): Kpi => ({
  value,
  previous,
  change: unit === "points" ? Math.round((value - previous) * 10) / 10 : previous ? Math.round(((value - previous) / previous) * 1000) / 10 : 0,
  changeUnit: unit,
})

const isFixtureRange = (from: string, to: string) => from === fx.analyticsOverview.range.from && to === fx.analyticsOverview.range.to

async function isDemoWorkspace(id: string) {
  const { data } = await workspaceFor(id)
  return data.workspace.id === fx.WORKSPACE_ID
}

export const analyticsMock: AnalyticsService = {
  async getOverview(id, { from, to, platform }) {
    const demo = await isDemoWorkspace(id)
    if (demo && !platform && isFixtureRange(from, to)) return respond(fx.analyticsOverview)
    const prevRange = comparison(from, to)
    const s = demo ? share(platform) : 0
    const impressions = Math.round(days(from, to).reduce((t, d) => t + dailyImpressions(d), 0) * s)
    const previous = Math.round(days(prevRange.from, prevRange.to).reduce((t, d) => t + dailyImpressions(d), 0) * s)
    const row = platform ? fx.platformMetrics.find((p) => p.platform === platform) : undefined
    const rate = demo ? (row?.engagementRate ?? 4.8) : 0
    const audience = demo ? (row?.audience ?? 24_892) : 0
    const overview: AnalyticsOverview = {
      range: { from, to },
      comparisonRange: prevRange,
      updatedAt: new Date(now().getTime() - 12 * 60_000).toISOString(),
      kpis: {
        impressions: kpi(impressions, previous),
        engagements: kpi(Math.round((impressions * rate) / 100), Math.round((previous * (rate - 0.6)) / 100)),
        engagementRate: kpi(rate, demo ? Math.round((rate - 0.6) * 10) / 10 : 0, "points"),
        audience: kpi(audience, Math.round(audience / 1.082)),
      },
      insight: demo && !platform ? "Instagram Reels drove 41% of impressions during this period." : null,
    }
    return respond(overview)
  },

  async getTimeseries(id, { from, to, platform }) {
    const s = (await isDemoWorkspace(id)) ? share(platform) : 0
    const len = daysBetween(from, to) + 1
    return respond({
      data: days(from, to).map((date) => ({
        date,
        current: Math.round(dailyImpressions(date) * s),
        previous: Math.round(dailyImpressions(addDays(date, -len)) * s),
      })),
    })
  },

  async getPlatformMetrics(id, { from, to }) {
    if (!(await isDemoWorkspace(id))) return respond({ data: [] })
    if (isFixtureRange(from, to)) return respond({ data: fx.platformMetrics })
    const scale = days(from, to).reduce((t, d) => t + dailyImpressions(d), 0) / FIXTURE_TOTAL
    const data: PlatformMetrics[] = fx.platformMetrics.map((p) => ({
      ...p,
      impressions: Math.round(p.impressions * scale),
      engagements: Math.round(p.engagements * scale),
    }))
    return respond({ data })
  },

  async getBestTimes(id) {
    await workspaceFor(id)
    return respond(fx.bestTimes)
  },

  async exportReport(id, format, params) {
    const overview = await analyticsMock.getOverview(id, params)
    const platforms = (await analyticsMock.getPlatformMetrics(id, params)).data
    const title = `Analytics · ${formatRange(params.from, params.to)}${params.platform ? ` · ${platformMeta[params.platform].name}` : ""}`
    const k = overview.kpis
    const rows: (string | number)[][] = [
      ["Platform", "Impressions", "Engagements", "Engagement rate (%)", "Audience"],
      ...platforms.map((p) => [platformMeta[p.platform].name, p.impressions, p.engagements, p.engagementRate, p.audience]),
    ]
    if (format === "csv") {
      return respond(
        csv([
          ["Metric", "Value", "Previous period", "Change"],
          ["Impressions", k.impressions.value, k.impressions.previous, `${k.impressions.change}%`],
          ["Engagements", k.engagements.value, k.engagements.previous, `${k.engagements.change}%`],
          ["Engagement rate (%)", k.engagementRate.value, k.engagementRate.previous, `${k.engagementRate.change} pts`],
          ["Audience", k.audience.value, k.audience.previous, `${k.audience.change}%`],
          [],
          ...rows,
        ])
      )
    }
    return respond(
      textPdf([
        title,
        `Compared with ${formatRange(overview.comparisonRange.from, overview.comparisonRange.to)}`,
        "",
        `Impressions: ${k.impressions.value} (${k.impressions.change}%)`,
        `Engagements: ${k.engagements.value} (${k.engagements.change}%)`,
        `Engagement rate: ${k.engagementRate.value}% (${k.engagementRate.change} pts)`,
        `Audience: ${k.audience.value} (${k.audience.change}%)`,
        "",
        ...rows.map((r) => r.join("   ")),
      ])
    )
  },
}
