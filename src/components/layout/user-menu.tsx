"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { LogOut, Moon, Settings, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useCurrentUser } from "@/lib/api/hooks/workspace-context"
import { session } from "@/lib/api/session"
import { identityService } from "@/lib/api/services/identity-service"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  const { data: currentUser } = useCurrentUser()
  const router = useRouter()
  const queryClient = useQueryClient()

  const logOut = async () => {
    await identityService.logout().catch(() => {})
    session.clear()
    queryClient.clear()
    router.replace("/login")
  }

  if (!currentUser) return <span aria-hidden className="size-8 rounded-full bg-muted" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label={`Account menu for ${currentUser.name}`}>
        <InitialsAvatar initials={currentUser.initials} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-sm font-semibold text-foreground">{currentUser.name}</span>
            <span className="block text-xs font-normal text-muted-foreground">{currentUser.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
          {isDark ? <Sun /> : <Moon />}
          {isDark ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logOut}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
