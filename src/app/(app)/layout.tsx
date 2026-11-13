import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar, MobileHeader, MobileTabBar } from "@/components/layout/app-header"

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:pl-56">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <AppSidebar />
      <AppTopbar />
      <MobileHeader />
      <main
        id="main"
        className="mx-auto w-full max-w-[1280px] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-10 lg:pb-12"
      >
        {children}
      </main>
      <MobileTabBar />
    </div>
  )
}
