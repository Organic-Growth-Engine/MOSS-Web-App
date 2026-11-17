/** notification-service: in-app notifications and per-user notification preferences. */
import { apiConfig } from "@/lib/api/config"
import { http, path } from "@/lib/api/http"
import { notificationMock } from "@/lib/api/mocks/notification-mock"
import { openEventStream } from "@/lib/api/sse"
import type {
  ListNotificationsParams,
  Notification,
  NotificationPage,
  NotificationPreferences,
  RealtimeEvent,
} from "@/lib/api/types"

export interface NotificationService {
  /** GET /workspaces/{workspaceId}/notifications */
  listNotifications(workspaceId: string, params?: ListNotificationsParams): Promise<NotificationPage>
  /** POST /workspaces/{workspaceId}/notifications/{notificationId}/read */
  markRead(workspaceId: string, notificationId: string): Promise<Notification>
  /** GET /workspaces/{workspaceId}/notification-preferences */
  getPreferences(workspaceId: string): Promise<NotificationPreferences>
  /** PUT /workspaces/{workspaceId}/notification-preferences */
  updatePreferences(workspaceId: string, body: NotificationPreferences): Promise<NotificationPreferences>
  /** GET /workspaces/{workspaceId}/events (Server-Sent Events). Returns an unsubscribe function. */
  subscribe(workspaceId: string, onEvent: (event: RealtimeEvent) => void): () => void
}

const S = "notifications" as const

const notificationApi: NotificationService = {
  listNotifications: (id, params = {}) => http.get(S, path`/workspaces/${id}/notifications`, { query: params }),
  markRead: (id, notificationId) => http.post(S, path`/workspaces/${id}/notifications/${notificationId}/read`),
  getPreferences: (id) => http.get(S, path`/workspaces/${id}/notification-preferences`),
  updatePreferences: (id, body) => http.put(S, path`/workspaces/${id}/notification-preferences`, { body }),
  subscribe: (id, onEvent) =>
    openEventStream(S, path`/workspaces/${id}/events`, {
      onMessage: (data) => {
        try {
          onEvent(JSON.parse(data) as RealtimeEvent)
        } catch {
          // ignore malformed messages
        }
      },
    }),
}

export const notificationService: NotificationService = apiConfig.useMock.notifications
  ? notificationMock
  : notificationApi
