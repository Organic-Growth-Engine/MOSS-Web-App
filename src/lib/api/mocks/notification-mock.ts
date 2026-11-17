import { workspaceFor } from "@/lib/api/mocks/db"
import { subscribe } from "@/lib/api/mocks/events"
import { notificationPreferences } from "@/lib/api/mocks/fixtures"
import { fail, paginate, respond } from "@/lib/api/mocks/util"
import type { NotificationService } from "@/lib/api/services/notification-service"

export const notificationMock: NotificationService = {
  async listNotifications(id, { unread, page, pageSize } = {}) {
    const { data } = await workspaceFor(id)
    const sorted = [...data.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const items = unread ? sorted.filter((n) => !n.readAt) : sorted
    const result = paginate(items, page, pageSize)
    return respond({ ...result, meta: { ...result.meta, unreadCount: sorted.filter((n) => !n.readAt).length } })
  },

  async markRead(id, notificationId) {
    const { data } = await workspaceFor(id)
    const n = data.notifications.find((x) => x.id === notificationId)
    if (!n) return fail("NOT_FOUND", "Notification not found.")
    n.readAt ??= new Date().toISOString()
    return respond(n)
  },

  async getPreferences(id) {
    const { data, user } = await workspaceFor(id)
    data.preferences[user.id] ??= { ...notificationPreferences }
    return respond(data.preferences[user.id])
  },

  async updatePreferences(id, body) {
    const { data, user } = await workspaceFor(id)
    const keys = ["publishingResults", "accountHealth", "scheduleReminders", "weeklyInsights", "emailEnabled"] as const
    const bad = keys.filter((k) => typeof body[k] !== "boolean")
    if (bad.length)
      return fail("VALIDATION_FAILED", "Some fields need attention.", bad.map((field) => ({ field, message: "Must be true or false." })))
    data.preferences[user.id] = { ...body }
    return respond(data.preferences[user.id])
  },

  subscribe: (id, onEvent) => subscribe(id, onEvent),
}
