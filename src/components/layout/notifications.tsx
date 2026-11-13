"use client"

import Link from "next/link"
import { Bell, CircleAlert, CircleCheck } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const items = [
  {
    icon: CircleAlert,
    tone: "text-warning",
    title: "LinkedIn authorization expired",
    detail: "Reconnect Studio North to resume scheduled publishing.",
    href: "/accounts",
  },
  {
    icon: CircleCheck,
    tone: "text-success",
    title: "The spring edit is here",
    detail: "Published to 3 accounts · Today, 9 AM",
    href: "/posts/the-spring-edit",
  },
]

export function Notifications() {
  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex size-10 items-center justify-center rounded-lg text-foreground/80 hover:bg-muted"
        aria-label="Notifications, 1 needs attention"
      >
        <Bell className="size-5" strokeWidth={1.75} aria-hidden />
        <span className="absolute top-2 right-2.5 size-2 rounded-full bg-primary ring-2 ring-background" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <p className="px-2 pt-1 pb-2 text-sm font-semibold">Notifications</p>
        <ul className="space-y-1">
          {items.map((n) => (
            <li key={n.title}>
              <Link href={n.href} className="flex gap-3 rounded-lg p-2 hover:bg-muted">
                <n.icon className={`mt-0.5 size-4 shrink-0 ${n.tone}`} aria-hidden />
                <span className="text-sm">
                  <span className="block font-medium">{n.title}</span>
                  <span className="block text-xs text-muted-foreground">{n.detail}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
