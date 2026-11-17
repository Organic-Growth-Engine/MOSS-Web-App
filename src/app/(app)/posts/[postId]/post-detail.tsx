"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Film, Image as ImageIcon, PenLine, RotateCw } from "lucide-react";
import { toast } from "sonner";

import { errorMessage, isApiError } from "@/lib/api/errors";
import {
  aspectLabel,
  destinationFormatLabel,
  formatBytes,
  formatDuration,
  formatInTz,
  mediaFormatLabel,
  platformName,
  postStatusLabel,
  timezoneLabel,
} from "@/lib/format";
import type { Destination, DestinationStatus } from "@/lib/api/types";
import { usePost, useRetryDestination, useSocialAccounts } from "@/lib/api/hooks/queries";
import { useWorkspace } from "@/lib/api/hooks/workspace-context";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { PostActions, isEditable } from "@/components/posts/post-actions";
import { statusTone } from "@/components/posts/post-status";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformTile } from "@/components/shared/platform-icon";
import { ErrorState, LoadingBlock } from "@/components/shared/query-state";
import { StatusPill, type Tone } from "@/components/shared/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";

const destinationTone: Record<DestinationStatus, Tone> = {
  queued: "neutral",
  scheduled: "primary",
  publishing: "info",
  published: "success",
  failed: "danger",
};
const destinationLabel: Record<DestinationStatus, string> = {
  queued: "Queued",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
};

export function PostDetail({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const router = useRouter();
  const post = usePost(postId);
  const tz = useWorkspace().data?.timezone ?? "UTC";

  const back = (
    <Link href="/posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden /> All posts
    </Link>
  );

  if (post.isPending) {
    return (
      <div className="space-y-6">
        {back}
        <LoadingBlock className="h-16 max-w-lg" />
        <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
          <LoadingBlock className="h-64" />
          <LoadingBlock className="h-64" />
        </div>
      </div>
    );
  }
  if (post.isError) {
    return (
      <div className="space-y-6">
        {back}
        <ErrorState
          title={isApiError(post.error, "NOT_FOUND") ? "This post doesn't exist" : "We couldn't load this post"}
          error={post.error}
          onRetry={isApiError(post.error, "NOT_FOUND") ? undefined : () => post.refetch()}
        />
      </div>
    );
  }

  const p = post.data;
  const when = p.publishAt
    ? `${p.status === "published" || p.status === "partially_published" ? "Published" : p.status === "draft" ? "Planned for" : "Publishes"} ${formatInTz(p.publishAt, tz, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
    : "Not scheduled";

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title={p.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusPill tone={statusTone[p.status]} dot>
              {postStatusLabel[p.status]}
            </StatusPill>
            {when}
          </span>
        }
        actions={
          <>
            {isEditable(p) && (
              <Link href={`/compose?postId=${p.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                <PenLine aria-hidden /> Edit post
              </Link>
            )}
            <PostActions post={p} showOpen={false} onDeleted={() => router.push("/posts")} />
          </>
        }
      />

      <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">Caption</PanelTitle>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">
              {p.caption || <span className="text-muted-foreground">No caption yet.</span>}
            </p>
            {p.link && (
              <a href={p.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                {p.link} <ExternalLink className="size-3" aria-hidden />
              </a>
            )}
          </Panel>
          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">Media</PanelTitle>
            {p.media.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No media attached.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {p.media.map((m) => {
                  const Icon = m.kind === "video" ? Film : ImageIcon;
                  return (
                    <li key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{m.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[mediaFormatLabel(m.format), formatBytes(m.sizeBytes), formatDuration(m.durationSeconds), `${m.width} × ${m.height}`, aspectLabel(m.width, m.height)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">Details</PanelTitle>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Created by</dt>
              <dd>{p.createdBy.name}</dd>
              <dt className="text-muted-foreground">Last edited</dt>
              <dd>{formatInTz(p.updatedAt, tz, { dateStyle: "medium", timeStyle: "short" })}</dd>
              <dt className="text-muted-foreground">Timezone</dt>
              <dd>{timezoneLabel(tz, p.publishAt ? new Date(p.publishAt) : new Date(p.updatedAt), false)}</dd>
            </dl>
          </Panel>
        </div>

        <Panel className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <PanelTitle className="text-sm">Destinations</PanelTitle>
            <span className="text-xs text-muted-foreground">
              {p.destinations.filter((d) => d.status === "published").length} of {p.destinations.length} published
            </span>
          </div>
          {p.destinations.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No destinations selected yet.</p>
          ) : (
            <ul className="mt-3 divide-y">
              {p.destinations.map((d) => (
                <DestinationRow key={d.id} postId={p.id} destination={d} tz={tz} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function DestinationRow({ postId, destination: d, tz }: { postId: string; destination: Destination; tz: string }) {
  const retry = useRetryDestination();
  const account = useSocialAccounts().data?.data.find((a) => a.id === d.accountId);
  const needsReconnect = account && (account.status === "expired" || account.status === "not_connected");
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <PlatformTile platform={d.platform} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {platformName(d.platform)} · {destinationFormatLabel[d.format]}
          </p>
          <p className="text-xs text-muted-foreground">
            {d.accountLabel}
            {d.publishedAt && ` · ${formatInTz(d.publishedAt, tz, { hour: "numeric", minute: "2-digit", second: "2-digit" })}`}
          </p>
        </div>
        <StatusPill tone={destinationTone[d.status]} dot>
          {destinationLabel[d.status]}
        </StatusPill>
      </div>
      {d.error && (
        <div className="mt-3 ml-10 rounded-lg bg-destructive-soft px-3 py-2 text-xs text-destructive">
          <p className="font-semibold">{d.error.title}</p>
          <p className="mt-0.5 opacity-90">{d.error.detail}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {needsReconnect && (
              <Link href="/accounts" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                Reconnect {platformName(d.platform)}
              </Link>
            )}
            <Button
              size="sm"
              variant={needsReconnect ? "ghost" : "outline"}
              disabled={retry.isPending}
              onClick={() =>
                retry.mutate(
                  { postId, destinationId: d.id },
                  { onError: (e) => toast.error(errorMessage(e)), onSuccess: () => toast.success("Retrying…") },
                )
              }
            >
              <RotateCw aria-hidden /> {retry.isPending ? "Retrying…" : "Retry"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
