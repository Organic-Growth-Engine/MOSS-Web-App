/** In-memory stand-in for the workspace event stream (GET /workspaces/{id}/events). */
import { newId } from "@/lib/api/mocks/util"
import type { RealtimeEvent } from "@/lib/api/types"

type Listener = (event: RealtimeEvent) => void
const listeners = new Map<string, Set<Listener>>()

export function emit(workspaceId: string, event: Omit<RealtimeEvent, "id" | "occurredAt">) {
  const full = { id: newId("evt"), occurredAt: new Date().toISOString(), ...event } as RealtimeEvent
  listeners.get(workspaceId)?.forEach((l) => l(full))
}

export function subscribe(workspaceId: string, listener: Listener) {
  if (!listeners.has(workspaceId)) listeners.set(workspaceId, new Set())
  listeners.get(workspaceId)!.add(listener)
  return () => {
    listeners.get(workspaceId)?.delete(listener)
  }
}
