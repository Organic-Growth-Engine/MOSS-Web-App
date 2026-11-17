"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  Check,
  ChevronDown,
  Image as ImageIcon,
  ImagePlus,
  Plus,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";

import { errorMessage, isApiError } from "@/lib/api/errors";
import { now } from "@/lib/clock";
import {
  addDays,
  aspectLabel,
  dateKeyInTz,
  destinationFormatLabel,
  formatBytes,
  formatDuration,
  formatInTz,
  mediaFormatLabel,
  numberWord,
  timeAgo,
  timezoneLabel,
  zonedToIso,
} from "@/lib/format";
import type { MediaRef, Platform, Post, PostInput, SocialAccount, Workspace } from "@/lib/api/types";
import {
  useCreatePost,
  useMediaList,
  usePost,
  usePublishPost,
  useSchedulePost,
  useSocialAccounts,
  useSuggestHashtags,
  useUpdatePost,
  useUploadMedia,
} from "@/lib/api/hooks/queries";
import { useWorkspace } from "@/lib/api/hooks/workspace-context";
import { LIVE_PLATFORMS, defaultFormat, platformMeta } from "@/config/platforms";
import { useDebounced } from "@/hooks/use-debounced";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { isEditable } from "@/components/posts/post-actions";
import { Callout } from "@/components/shared/callout";
import { Panel, PanelTitle } from "@/components/shared/panel";
import { PlatformIcon, PlatformTile } from "@/components/shared/platform-icon";
import { ErrorState, LoadingBlock, Notice, type NoticeState } from "@/components/shared/query-state";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Override = { captionOverride: string | null; title: string | null };
type Draft = {
  title: string;
  caption: string;
  link: string;
  media: MediaRef | null;
  selected: Platform[];
  overrides: Partial<Record<Platform, Override>>;
  schedule: boolean;
  date: string;
  time: string;
};

const usable = (a?: SocialAccount) => a && (a.status === "connected" || a.status === "expires_soon");

export default function ComposePage() {
  return (
    <Suspense fallback={<LoadingBlock className="h-96" />}>
      <Compose />
    </Suspense>
  );
}

