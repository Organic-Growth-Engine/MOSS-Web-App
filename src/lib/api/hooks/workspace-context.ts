"use client"

import { useQuery } from "@tanstack/react-query"
import { create } from "zustand"
import { persist } from "zustand/middleware"

import { identityService } from "@/lib/api/services/identity-service"
import { workspaceService } from "@/lib/api/services/workspace-service"

type WorkspaceSelection = { workspaceId: string | null; select: (id: string) => void }

/** The workspace the user picked in the switcher (remembered per browser). */
export const useWorkspaceSelection = create<WorkspaceSelection>()(
  persist((set) => ({ workspaceId: null, select: (workspaceId) => set({ workspaceId }) }), {
    name: "origin.workspace",
  })
)

export const meKey = ["identity", "me"] as const

export function useCurrentUser() {
  return useQuery({ queryKey: meKey, queryFn: () => identityService.getCurrentUser() })
}

/** Current workspace id: the stored selection if the user still belongs to it, else their first. */
export function useWorkspaceId(): string | undefined {
  const selected = useWorkspaceSelection((s) => s.workspaceId)
  const { data: me } = useCurrentUser()
  if (!me) return undefined
  if (selected && me.memberships.some((m) => m.workspaceId === selected)) return selected
  return me.memberships[0]?.workspaceId
}

export function useWorkspace() {
  const id = useWorkspaceId()
  return useQuery({
    queryKey: ["workspace", id, "detail"],
    queryFn: () => workspaceService.getWorkspace(id!),
    enabled: Boolean(id),
  })
}

/** Role of the current user in the current workspace. */
export function useMyRole() {
  const id = useWorkspaceId()
  const { data: me } = useCurrentUser()
  return me?.memberships.find((m) => m.workspaceId === id)?.role
}
