/** analytics-service: performance metrics and reports. */
import { apiConfig } from "@/lib/api/config"
import { http, path } from "@/lib/api/http"
import { analyticsMock } from "@/lib/api/mocks/analytics-mock"
import type {
  AnalyticsOverview,
  AnalyticsRangeParams,
  BestTimes,
  DateRange,
  ExportFormat,
  List,
  PlatformMetrics,
  TimeseriesParams,
  TimeseriesPoint,
} from "@/lib/api/types"

export interface AnalyticsService {
  /** GET /workspaces/{workspaceId}/analytics/overview */
  getOverview(workspaceId: string, params: AnalyticsRangeParams): Promise<AnalyticsOverview>
  /** GET /workspaces/{workspaceId}/analytics/timeseries */
  getTimeseries(workspaceId: string, params: TimeseriesParams): Promise<List<TimeseriesPoint>>
  /** GET /workspaces/{workspaceId}/analytics/platforms */
  getPlatformMetrics(workspaceId: string, range: DateRange): Promise<List<PlatformMetrics>>
  /** GET /workspaces/{workspaceId}/analytics/best-times */
  getBestTimes(workspaceId: string): Promise<BestTimes>
  /** GET /workspaces/{workspaceId}/analytics/export */
  exportReport(workspaceId: string, format: ExportFormat, params: AnalyticsRangeParams): Promise<Blob>
}

const S = "analytics" as const

const analyticsApi: AnalyticsService = {
  getOverview: (id, params) => http.get(S, path`/workspaces/${id}/analytics/overview`, { query: params }),
  getTimeseries: (id, params) => http.get(S, path`/workspaces/${id}/analytics/timeseries`, { query: params }),
  getPlatformMetrics: (id, range) => http.get(S, path`/workspaces/${id}/analytics/platforms`, { query: range }),
  getBestTimes: (id) => http.get(S, path`/workspaces/${id}/analytics/best-times`),
  exportReport: (id, format, params) =>
    http.get(S, path`/workspaces/${id}/analytics/export`, { query: { format, ...params }, responseType: "blob" }),
}

export const analyticsService: AnalyticsService = apiConfig.useMock.analytics ? analyticsMock : analyticsApi
