import {
  BarChart3,
  CalendarDays,
  Files,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  PenLine,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  /** Which live count to show next to the item. */
  badge?: "posts"
}

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutGrid },
  { title: "Compose", href: "/compose", icon: PenLine },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Posts", href: "/posts", icon: Files, badge: "posts" },
  { title: "Media Library", href: "/media", icon: ImageIcon },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Accounts", href: "/accounts", icon: Link2 },
  { title: "Settings", href: "/settings", icon: SlidersHorizontal },
]

/** Bottom tab bar on mobile; everything else lives under "More". */
export const mobileTabs = ["/", "/calendar", "/compose", "/posts"]

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

export function titleFor(pathname: string) {
  if (pathname === "/compose") return "Create a post"
  return mainNav.find((n) => n.href !== "/" && isActive(pathname, n.href))?.title
}
