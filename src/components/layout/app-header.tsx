"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, MoreHorizontal, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { isActive, mainNav, mobileTabs, titleFor } from "@/config/nav"
import { useWorkspace } from "@/lib/api/hooks/workspace-context"
import { buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { NavLinks, PlanCard } from "@/components/layout/app-sidebar"
import { Notifications } from "@/components/layout/notifications"
import { SearchTrigger } from "@/components/layout/search-dialog"
import { UserMenu } from "@/components/layout/user-menu"
import { brand } from "@/config/brand"

/** Desktop top bar (lg+): search, Create post, notifications, account. */
export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 hidden h-20 items-center gap-4 border-b bg-card/95 px-8 backdrop-blur lg:flex">
      <SearchTrigger />
      <div className="ml-auto flex items-center gap-4">
        <Link href="/compose" className={buttonVariants()}>
          <Plus aria-hidden /> Create post
        </Link>
        <Notifications />
        <UserMenu />
      </div>
    </header>
  )
}

/** Mobile header (< lg): page title with the workspace underneath. */
function MobileTitle() {
  const pathname = usePathname()
  return <>{titleFor(pathname) ?? brand.name}</>
}

export function MobileHeader() {
  const { data: workspace } = useWorkspace()
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur lg:hidden">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl leading-tight">
          {/* The pathname is unknown while prerendering dynamic routes. */}
          <Suspense fallback={brand.name}>
            <MobileTitle />
          </Suspense>
        </p>
        <p className="flex items-center gap-0.5 text-xs text-muted-foreground">
          {workspace?.name ?? "\u00a0"} <ChevronDown className="size-3" aria-hidden />
        </p>
      </div>
      <Notifications />
      <UserMenu />
    </header>
  )
}

/** Mobile bottom tab bar: Dashboard, Calendar, Compose, Posts, More. */
export function MobileTabBar() {
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <CurrentTabBar />
    </Suspense>
  )
}

function CurrentTabBar() {
  return <TabBar pathname={usePathname()} />
}

function TabBar({ pathname }: { pathname: string | null }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const tabs = mainNav.filter((n) => mobileTabs.includes(n.href))
  const moreActive = pathname !== null && !tabs.some((t) => isActive(pathname, t.href))

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center gap-1 py-2 text-[11px]",
      active ? "font-semibold text-primary" : "text-muted-foreground"
    )

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {tabs.map((t) => {
          const active = pathname !== null && isActive(pathname, t.href)
          return (
            <Link key={t.href} href={t.href} className={tabClass(active)} aria-current={active ? "page" : undefined}>
              <t.icon className="size-5" strokeWidth={1.75} aria-hidden />
              {t.title}
            </Link>
          )
        })}
        <button type="button" onClick={() => setMoreOpen(true)} className={tabClass(moreActive)}>
          <MoreHorizontal className="size-5" aria-hidden />
          More
        </button>
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl p-4">
          <SheetTitle className="px-3 pt-2">Menu</SheetTitle>
          <NavLinks onNavigate={() => setMoreOpen(false)} />
          <PlanCard />
        </SheetContent>
      </Sheet>
    </>
  )
}
