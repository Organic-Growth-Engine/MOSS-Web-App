"use client"

import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { workspace } from "@/lib/data/mock"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function WorkspaceSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-muted/60"
        aria-label={`Workspace: ${workspace.name}. Switch workspace`}
      >
        <InitialsAvatar initials={workspace.initials} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{workspace.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{workspace.kind}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem>
          <InitialsAvatar initials={workspace.initials} size="xs" />
          {workspace.name}
          <Check className="ml-auto" />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
