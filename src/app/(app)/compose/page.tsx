"use client";

import { useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ImagePlus,
  Plus,
  Sparkles,
  Video,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel, PanelTitle } from "@/components/shared/panel";
import {
  PlatformIcon,
  PlatformTile,
  platformMeta,
} from "@/components/shared/platform-icon";
import { Button } from "@/components/ui/button";
import { LIVE_PLATFORMS, type LivePlatformId } from "@/lib/data/types";
import { posts } from "@/lib/data/mock";

export default function ComposePage() {
  const [selected, setSelected] = useState<LivePlatformId[]>(LIVE_PLATFORMS);
  const [activePreview, setActivePreview] =
    useState<LivePlatformId>("instagram");
  const [title, setTitle] = useState("A little room to grow");
  const [caption, setCaption] = useState(posts[0].caption);
  const [mediaName, setMediaName] = useState("room-to-grow.mp4");
  const [schedule, setSchedule] = useState(true);
  const [notice, setNotice] = useState("");
  const togglePlatform = (platform: LivePlatformId) =>
    setSelected((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  const publishMessage = (action: string) =>
    setNotice(
      `${action} saved in demo mode. No content was published to social platforms.`,
    );
  const words = caption.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6 pb-3">
      <PageHeader
        title="Create a post"
        description="One idea. A thoughtful fit for every platform."
        actions={
          <span className="text-xs text-muted-foreground">
            ✓ Draft saved just now
          </span>
        }
      />
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-info/20 bg-info-soft px-4 py-3 text-sm text-info"
        >
          {notice}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="space-y-4">
          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">
              Where would you like to share?
            </PanelTitle>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {LIVE_PLATFORMS.map((platform) => {
                const active = selected.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={active}
                    onClick={() => togglePlatform(platform)}
                    className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition-colors ${active ? "border-primary bg-primary-soft/70 text-primary" : "bg-card hover:bg-muted/50"}`}
                  >
                    <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded border bg-card">
                      {active && <Check className="size-3" aria-hidden />}
                    </span>
                    <PlatformIcon
                      platform={platform}
                      className="size-5"
                      title={platformMeta[platform].name}
                    />
                    <span className="text-[10px] font-medium sm:text-xs">
                      {platformMeta[platform].name}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {selected.length} accounts selected ·{" "}
              {selected.length === LIVE_PLATFORMS.length
                ? "All connected"
                : "Choose the accounts for this post"}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {LIVE_PLATFORMS.map((platform) => (
                <label
                  key={platform}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="accent-primary"
                  />
                  {platform === "instagram"
                    ? "@studionorth · Instagram"
                    : platform === "linkedin"
                      ? "Studio North · LinkedIn"
                      : platformMeta[platform].name}
                </label>
              ))}
            </div>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">Your story</PanelTitle>
            <label className="mt-4 block text-xs font-medium">
              Internal post name
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="mt-4 block text-xs font-medium">
              Caption
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
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
                onClick={() =>
                  setCaption(
                    `${caption.replace(/\s*#.*$/, "")} #StudioNorth #RoomToGrow`,
                  )
                }
              >
                <Sparkles aria-hidden /> Suggest hashtags
              </Button>
            </div>
            <label className="mt-4 block text-xs font-medium">
              Link
              <input
                defaultValue="https://studionorth.co/spring"
                className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            {mediaName ? (
              <div className="mt-4 flex items-center gap-3 rounded-lg border p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Video className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{mediaName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    MP4 · 18.4 MB · 0:24 · 1080 × 1920
                  </p>
                  <p className="mt-1 text-xs text-success">
                    ✓ Ready for all {selected.length} destinations
                  </p>
                </div>
                <Button
                  aria-label="Remove media"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setMediaName("")}
                >
                  <X aria-hidden />
                </Button>
              </div>
            ) : (
              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center hover:bg-muted/30">
                <ImagePlus className="size-5 text-primary" aria-hidden />
                <span className="text-sm font-medium">Add media</span>
                <span className="text-xs text-muted-foreground">
                  Choose a file or browse media library · JPG, PNG, MP4 or MOV
                </span>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={(event) =>
                    setMediaName(event.target.files?.[0]?.name ?? "")
                  }
                />
              </label>
            )}
            {mediaName && (
              <button
                className="mt-3 text-xs font-medium text-primary hover:underline"
                onClick={() => setMediaName("spring-still-life.jpg")}
              >
                ＋ Add media from library
              </button>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              9:16 portrait · Captions included in video
            </p>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <PanelTitle className="text-sm">
                Make it native to each platform
              </PanelTitle>
              <span className="text-xs text-muted-foreground">
                {selected.length} destinations
              </span>
            </div>
            <div className="mt-3 divide-y">
              {selected.map((platform) => (
                <details
                  key={platform}
                  className="group py-3"
                  open={platform === "linkedin" || platform === "youtube"}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2">
                    <PlatformTile platform={platform} size="sm" />
                    <span className="flex-1 text-sm font-medium">
                      {platformMeta[platform].name} ·{" "}
                      {platform === "youtube"
                        ? "Short"
                        : platform === "linkedin"
                          ? "Native video"
                          : "Post"}
                    </span>
                    <span className="text-xs text-success">
                      {caption.length} /{" "}
                      {platformMeta[platform].charLimit?.toLocaleString()}
                    </span>
                    <ChevronDown
                      className="size-4 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="mt-3 space-y-3 pl-9">
                    <textarea
                      aria-label={`${platformMeta[platform].name} caption`}
                      defaultValue={caption}
                      rows={2}
                      className="w-full rounded-lg border bg-background p-2.5 text-xs leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {platform === "linkedin" && (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" className="accent-primary" />
                        Edit for LinkedIn only
                      </label>
                    )}
                    {platform === "youtube" && (
                      <label className="block text-xs font-medium">
                        Video title
                        <input
                          defaultValue={`${title} | Spring collection`}
                          className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-xs"
                        />
                      </label>
                    )}
                  </div>
                </details>
              ))}
            </div>
            {selected.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                Select at least one destination to continue.
              </p>
            )}
          </Panel>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24">
          <Panel className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <PanelTitle className="text-sm">
                A preview of every version
              </PanelTitle>
              <span className="text-xs text-muted-foreground">
                {selected.length
                  ? `${LIVE_PLATFORMS.indexOf(activePreview) + 1} of ${selected.length}`
                  : "No destination"}
              </span>
            </div>
            <div className="mt-3 flex gap-1 overflow-x-auto border-b">
              {LIVE_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  disabled={!selected.includes(platform)}
                  onClick={() => setActivePreview(platform)}
                  className={`shrink-0 border-b-2 px-2 py-2 text-xs ${activePreview === platform ? "border-primary text-primary" : "border-transparent text-muted-foreground"} disabled:opacity-40`}
                >
                  {platformMeta[platform].name}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {platformMeta[activePreview].name} ·{" "}
              {activePreview === "instagram"
                ? "Reel · @studionorth"
                : "Studio North"}
            </p>
            <div className="mx-auto mt-3 max-w-[320px] overflow-hidden rounded-xl border bg-card">
              <div className="flex items-center gap-2 p-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                  SN
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">
                    {activePreview === "instagram"
                      ? "studionorth"
                      : "Studio North"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Just now · Original audio
                  </p>
                </div>
              </div>
              <div className="flex aspect-[4/5] items-center justify-center bg-[#1f2024] text-white">
                <span className="flex items-center gap-2 rounded bg-black/50 px-2 py-1 text-xs">
                  <Video className="size-3.5" aria-hidden /> 0:24
                </span>
              </div>
              <div className="p-3">
                <p className="line-clamp-3 text-xs leading-relaxed">
                  <strong>
                    {activePreview === "instagram" ? "studionorth " : ""}
                  </strong>
                  {caption || "Your caption preview will appear here."}
                </p>
                <PlatformRowPreview platform={activePreview} />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Previews reflect visible copy and format. Final rendering may vary
              by platform.
            </p>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <PanelTitle className="text-sm">Choose your moment</PanelTitle>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!schedule}
                  onChange={() => setSchedule(false)}
                  name="publish-time"
                  className="accent-primary"
                />
                Publish now
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={schedule}
                  onChange={() => setSchedule(true)}
                  name="publish-time"
                  className="accent-primary"
                />
                Schedule for later
              </label>
            </div>
            {schedule && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-xs font-medium">
                  Date
                  <input
                    type="date"
                    defaultValue="2026-03-24"
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-2 text-xs"
                  />
                </label>
                <label className="text-xs font-medium">
                  Time
                  <input
                    type="time"
                    defaultValue="10:00"
                    className="mt-1.5 h-10 w-full rounded-lg border bg-background px-2 text-xs"
                  />
                </label>
                <div className="col-span-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  <CalendarClock className="mr-1 inline size-3.5" aria-hidden />{" "}
                  America/Los_Angeles · PDT (UTC−07:00)
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              All five accounts use the same moment. Your workspace timezone is
              used.
            </p>
            <Button
              className="mt-4 w-full"
              disabled={!selected.length}
              onClick={() => publishMessage(schedule ? "Schedule" : "Publish")}
            >
              {schedule
                ? `Schedule to ${selected.length} accounts`
                : `Publish to ${selected.length} accounts now`}
            </Button>
          </Panel>
        </div>
      </div>
      <div className="sticky bottom-[4.25rem] z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 p-3 shadow-sm backdrop-blur lg:bottom-4">
        <span className="text-xs text-muted-foreground">
          {selected.length
            ? `✓ Ready for ${selected.length} destinations`
            : "Select a destination to continue"}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => publishMessage("Draft")}>
            Save draft
          </Button>
          <Button
            variant="outline"
            disabled={!selected.length}
            onClick={() => {
              setSchedule(true);
              publishMessage("Schedule");
            }}
          >
            Schedule
          </Button>
          <Button
            disabled={!selected.length}
            onClick={() => {
              setSchedule(false);
              publishMessage("Publish");
            }}
          >
            Publish now
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlatformRowPreview({ platform }: { platform: LivePlatformId }) {
  return (
    <div className="mt-3 flex items-center justify-between text-muted-foreground">
      <span className="flex items-center gap-2">
        <PlatformTile platform={platform} size="sm" />
        <span className="text-[10px]">Like · Comment · Share</span>
      </span>
      <Plus className="size-3.5" aria-hidden />
    </div>
  );
}
