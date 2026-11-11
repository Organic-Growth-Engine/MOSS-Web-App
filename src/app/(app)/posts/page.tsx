"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, MoreHorizontal, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/shared/panel";
import { PlatformRow } from "@/components/shared/platform-icon";
import { StatusPill, type Tone } from "@/components/shared/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { posts, postCounts } from "@/lib/data/mock";
import type { PostStatus } from "@/lib/data/types";

const filters: { id: "all" | PostStatus; label: string; count: number }[] = [
  { id: "all", label: "All", count: postCounts.all },
  { id: "draft", label: "Drafts", count: postCounts.draft },
  { id: "scheduled", label: "Scheduled", count: postCounts.scheduled },
  { id: "published", label: "Published", count: postCounts.published },
  { id: "failed", label: "Failed", count: postCounts.failed },
];

const statusTone: Record<PostStatus, Tone> = {
  draft: "neutral",
  scheduled: "primary",
  published: "success",
  failed: "danger",
  publishing: "info",
};

export default function PostsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const shownPosts = posts.filter((post) => {
    const matchesStatus = filter === "all" || post.status === filter;
    const matchesQuery = `${post.title} ${post.campaign} ${post.caption}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesStatus && matchesQuery;
  });

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
      <div
        className="flex gap-1 overflow-x-auto border-b"
        role="tablist"
        aria-label="Filter posts"
      >
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`mb-[-1px] flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors ${filter === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {item.label}
            <span className="text-xs opacity-70">{item.count}</span>
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search posts..."
            className="h-10 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <select
          aria-label="Filter by platform"
          className="h-10 rounded-lg border bg-card px-3 text-sm text-foreground md:w-44"
        >
          <option>All platforms</option>
          <option>Instagram</option>
          <option>LinkedIn</option>
          <option>Facebook</option>
          <option>X</option>
          <option>YouTube</option>
        </select>
        <select
          aria-label="Filter by campaign"
          className="h-10 rounded-lg border bg-card px-3 text-sm text-foreground md:w-44"
        >
          <option>All campaigns</option>
          <option>Spring collection</option>
          <option>Studio stories</option>
        </select>
        <Button variant="outline" size="sm">
          <ArrowDownToLine aria-hidden /> Export
        </Button>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="hidden grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_120px_150px_36px] items-center gap-4 border-b bg-muted/40 px-5 py-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase md:grid">
          <span>Post</span>
          <span>Destinations</span>
          <span>Status</span>
          <span>Publish date</span>
          <span />
        </div>
        {shownPosts.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-muted-foreground">
            No posts match this search.
          </div>
        ) : (
          shownPosts.map((post) => (
            <article
              key={post.id}
              className="grid gap-3 border-b p-4 last:border-0 md:grid-cols-[minmax(220px,1.4fr)_minmax(150px,1fr)_120px_150px_36px] md:items-center md:gap-4 md:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                  {post.duration ?? post.mediaType.slice(0, 3).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{post.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {post.mediaType} · {post.campaign}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 md:block">
                <PlatformRow
                  platforms={post.destinations.map(
                    (destination) => destination.platform,
                  )}
                  max={5}
                />
                <span className="ml-2 text-xs text-muted-foreground md:hidden">
                  {post.destinations.length} destinations
                </span>
              </div>
              <div>
                <StatusPill tone={statusTone[post.status]} dot>
                  {post.status[0].toUpperCase() + post.status.slice(1)}
                </StatusPill>
              </div>
              <div className="text-xs text-muted-foreground">
                {post.publishAt
                  ? new Date(post.publishAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : (post.editedLabel ?? "Not scheduled")}
              </div>
              <Button
                aria-label={`More actions for ${post.title}`}
                variant="ghost"
                size="icon-sm"
                className="hidden md:inline-flex"
              >
                <MoreHorizontal aria-hidden />
              </Button>
            </article>
          ))
        )}
        <div className="flex flex-col gap-3 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>
            Showing {shownPosts.length} of {postCounts.all} posts
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button size="sm" aria-current="page">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
