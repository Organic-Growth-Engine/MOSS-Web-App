"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { errorMessage } from "@/lib/api/errors"
import { refreshSession } from "@/lib/api/http"
import { useCreateWorkspace, useWorkspaces } from "@/lib/api/hooks/queries"
import { useWorkspace, useWorkspaceId, useWorkspaceSelection } from "@/lib/api/hooks/workspace-context"
import { apiConfig } from "@/lib/api/config"
import { identityService } from "@/lib/api/services/identity-service"
import { session } from "@/lib/api/session"
import { InitialsAvatar } from "@/components/shared/initials-avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const kindLabel = { team: "Team workspace", personal: "Personal workspace" } as const

/** New role claims only arrive with a fresh token, so refresh after creating a workspace. */
async function refreshToken() {
  if (apiConfig.useMock.identity) session.set(await identityService.exchangeToken({ grantType: "refresh_token" }))
  else await refreshSession()
}

export function WorkspaceSwitcher() {
  const { data: workspace } = useWorkspace()
  const { data: workspaces } = useWorkspaces()
  const currentId = useWorkspaceId()
  const select = useWorkspaceSelection((s) => s.select)
  const create = useCreateWorkspace()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const createWorkspace = async (event: React.FormEvent) => {
    event.preventDefault()
    const ws = await create.mutateAsync({ name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    await refreshToken()
    await queryClient.invalidateQueries()
    select(ws.id)
    setOpen(false)
    setName("")
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left hover:bg-muted/60"
          aria-label={workspace ? `Workspace: ${workspace.name}. Switch workspace` : "Switch workspace"}
        >
          <InitialsAvatar initials={workspace?.initials ?? ""} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{workspace?.name ?? " "}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {workspace ? kindLabel[workspace.kind] : " "}
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          {workspaces?.data.map((w) => (
            <DropdownMenuItem key={w.id} onClick={() => select(w.id)}>
              <InitialsAvatar initials={w.initials} size="xs" />
              {w.name}
              {w.id === currentId && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Plus />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>A separate home for another brand or team. You&apos;ll be its owner.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createWorkspace} className="space-y-4">
            <label className="block text-xs font-medium">
              Workspace name
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
              />
            </label>
            {create.isError && <p className="text-xs text-destructive">{errorMessage(create.error)}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || !name.trim()}>
                {create.isPending ? "Creating…" : "Create workspace"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
