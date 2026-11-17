"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useWorkspaceId } from "@/lib/api/hooks/workspace-context"
import { notificationService } from "@/lib/api/services/notification-service"

/**
 * Keeps the UI live from GET /workspaces/{id}/events: new notifications pop up as toasts, and
 * post, account and metrics changes refresh exactly the queries they affect.
 */
export function useRealtimeUpdates() {
  const id = useWorkspaceId()
  const qc = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    if (!id) return
    return notificationService.subscribe(id, (event) => {
      switch (event.type) {
        case "notification.created": {
          qc.invalidateQueries({ queryKey: ["notifications", id] })
          const n = event.notification
          if (n) {
            const show = n.severity === "success" ? toast.success : n.severity === "info" ? toast.info : toast.warning
            show(n.title, { description: n.detail, action: { label: "View", onClick: () => router.push(n.href) } })
          }
          break
        }
        case "post.updated":
          qc.invalidateQueries({ queryKey: ["content", id] })
          qc.invalidateQueries({ queryKey: ["media", id] })
          break
        case "account.updated":
          qc.invalidateQueries({ queryKey: ["accounts", id] })
          break
        case "metrics.updated":
          qc.invalidateQueries({ queryKey: ["analytics", id] })
          qc.invalidateQueries({ queryKey: ["content", id, "publishing-stats"] })
          break
      }
    })
  }, [id, qc, router])
}