function Compose() {
  const postId = useSearchParams().get("postId");
  // A post this composer just created keeps the same composer instance (no reload, no remount).
  const [ownId, setOwnId] = useState<string | null>(null);
  const [draftSession, setDraftSession] = useState(0);
  // Navigating from ?postId=… back to a plain /compose starts a fresh composer.
  const [prevPostId, setPrevPostId] = useState(postId);
  if (postId !== prevPostId) {
    setPrevPostId(postId);
    if (!postId) {
      setOwnId(null);
      setDraftSession((n) => n + 1);
    }
  }
  const openedId = postId && postId !== ownId ? postId : null;
  const workspace = useWorkspace();
  const accounts = useSocialAccounts();
  const post = usePost(openedId);
  const failed = [workspace, accounts, ...(openedId ? [post] : [])].find((q) => q.isError);

  if (failed) return <ErrorState error={failed.error} onRetry={() => failed.refetch()} />;
  if (!workspace.data || !accounts.data || (openedId && !post.data)) {
    return (
      <div className="space-y-6">
        <LoadingBlock className="h-16 max-w-md" />
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <LoadingBlock className="h-[640px]" />
          <LoadingBlock className="h-[520px]" />
        </div>
      </div>
    );
  }
  if (openedId && post.data && !isEditable(post.data)) {
    return (
      <Callout
        tone="info"
        title="This post can't be edited"
        action={
          <Link href={`/posts/${post.data.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            View post
          </Link>
        }
      >
        It has already been published. Duplicate it to reuse the content.
      </Callout>
    );
  }
  return (
    <Composer
      key={openedId ?? `new-${draftSession}`}
      workspace={workspace.data}
      accounts={accounts.data.data}
      post={openedId ? (post.data ?? null) : null}
      onCreated={setOwnId}
    />
  );
}

function initialDraft(post: Post | null, workspace: Workspace, defaults: Record<Platform, SocialAccount | undefined>): Draft {
  const tz = workspace.timezone;
  const at = post?.publishAt ?? zonedToIso(addDays(dateKeyInTz(now(), tz), 1), "10:00", tz);
  return {
    title: post?.title ?? "",
    caption: post?.caption ?? "",
    link: post?.link ?? "",
    media: post?.media[0] ?? null,
    selected: post ? post.destinations.map((d) => d.platform) : LIVE_PLATFORMS.filter((p) => usable(defaults[p])),
    overrides: Object.fromEntries(
      (post?.destinations ?? []).map((d) => [d.platform, { captionOverride: d.captionOverride ?? null, title: d.title ?? null }]),
    ),
    schedule: post ? post.status === "scheduled" || Boolean(post.publishAt) : true,
    date: dateKeyInTz(at, tz),
    time: formatInTz(at, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

function Composer({
  workspace,
  accounts,
  post,
  onCreated,
}: {
  workspace: Workspace;
  accounts: SocialAccount[];
  post: Post | null;
  onCreated: (id: string) => void;
}) {
  const router = useRouter();
  const tz = workspace.timezone;
  const defaults = useMemo(
    () =>
      Object.fromEntries(LIVE_PLATFORMS.map((p) => [p, accounts.find((a) => a.platform === p && a.isDefault)])) as Record<
        Platform,
        SocialAccount | undefined
      >,
    [accounts],
  );
  const [draft, setDraft] = useState<Draft>(() => initialDraft(post, workspace, defaults));
  const [postId, setPostId] = useState(post?.id ?? null);
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [savedAt, setSavedAt] = useState<string | null>(post?.updatedAt ?? null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [activePreview, setActivePreview] = useState<Platform | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const create = useCreatePost();
  const update = useUpdatePost();
  const schedulePost = useSchedulePost();
  const publishPost = usePublishPost();
  const hashtags = useSuggestHashtags();
  const upload = useUploadMedia();
  const busy = [create, update, schedulePost, publishPost].some((m) => m.isPending);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const edit = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => autosave.current(), 2000);
  };
  useEffect(() => () => clearTimeout(autosaveTimer.current), []);
  const setOverride = (p: Platform, patch: Partial<Override>) =>
    edit({
      overrides: {
        ...draft.overrides,
        [p]: { captionOverride: null, title: null, ...draft.overrides[p], ...patch },
      },
    });

  const { selected, caption, media } = draft;
  const preview = activePreview && selected.includes(activePreview) ? activePreview : selected[0];
  const words = caption.trim().split(/\s+/).filter(Boolean).length;
  const formatOf = (p: Platform) => defaultFormat(p, media?.kind ?? null);
  const captionFor = (p: Platform) => draft.overrides[p]?.captionOverride ?? caption;
  const needsReconnect = selected.filter((p) => !usable(defaults[p]));
  const publishAt = zonedToIso(draft.date, draft.time, tz);
  const zone = timezoneLabel(tz, new Date(publishAt));
  const mediaProblem =
    media?.kind !== "video" && selected.includes("youtube") ? "YouTube Shorts need a video." : null;

  const body = (): PostInput => ({
    title: draft.title.trim() || "Untitled post",
    caption,
    link: draft.link.trim() || null,
    mediaIds: media ? [media.id] : [],
    publishAt: draft.schedule ? publishAt : null,
    destinations: selected.map((p) => ({
      platform: p,
      format: formatOf(p),
      captionOverride: draft.overrides[p]?.captionOverride ?? null,
      title: p === "youtube" ? (draft.overrides.youtube?.title ?? null) : null,
    })),
  });

  const persist = async () => {
    const saved = postId
      ? await update.mutateAsync({ postId, body: body() })
      : await create.mutateAsync(body());
    if (!postId) {
      setPostId(saved.id);
      onCreated(saved.id);
      router.replace(`/compose?postId=${saved.id}`, { scroll: false });
    }
    setSavedAt(new Date().toISOString());
    setDirty(false);
    return saved;
  };

  const run = async (action: "draft" | "schedule" | "publish") => {
    setNotice(null);
    try {
      const saved = await persist();
      if (action === "draft") {
        setNotice({ tone: "info", text: "Draft saved." });
      } else if (action === "schedule") {
        const scheduled = await schedulePost.mutateAsync({ postId: saved.id, publishAt });
        setStatus(scheduled.status);
        setNotice({
          tone: "success",
          text: `Scheduled for ${formatInTz(publishAt, tz, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} to ${selected.length} accounts.`,
        });
      } else {
        await publishPost.mutateAsync(saved.id);
        router.push(`/posts/${saved.id}`);
      }
    } catch (error) {
      const details = isApiError(error) ? error.details.map((d) => d.message).join(" ") : "";
      setNotice({ tone: "danger", text: `${errorMessage(error)} ${details}`.trim() });
    }
  };

  // Autosave edits to an existing draft, 2s after the last change.
  const autosave = useRef<() => void>(() => {});
  useEffect(() => {
    autosave.current = () => {
      if (dirty && postId && status === "draft" && !busy) persist().catch(() => {});
    };
  });

  const togglePlatform = (platform: Platform) =>
    edit({
      selected: selected.includes(platform)
        ? selected.filter((item) => item !== platform)
        : LIVE_PLATFORMS.filter((p) => p === platform || selected.includes(p)),
    });

  const onUpload = (file?: File) => {
    if (!file) return;
    upload.mutate(
      { file },
      {
        onSuccess: (asset) => edit({ media: asset }),
        onError: (e) => setNotice({ tone: "danger", text: errorMessage(e) }),
      },
    );
  };

  const saveLabel = busy || (dirty && postId && status === "draft")
    ? "Saving…"
    : dirty
      ? "Unsaved changes"
      : savedAt
        ? `✓ ${status === "draft" ? "Draft saved" : "Saved"} ${timeAgo(savedAt, now())}`
        : "Not saved yet";

  return (
    <div className="space-y-6 pb-3">
      <PageHeader
        title={post ? "Edit post" : "Create a post"}
        description="One idea. A thoughtful fit for every platform."
        actions={<span className="text-xs text-muted-foreground">{saveLabel}</span>}
      />
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="space-y-4">
          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">Where would you like to share?</PanelTitle>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {LIVE_PLATFORMS.map((platform) => {
                const active = selected.includes(platform);
                const account = defaults[platform];
                const unavailable = !account || account.status === "not_connected";
                return (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={active}
                    disabled={unavailable && !active}
                    title={unavailable ? `Connect ${platformMeta[platform].name} in Accounts first` : undefined}
                    onClick={() => togglePlatform(platform)}
                    className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition-colors disabled:opacity-40 ${active ? "border-primary bg-primary-soft/70 text-primary" : "bg-card hover:bg-muted/50"}`}
                  >
                    <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded border bg-card">
                      {active && <Check className="size-3" aria-hidden />}
                    </span>
                    <PlatformIcon platform={platform} className="size-5" title={platformMeta[platform].name} />
                    <span className="text-[10px] font-medium sm:text-xs">{platformMeta[platform].name}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {selected.length} accounts selected ·{" "}
              {selected.length === 0
                ? "Choose the accounts for this post"
                : needsReconnect.length
                  ? `${needsReconnect.map((p) => platformMeta[p].name).join(", ")} ${needsReconnect.length === 1 ? "needs" : "need"} reconnecting`
                  : "All connected"}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {LIVE_PLATFORMS.filter((p) => defaults[p]).map((platform) => (
                <label key={platform} className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={selected.includes(platform)}
                    disabled={defaults[platform]?.status === "not_connected" && !selected.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="accent-primary"
                  />
                  {defaults[platform]!.displayName} · {platformMeta[platform].name}
                </label>
              ))}
            </div>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">Your story</PanelTitle>
            <label className="mt-4 block text-xs font-medium">
              Internal post name
              <input
                value={draft.title}
                placeholder="Untitled post"
                onChange={(event) => edit({ title: event.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="mt-4 block text-xs font-medium">
              Caption
              <textarea
                value={caption}
                onChange={(event) => edit({ caption: event.target.value })}
                rows={6}
                placeholder="What would you like to share?"
                className="mt-1.5 w-full resize-y rounded-lg border bg-background p-3 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {words} words · {caption.length} characters
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!caption.trim() || hashtags.isPending}
                onClick={() =>
                  hashtags.mutate(
                    { caption, platforms: selected },
                    {
                      onSuccess: ({ hashtags: tags }) =>
                        edit({ caption: `${caption.replace(/(\s*#\S+)+\s*$/, "")} ${tags.join(" ")}` }),
                      onError: (e) => setNotice({ tone: "danger", text: errorMessage(e) }),
                    },
                  )
                }
              >
                <Sparkles aria-hidden /> {hashtags.isPending ? "Thinking…" : "Suggest hashtags"}
              </Button>
            </div>
            <label className="mt-4 block text-xs font-medium">
              Link
              <input
                type="url"
                value={draft.link}
                placeholder="https://"
                onChange={(e) => edit({ link: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            {media ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  {media.kind === "video" ? <Video className="size-5" aria-hidden /> : <ImageIcon className="size-5" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{media.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[mediaFormatLabel(media.format), formatBytes(media.sizeBytes), formatDuration(media.durationSeconds), `${media.width} × ${media.height}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className={`mt-1 text-xs ${mediaProblem ? "text-warning" : "text-success"}`}>
                    {mediaProblem ?? `✓ Ready for all ${selected.length} destinations`}
                  </p>
                </div>
                <Button aria-label="Remove media" variant="ghost" size="icon-sm" onClick={() => edit({ media: null })}>
                  <X aria-hidden />
                </Button>
              </div>
            ) : (
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center hover:bg-muted/30">
                <ImagePlus className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-medium">{upload.isPending ? "Uploading…" : "Add media"}</span>
                <span className="text-xs text-muted-foreground">
                  Choose a file or browse media library · JPG, PNG, MP4 or MOV
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  disabled={upload.isPending}
                  onChange={(event) => {
                    onUpload(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            )}
            <button className="mt-3 text-xs font-medium text-primary hover:underline" onClick={() => setLibraryOpen(true)}>
              ＋ {media ? "Replace with media from library" : "Add media from library"}
            </button>
            {media && <p className="mt-3 text-xs text-muted-foreground">{aspectLabel(media.width, media.height)}</p>}
          </Panel>

          <Panel className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <PanelTitle className="text-sm">Make it native to each platform</PanelTitle>
              <span className="text-xs text-muted-foreground">{selected.length} destinations</span>
            </div>
            <div className="mt-3 divide-y">
              {selected.map((platform) => {
                const name = platformMeta[platform].name;
                const override = draft.overrides[platform];
                const own = override?.captionOverride != null;
                const text = captionFor(platform);
                const limit = platformMeta[platform].charLimit ?? Infinity;
                return (
                  <details key={platform} className="group py-3" open={platform === "linkedin" || platform === "youtube"}>
                    <summary className="flex cursor-pointer list-none items-center gap-2">
                      <PlatformTile platform={platform} size="sm" />
                      <span className="flex-1 text-sm font-medium">
                        {name} · {destinationFormatLabel[formatOf(platform)]}
                      </span>
                      <span className={`text-xs ${text.length > limit ? "text-destructive" : "text-success"}`}>
                        {text.length} / {limit.toLocaleString()}
                      </span>
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <div className="mt-3 space-y-3 pl-9">
                      <textarea
                        aria-label={`${name} caption`}
                        value={text}
                        rows={2}
                        onChange={(e) =>
                          own ? setOverride(platform, { captionOverride: e.target.value }) : edit({ caption: e.target.value })
                        }
                        className="w-full rounded-lg border bg-background p-2.5 text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="accent-primary"
                          checked={own}
                          onChange={(e) => setOverride(platform, { captionOverride: e.target.checked ? caption : null })}
                        />
                        Edit for {name} only
                      </label>
                      {platform === "youtube" && (
                        <label className="block text-xs font-medium">
                          Video title
                          <input
                            value={override?.title ?? draft.title}
                            onChange={(e) => setOverride("youtube", { title: e.target.value })}
                            className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs"
                          />
                        </label>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
            {selected.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">Select at least one destination to continue.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24">
          <Panel className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <PanelTitle className="text-sm">A preview of every version</PanelTitle>
              <span className="text-xs text-muted-foreground">
                {preview ? `${selected.indexOf(preview) + 1} of ${selected.length}` : "No destination"}
              </span>
            </div>
            <div className="mt-3 flex gap-1 overflow-x-auto border-b">
              {LIVE_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  disabled={!selected.includes(platform)}
                  onClick={() => setActivePreview(platform)}
                  className={`shrink-0 border-b-2 px-2 py-2 text-xs ${preview === platform ? "border-primary text-primary" : "border-transparent text-muted-foreground"} disabled:opacity-40`}
                >
                  {platformMeta[platform].name}
                </button>
              ))}
            </div>
            {preview && (
              <>
                <p className="mt-3 text-xs text-muted-foreground">
                  {platformMeta[preview].name} · {destinationFormatLabel[formatOf(preview)]} · {defaults[preview]?.displayName}
                </p>
                <div className="mx-auto mt-3 max-w-[320px] overflow-hidden rounded-xl border bg-card">
                  <div className="flex items-center gap-2 p-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                      {workspace.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{defaults[preview]?.displayName.replace(/^@/, "")}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Just now{media?.kind === "video" ? " · Original audio" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex aspect-[4/5] items-center justify-center bg-[#1f2024] text-white">
                    {media ? (
                      <span className="flex items-center gap-2 rounded bg-black/50 px-2 py-1 text-xs">
                        {media.kind === "video" ? (
                          <>
                            <Video className="size-3.5" aria-hidden /> {formatDuration(media.durationSeconds)}
                          </>
                        ) : (
                          <>
                            <ImageIcon className="size-3.5" aria-hidden /> {media.name}
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-white/60">No media</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-3 text-xs leading-relaxed">
                      <strong>{preview === "instagram" ? `${defaults[preview]?.displayName.replace(/^@/, "")} ` : ""}</strong>
                      {captionFor(preview) || "Your caption preview will appear here."}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <PlatformTile platform={preview} size="sm" />
                        <span className="text-[10px]">Like · Comment · Share</span>
                      </span>
                      <Plus className="size-3.5" aria-hidden />
                    </div>
                  </div>
                </div>
              </>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Previews reflect visible copy and format. Final rendering may vary by platform.
            </p>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">Choose your moment</PanelTitle>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={!draft.schedule} onChange={() => edit({ schedule: false })} name="publish-time" className="accent-primary" />
                Publish now
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={draft.schedule} onChange={() => edit({ schedule: true })} name="publish-time" className="accent-primary" />
                Schedule for later
              </label>
            </div>
            {draft.schedule && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Date
                  <input
                    type="date"
                    value={draft.date}
                    min={dateKeyInTz(now(), tz)}
                    onChange={(e) => edit({ date: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-2 text-xs"
                  />
                </label>
                <label className="text-xs font-medium">
                  Time
                  <input
                    type="time"
                    value={draft.time}
                    onChange={(e) => edit({ time: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-2 text-xs"
                  />
                </label>
                <div className="col-span-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <CalendarClock className="mr-1 inline size-3.5" aria-hidden /> {zone}
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              All {numberWord(selected.length)} accounts use the same moment. Your workspace timezone is used.
            </p>
            <Button className="mt-4 w-full" disabled={!selected.length || busy} onClick={() => run(draft.schedule ? "schedule" : "publish")}>
              {draft.schedule ? `Schedule to ${selected.length} accounts` : `Publish to ${selected.length} accounts now`}
            </Button>
          </Panel>
        </div>
      </div>
      <div className="sticky bottom-[4.25rem] z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur lg:bottom-4">
        <span className="text-xs text-muted-foreground">
          {selected.length ? `✓ Ready for ${selected.length} destinations` : "Select a destination to continue"}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => run("draft")}>
            Save draft
          </Button>
          <Button
            variant="outline"
            disabled={!selected.length || busy}
            onClick={() => {
              edit({ schedule: true });
              run("schedule");
            }}
          >
            Schedule
          </Button>
          <Button
            disabled={!selected.length || busy}
            onClick={() => {
              edit({ schedule: false });
              run("publish");
            }}
          >
            Publish now
          </Button>
        </div>
      </div>

      <LibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onPick={(asset) => {
          edit({ media: asset });
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}

function LibraryDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onPick: (asset: MediaRef) => void;
}) {
  const [query, setQuery] = useState("");
  const q = useDebounced(query.trim());
  const media = useMediaList({ q: q || undefined, pageSize: 24 }, open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add media from library</DialogTitle>
          <DialogDescription>Pick an image or video you&apos;ve already uploaded.</DialogDescription>
        </DialogHeader>
        <label className="relative block">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your media..."
            className="h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm"
          />
        </label>
        <div className="max-h-80 overflow-y-auto">
          {media.isError ? (
            <ErrorState error={media.error} onRetry={() => media.refetch()} />
          ) : media.isPending ? (
            <LoadingBlock lines={6} />
          ) : media.data.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No media found.</p>
          ) : (
            <ul className="divide-y">
              {media.data.data.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => onPick(asset)}
                    className="flex w-full items-center gap-3 px-1 py-2 text-left hover:bg-muted/50"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      {asset.kind === "video" ? <Video className="size-4" aria-hidden /> : <ImageIcon className="size-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{asset.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {mediaFormatLabel(asset.format)} · {formatBytes(asset.sizeBytes)}
                        {asset.durationSeconds ? ` · ${formatDuration(asset.durationSeconds)}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
