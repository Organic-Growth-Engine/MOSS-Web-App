import {
  LayoutDashboard,
  Workflow,
  History,
  Plug,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

// Placeholder navigation — replace with the sections from the Figma design.
export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Workflows", href: "/workflows", icon: Workflow },
  { title: "Runs", href: "/runs", icon: History },
  { title: "Integrations", href: "/integrations", icon: Plug },
]

export const secondaryNav: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings },
]
