"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { now } from "@/lib/clock";
import { formatDuration, formatInTz, mediaKindLabel, postStatusLabel, timeAgo } from "@/lib/format";
import type { Platform, Post, PostStatus } from "@/lib/api/types";
import { usePostCounts, usePosts } from "@/lib/api/hooks/queries";
import { useWorkspace, useWorkspaceId } from "@/lib/api/hooks/workspace-context";
import { contentService } from "@/lib/api/services/content-service";
import { LIVE_PLATFORMS, platformMeta } from "@/config/platforms";
import { useDebounced } from "@/hooks/use-debounced";
import { PageHeader } from "@/components/layout/page-header";
import { PostActions } from "@/components/posts/post-actions";
import { ExportMenu } from "@/components/shared/export-menu";
import { Panel } from "@/components/shared/panel";
import { PlatformRow } from "@/components/shared/platform-icon";
import { ErrorState } from "@/components/shared/query-state";
import { StatusPill } from "@/components/shared/status-pill";
import { statusTone } from "@/components/posts/post-status";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 8;

type FilterId = "all" | "draft" | "scheduled" | "published" | "failed";
const filters: { id: FilterId; label: string; statuses?: PostStatus[] }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts", statuses: ["draft"] },
  { id: "scheduled", label: "Scheduled", statuses: ["scheduled"] },
  { id: "published", label: "Published", statuses: ["published"] },
  // Partial failures need attention too, so they live under "Failed".
  { id: "failed", label: "Failed", statuses: ["failed", "partially_published"] },
];

const grid = "md:grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_140px_150px_36px]";

export default function PostsPage() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform | "">("");
  const [page, setPage] = useState(1);
  const q = useDebounced(query.trim());
  const workspaceId = useWorkspaceId();
  const tz = useWorkspace().data?.timezone ?? "UTC";

  const listFilters = {
    status: filters.find((f) => f.id === filter)?.statuses,
    q: q || undefined,
    platform: platform || undefined,
  };
  const posts = usePosts({ ...listFilters, page, pageSize: PAGE_SIZE });
  const counts = usePostCounts().data;
  const countFor = (id: FilterId) =>
    !counts
      ? undefined
      : id === "failed"
        ? counts.failed + counts.partiallyPublished
        : id === "all"
          ? counts.all
          : counts[id];

  const meta = posts.data?.meta;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);
  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Every post, in one place."
        description="From the first draft to the last successful destination."
        actions={
          <Link href="/compose" className={buttonVariants()}>
            <Plus aria-hidden /> Create post
          </Link>
        }
      />
      <div className="flex gap-1 overflow-x-auto border-b" role="tablist" aria-label="Filter posts">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => resetPage(setFilter)(item.id)}
            className={`mb-[-1px] flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors ${filter === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {item.label}
            <span className="text-xs opacity-70">{countFor(item.id) ?? "–"}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative min-w-0 flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => resetPage(setQuery)(event.target.value)}
            placeholder="Search posts..."
            className="h-10 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <select
          aria-label="Filter by platform"
          value={platform}
          onChange={(event) => resetPage(setPlatform)(event.target.value as Platform | "")}
          className="h-10 rounded-lg border bg-card px-3 text-sm text-foreground md:w-44"
        >
          <option value="">All platforms</option>
          {LIVE_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {platformMeta[p].name}
            </option>
          ))}
        </select>
        <ExportMenu
          filename={(format) => `posts-${new Date().toISOString().slice(0, 10)}.${format}`}
          run={(format) => contentService.exportPosts(workspaceId!, format, listFilters)}
        />
      </div>

      <Panel className="overflow-hidden p-0">
        <div className={`hidden ${grid} items-center gap-4 border-b bg-muted/40 px-5 py-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid`}>
          <span>Post</span>
          <span>Destinations</span>
          <span>Status</span>
          <span>Publish date</span>
          <span />
        </div>
        {posts.isError ? (
          <div className="p-4">
            <ErrorState error={posts.error} onRetry={() => posts.refetch()} />
          </div>
        ) : posts.isPending ? (
          Array.from({ length: PAGE_SIZE }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b p-4 md:px-5">
              <Skeleton className="size-10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/5" />
              </div>
            </div>
          ))
        ) : posts.data.data.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            {q || platform ? "No posts match this search." : "No posts here yet."}
          </div>
        ) : (
          posts.data.data.map((post) => <PostRow key={post.id} post={post} tz={tz} />)
        )}
        <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            Showing {posts.data?.data.length ?? 0} of {meta?.total ?? 0} posts
          </span>
          <nav aria-label="Pagination" className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={n === page ? "default" : "outline"}
                aria-current={n === page ? "page" : undefined}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </nav>
        </div>
      </Panel>
    </div>
  );
}

function PostRow({ post, tz }: { post: Post; tz: string }) {
  const media = post.media[0];
  const chip =
    media?.kind === "video" ? formatDuration(media.durationSeconds) : media ? "IMG" : "TXT";
  return (
    <article className={`grid gap-3 border-b p-4 last:border-0 ${grid} md:items-center md:gap-4 md:px-5`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
          {chip}
        </span>
        <div className="min-w-0">
          <Link href={`/posts/${post.id}`} className="block truncate text-sm font-medium hover:underline">
            {post.title}
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">{mediaKindLabel(post.mediaType)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 md:block">
        <PlatformRow platforms={post.destinations.map((d) => d.platform)} max={5} />
        <span className="ml-2 text-xs text-muted-foreground md:hidden">
          {post.destinations.length} destinations
        </span>
      </div>
      <div>
        <StatusPill tone={statusTone[post.status]} dot>
          {postStatusLabel[post.status]}
        </StatusPill>
      </div>
      <div className="text-xs text-muted-foreground">
        {post.status !== "draft" && post.publishAt
          ? formatInTz(post.publishAt, tz, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
          : post.status === "draft"
            ? `Edited ${timeAgo(post.updatedAt, now(), "short")}`
            : "Not scheduled"}
      </div>
      <PostActions post={post} className="hidden md:inline-flex" />
    </article>
  );
}
