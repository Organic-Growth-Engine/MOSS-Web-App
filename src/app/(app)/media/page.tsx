"use client";

import { useState } from "react";
import {
  FilePlus2,
  Film,
  FolderPlus,
  Image as ImageIcon,
  MoreHorizontal,
  Search,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/shared/panel";
import { StatusPill } from "@/components/shared/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { media, mediaFolders } from "@/lib/data/mock";

export default function MediaPage() {
  const [folder, setFolder] = useState("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [uploadName, setUploadName] = useState("");
  const [extraFolder, setExtraFolder] = useState(false);
  const visibleMedia = media
    .filter(
      (asset) =>
        folder === "all" ||
        asset.folder === mediaFolders.find((item) => item.id === folder)?.name,
    )
    .filter((asset) => asset.name.toLowerCase().includes(query.toLowerCase()))
    .filter(
      (asset) =>
        type === "all" ||
        (type === "video" ? asset.type === "MP4" : asset.type !== "MP4"),
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.addedOn.localeCompare(b.addedOn)
        : b.addedOn.localeCompare(a.addedOn),
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good things, ready to share."
        description="Your creative library, thoughtfully organized."
        actions={
          <>
            <Button variant="outline" onClick={() => setExtraFolder(true)}>
              <FolderPlus aria-hidden /> New folder
            </Button>
            <label className={buttonVariants({ className: "cursor-pointer" })}>
              <Upload aria-hidden /> Upload media
              <input
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                onChange={(event) =>
                  setUploadName(event.target.files?.[0]?.name ?? "")
                }
              />
            </label>
          </>
        }
      />

      {uploadName && (
        <div
          role="status"
          className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-success"
        >
          {uploadName} is ready to add to your library. Uploads are local in
          this demo.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {mediaFolders.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFolder(item.id)}
            className={`flex h-[72px] items-center gap-3 rounded-xl border px-4 text-left transition-colors ${folder === item.id ? "border-primary bg-primary-soft/70 text-primary" : "bg-card hover:bg-muted/50"}`}
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-background">
              <FolderPlus className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {item.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.count} assets
              </span>
            </span>
          </button>
        ))}
        {extraFolder && (
          <button
            type="button"
            onClick={() => setFolder("new")}
            className="flex h-[72px] items-center gap-3 rounded-xl border border-primary bg-primary-soft/70 px-4 text-left text-primary"
          >
            <FolderPlus className="size-4" aria-hidden />
            <span>
              <span className="block text-sm font-medium">New folder</span>
              <span className="text-xs">0 assets</span>
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your media..."
            className="h-10 w-full rounded-lg border bg-card pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <select
          aria-label="Filter by file type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="h-10 rounded-lg border bg-card px-3 text-sm sm:w-40"
        >
          <option value="all">All file types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>
        <select
          aria-label="Sort media"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          className="h-10 rounded-lg border bg-card px-3 text-sm sm:w-40"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <span className="text-xs text-muted-foreground sm:ml-auto">
          {folder === "all"
            ? "All assets"
            : (mediaFolders.find((item) => item.id === folder)?.name ??
              "New folder")}{" "}
          · {visibleMedia.length} shown
        </span>
      </div>

      {visibleMedia.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {visibleMedia.map((asset, index) => {
            const isVideo = asset.type === "MP4";
            const tileStyles = [
              "from-[#e8e4df] to-[#f6f1e8]",
              "from-[#dbe7df] to-[#f2f4ed]",
              "from-[#eaded4] to-[#f5efe7]",
              "from-[#dfe5ec] to-[#eff1f4]",
            ];
            const Icon = isVideo ? Film : ImageIcon;
            return (
              <Panel key={asset.id} className="overflow-hidden p-0">
                <div
                  className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${tileStyles[index % tileStyles.length]}`}
                >
                  <Icon
                    className="size-10 text-foreground/30"
                    strokeWidth={1.3}
                    aria-hidden
                  />
                  {isVideo && (
                    <span className="absolute right-3 bottom-3 rounded bg-foreground/75 px-2 py-1 text-[10px] font-medium text-background">
                      ▶ {asset.duration}
                    </span>
                  )}
                  <button
                    aria-label={`More actions for ${asset.name}`}
                    className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-md bg-card/90 text-foreground shadow-sm"
                  >
                    <MoreHorizontal className="size-4" aria-hidden />
                  </button>
                </div>
                <div className="p-3.5">
                  <p className="truncate text-sm font-medium">{asset.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {asset.type} · {asset.size}
                    {asset.duration ? ` · ${asset.duration}` : ""}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <StatusPill tone={asset.usage ? "primary" : "neutral"}>
                      {asset.usage
                        ? "Used in 1 scheduled post"
                        : "Ready to use"}
                    </StatusPill>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {asset.addedOn}
                    </span>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel className="py-16 text-center">
          <FilePlus2
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 text-sm font-medium">No media found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try another folder or search term.
          </p>
        </Panel>
      )}

      <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
        <div className="w-full max-w-xs">
          <div className="mb-1 flex justify-between">
            <span>1.8 GB of 10 GB used</span>
            <span>18%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div className="h-full w-[18%] rounded-full bg-primary" />
          </div>
        </div>
        <Button variant="outline" size="sm">
          Load more assets
        </Button>
        <span>JPG, PNG, WEBP, MP4, MOV · Up to 1 GB</span>
      </div>
    </div>
  );
}
