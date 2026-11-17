"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { apiConfig } from "@/lib/api/config"
import { errorMessage } from "@/lib/api/errors"
import { refreshSession } from "@/lib/api/http"
import { useCreateWorkspace } from "@/lib/api/hooks/queries"
import { useRealtimeUpdates } from "@/lib/api/hooks/realtime"
import { useCurrentUser, useWorkspaceSelection } from "@/lib/api/hooks/workspace-context"
import { identityService } from "@/lib/api/services/identity-service"
import { session } from "@/lib/api/session"
import { PageHeader } from "@/components/layout/page-header"
import { Panel } from "@/components/shared/panel"
import { ErrorState } from "@/components/shared/query-state"
import { Button } from "@/components/ui/button"

/** A signed-in user with no workspace (e.g. a brand-new Google sign-up) creates one first. */
function RealtimeUpdates() {
  useRealtimeUpdates()
  return null
}

export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const me = useCurrentUser()
  const create = useCreateWorkspace()
  const select = useWorkspaceSelection((s) => s.select)
  const queryClient = useQueryClient()
  const [name, setName] = useState("")

  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />
  if (!me.data) return children
  if (me.data.memberships.length > 0)
    return (
      <>
        <RealtimeUpdates />
        {children}
      </>
    )

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${me.data.name.split(" ")[0]}.`} description="Let’s set up your first workspace." />
      <Panel className="max-w-md">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            const ws = await create.mutateAsync({ name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
            if (apiConfig.useMock.identity) session.set(await identityService.exchangeToken({ grantType: "refresh_token" }))
            else await refreshSession()
            select(ws.id)
            await queryClient.invalidateQueries()
          }}
        >
          <label className="block text-xs font-medium">
            Workspace name
            <input
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your brand or team"
              className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm"
            />
          </label>
          {create.isError && <p className="text-xs text-destructive">{errorMessage(create.error)}</p>}
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            {create.isPending ? "Creating…" : "Create workspace"}
          </Button>
        </form>
      </Panel>
    </div>
  )
}
