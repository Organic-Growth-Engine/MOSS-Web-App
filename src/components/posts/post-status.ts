import type { PostStatus } from "@/lib/api/types"
import type { Tone } from "@/components/shared/status-pill"

export const statusTone: Record<PostStatus, Tone> = {
  draft: "neutral",
  scheduled: "primary",
  published: "success",
  partially_published: "warning",
  failed: "danger",
  publishing: "info",
}
