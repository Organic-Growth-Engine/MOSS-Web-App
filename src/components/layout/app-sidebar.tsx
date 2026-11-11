"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowUpRight, CircleHelp } from "lucide-react"

import { cn } from "@/lib/utils"
import { isActive, mainNav } from "@/config/nav"
import { accounts, usedAccountSlots, workspace } from "@/lib/data/mock"
import { Logo } from "@/components/shared/logo"
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher"

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {mainNav.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-foreground/80 hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
            <span>{item.title}</span>
            {item.badge !== undefined && (
              <span className="text-xs font-normal text-muted-foreground">{item.badge}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

export function PlanCard() {
  const total = workspace.plan.accountSlots
  const needsReconnect = accounts.filter((a) => a.status === "expired").length
  return (
    <div className="rounded-xl bg-muted/70 p-4 text-sm">
      <p className="font-semibold">A little more room.</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {usedAccountSlots} of {total} social accounts connected.
        {needsReconnect > 0 && <> {needsReconnect} needs reconnect.</>}
      </p>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={usedAccountSlots}
        aria-label="Account slots used"
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${(usedAccountSlots / total) * 100}%` }} />
      </div>
      <Link
        href="/settings?tab=billing"
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
      >
        Manage your plan <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-sidebar px-4 pt-6 pb-4 lg:flex">
      <div className="px-3">
        <Logo />
      </div>
      <div className="mt-6">
        <WorkspaceSwitcher />
      </div>
      <div className="mt-6 flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <div className="mt-4 space-y-4">
        <PlanCard />
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-md px-3 py-1 text-[13px] text-muted-foreground hover:text-foreground"
        >
          <CircleHelp className="size-4" aria-hidden /> Help &amp; resources
        </Link>
      </div>
    </aside>
  )
}
