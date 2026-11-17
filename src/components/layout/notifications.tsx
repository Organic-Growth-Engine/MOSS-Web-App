"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, CircleAlert, CircleCheck, CircleX, Info } from "lucide-react"

import type { Notification } from "@/lib/api/types"
import { useMarkNotificationRead, useNotifications } from "@/lib/api/hooks/queries"
import { ErrorState, LoadingBlock } from "@/components/shared/query-state"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const look: Record<Notification["severity"], { icon: typeof Bell; tone: string }> = {
  warning: { icon: CircleAlert, tone: "text-warning" },
  success: { icon: CircleCheck, tone: "text-success" },
  error: { icon: CircleX, tone: "text-destructive" },
  info: { icon: Info, tone: "text-info" },
}

export function Notifications() {
  const { data, isPending, isError, error, refetch } = useNotifications()
  const markRead = useMarkNotificationRead()
  const unread = data?.meta.unreadCount ?? 0
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative inline-flex size-10 items-center justify-center rounded-lg text-foreground/80 hover:bg-muted"
        aria-label={unread ? `Notifications, ${unread} ${unread === 1 ? "needs" : "need"} attention` : "Notifications"}
      >
        <Bell className="size-5" strokeWidth={1.75} aria-hidden />
        {unread > 0 && (
          <span className="absolute top-2 right-2.5 size-2 rounded-full bg-primary ring-2 ring-background" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <p className="px-2 pt-1 pb-2 text-sm font-semibold">Notifications</p>
        {isPending ? (
          <LoadingBlock lines={3} className="p-2" />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} className="px-3 py-3 sm:px-3" />
        ) : data.data.length === 0 ? (
          <p className="px-2 pb-2 text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <ul className="space-y-1">
            {data.data.map((n) => {
              const { icon: Icon, tone } = look[n.severity]
              return (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => {
                      setOpen(false)
                      if (!n.readAt) markRead.mutate(n.id)
                    }}
                    className="flex gap-3 rounded-lg p-2 hover:bg-muted"
                  >
                    <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden />
                    <span className="text-sm">
                      <span className="block font-medium">{n.title}</span>
                      <span className="block text-xs text-muted-foreground">{n.detail}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
