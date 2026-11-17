/**
 * Server-Sent Events over fetch (EventSource can't send the Authorization header).
 * Reconnects with backoff, resumes with Last-Event-ID, and refreshes the session on 401.
 */
import { baseUrlFor, type ServiceName } from "@/lib/api/config"
import { refreshSession } from "@/lib/api/http"
import { session } from "@/lib/api/session"

type Handlers = { onMessage: (data: string, event: string) => void }

export function openEventStream(service: ServiceName, path: string, { onMessage }: Handlers) {
  const controller = new AbortController()
  let lastEventId: string | undefined
  let attempt = 0

  const connect = async (): Promise<void> => {
    while (!controller.signal.aborted) {
      try {
        const headers: Record<string, string> = { Accept: "text/event-stream" }
        if (session.token) headers.Authorization = `Bearer ${session.token}`
        if (lastEventId) headers["Last-Event-ID"] = lastEventId
        const res = await fetch(`${baseUrlFor(service)}${path}`, {
          headers,
          credentials: "include",
          signal: controller.signal,
        })
        if (res.status === 401 && (await refreshSession())) continue
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)
        attempt = 0
        await read(res.body)
      } catch {
        if (controller.signal.aborted) return
      }
      // Back off 1s, 2s, 4s … up to 30s before reconnecting.
      const delay = Math.min(30_000, 1000 * 2 ** attempt++)
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  const read = async (body: ReadableStream<Uint8Array>) => {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    for (;;) {
      const { value, done } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n")
      let split: number
      while ((split = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, split)
        buffer = buffer.slice(split + 2)
        let event = "message"
        const data: string[] = []
        for (const line of block.split("\n")) {
          if (line.startsWith(":")) continue // heartbeat
          const [field, ...rest] = line.split(":")
          const val = rest.join(":").replace(/^ /, "")
          if (field === "event") event = val
          else if (field === "data") data.push(val)
          else if (field === "id") lastEventId = val
        }
        if (data.length) onMessage(data.join("\n"), event)
      }
    }
  }

  connect()
  return () => controller.abort()
}
