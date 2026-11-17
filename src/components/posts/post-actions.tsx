"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import { errorMessage } from "@/lib/api/errors"
import type { Post } from "@/lib/api/types"
import { useDeletePost, useDuplicatePost } from "@/lib/api/hooks/queries"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export const isEditable = (post: Pick<Post, "status">) => post.status === "draft" || post.status === "scheduled"

/** Open / Edit / Duplicate / Delete for one post (Posts row menu and post detail). */
export function PostActions({
  post,
  showOpen = true,
  className,
  onDeleted,
}: {
  post: Post
  showOpen?: boolean
  className?: string
  onDeleted?: () => void
}) {
  const router = useRouter()
  const duplicate = useDuplicatePost()
  const remove = useDeletePost()
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More actions for ${post.title}`}
          className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), className)}
        >
          <MoreHorizontal aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {showOpen && <DropdownMenuItem onClick={() => router.push(`/posts/${post.id}`)}>Open</DropdownMenuItem>}
          {isEditable(post) && (
            <DropdownMenuItem onClick={() => router.push(`/compose?postId=${post.id}`)}>Edit</DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() =>
              duplicate.mutate(post.id, {
                onSuccess: (copy) => {
                  toast.success("Duplicated as a new draft.")
                  router.push(`/compose?postId=${copy.id}`)
                },
                onError: (e) => toast.error(errorMessage(e)),
              })
            }
          >
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this post?"
        description={
          post.status === "published" || post.status === "partially_published"
            ? "It's removed from Origin only. Anything already live on your platforms stays up."
            : "This can't be undone."
        }
        confirmLabel="Delete post"
        pending={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : undefined}
        onConfirm={() =>
          remove.mutate(post.id, {
            onSuccess: () => {
              setConfirming(false)
              toast.success("Post deleted.")
              onDeleted?.()
            },
          })
        }
      />
    </>
  )
}
