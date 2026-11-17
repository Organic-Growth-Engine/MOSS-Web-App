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
import { toast } from "sonner";

import { errorMessage } from "@/lib/api/errors";
import { formatBytes, formatDuration, formatShortDate, mediaFormatLabel } from "@/lib/format";
import type { MediaAsset, MediaFolder, MediaKind } from "@/lib/api/types";
import {
  useCreateFolder,
  useDeleteMedia,
  useMediaFolders,
  useMediaInfinite,
  useStorageUsage,
  useUpdateMedia,
  useUploadMedia,
} from "@/lib/api/hooks/queries";
import { useWorkspace } from "@/lib/api/hooks/workspace-context";
import { useDebounced } from "@/hooks/use-debounced";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Panel } from "@/components/shared/panel";
import { ErrorState, LoadingBlock, Notice, type NoticeState } from "@/components/shared/query-state";
import { StatusPill } from "@/components/shared/status-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 8;
const tileStyles = [
  "from-[#e8e4df] to-[#f6f1e8]",
  "from-[#dbe7df] to-[#f2f4ed]",
  "from-[#eaded4] to-[#f5efe7]",
  "from-[#dfe5ec] to-[#eff1f4]",
];

export default function MediaPage() {
  const [folder, setFolder] = useState("all");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MediaKind | "all">("all");
  const [sort, setSort] = useState<"-createdAt" | "createdAt">("-createdAt");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [folderDialog, setFolderDialog] = useState(false);
  const q = useDebounced(query.trim());

  const folders = useMediaFolders();
  const storage = useStorageUsage();
  const upload = useUploadMedia();
  const media = useMediaInfinite({
    folderId: folder === "all" ? undefined : folder,
    kind: kind === "all" ? undefined : kind,
    q: q || undefined,
    sort,
    pageSize: PAGE_SIZE,
  });
  const assets = media.data?.pages.flatMap((p) => p.data) ?? [];
  const folderList = folders.data?.data ?? [];
  const tiles: MediaFolder[] = [
    { id: "all", name: "All assets", assetCount: folders.data?.meta.totalAssets ?? 0 },
    ...folderList,
  ];
  const folderName = tiles.find((f) => f.id === folder)?.name ?? "All assets";

  const onUpload = (file?: File) => {
    if (!file) return;
    setNotice({ tone: "info", text: `Uploading ${file.name}…` });
    upload.mutate(
      { file, folderId: folder === "all" ? null : folder },
      {
        onSuccess: (asset) => setNotice({ tone: "success", text: `${asset.name} is in your library.` }),
        onError: (e) => setNotice({ tone: "danger", text: errorMessage(e) }),
      },
    );
  };

  const s = storage.data;
  const usedPct = s ? Math.round((s.usedBytes / s.limitBytes) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Good things, ready to share."
        description="Your creative library, thoughtfully organized."
        actions={
          <>
            <Button variant="outline" onClick={() => setFolderDialog(true)}>
              <FolderPlus aria-hidden /> New folder
            </Button>
            <label className={buttonVariants({ className: "cursor-pointer" })} aria-disabled={upload.isPending}>
              <Upload aria-hidden /> {upload.isPending ? "Uploading…" : "Upload media"}
              <input
                type="file"
                accept={s ? s.allowedFormats.map((f) => `.${f}`).join(",") : "image/*,video/*"}
                className="sr-only"
                disabled={upload.isPending}
                onChange={(event) => {
                  onUpload(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </>
        }
      />

      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {folders.isPending
          ? [0, 1, 2, 3].map((i) => <LoadingBlock key={i} className="h-[72px]" />)
          : folders.isError
            ? <ErrorState className="sm:col-span-2 xl:col-span-4" error={folders.error} onRetry={() => folders.refetch()} />
            : tiles.map((item) => (
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
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.assetCount} assets</span>
                  </span>
                </button>
              ))}
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
          value={kind}
          onChange={(event) => setKind(event.target.value as MediaKind | "all")}
          className="h-10 rounded-lg border bg-card px-3 text-sm sm:w-40"
        >
          <option value="all">All file types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>
        <select
          aria-label="Sort media"
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
          className="h-10 rounded-lg border bg-card px-3 text-sm sm:w-40"
        >
          <option value="-createdAt">Newest first</option>
          <option value="createdAt">Oldest first</option>
        </select>
        <span className="text-xs text-muted-foreground sm:ml-auto">
          {folderName} · {assets.length} shown
        </span>
      </div>

      {media.isError ? (
        <ErrorState error={media.error} onRetry={() => media.refetch()} />
      ) : media.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <LoadingBlock key={i} className="h-64" />
          ))}
        </div>
      ) : assets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {assets.map((asset, index) => (
            <AssetCard key={asset.id} asset={asset} index={index} folders={folderList} onNotice={setNotice} />
          ))}
        </div>
      ) : (
        <Panel className="py-16 text-center">
          <FilePlus2 className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">No media found</p>
          <p className="mt-1 text-xs text-muted-foreground">Try another folder or search term.</p>
        </Panel>
      )}

      <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
        <div className="w-full max-w-xs">
          {s ? (
            <>
              <div className="mb-1 flex justify-between">
                <span>
                  {formatBytes(s.usedBytes)} of {formatBytes(s.limitBytes)} used
                </span>
                <span>{usedPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
              </div>
            </>
          ) : (
            <LoadingBlock className="h-6" />
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!media.hasNextPage || media.isFetchingNextPage}
          onClick={() => media.fetchNextPage()}
        >
          {media.isFetchingNextPage ? "Loading…" : media.hasNextPage ? "Load more assets" : "All assets loaded"}
        </Button>
        <span>
          {s ? `${s.allowedFormats.map(mediaFormatLabel).join(", ")} · Up to ${formatBytes(s.maxFileBytes)}` : " "}
        </span>
      </div>

      <NewFolderDialog
        open={folderDialog}
        onOpenChange={setFolderDialog}
        onCreated={(f) => {
          setFolder(f.id);
          setNotice({ tone: "success", text: `Folder “${f.name}” created.` });
        }}
      />
    </div>
  );
}

function AssetCard({
  asset,
  index,
  folders,
  onNotice,
}: {
  asset: MediaAsset;
  index: number;
  folders: MediaFolder[];
  onNotice: (n: NoticeState) => void;
}) {
  const tz = useWorkspace().data?.timezone ?? "UTC";
  const update = useUpdateMedia();
  const remove = useDeleteMedia();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(asset.name);
  const [deleting, setDeleting] = useState(false);
  const isVideo = asset.kind === "video";
  const Icon = isVideo ? Film : ImageIcon;
  const used = asset.usage.scheduledPostCount;

  const move = (folderId: string | null) =>
    update.mutate(
      { mediaId: asset.id, body: { folderId } },
      {
        onSuccess: () => onNotice({ tone: "success", text: `Moved ${asset.name} to ${folders.find((f) => f.id === folderId)?.name ?? "no folder"}.` }),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );

  return (
    <Panel className="overflow-hidden p-0">
      <div
        className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${tileStyles[index % tileStyles.length]}`}
      >
        <Icon className="size-10 text-foreground/30" strokeWidth={1.3} aria-hidden />
        {isVideo && (
          <span className="absolute right-3 bottom-3 rounded bg-foreground/75 px-2 py-1 text-[10px] font-medium text-background">
            ▶ {formatDuration(asset.durationSeconds)}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`More actions for ${asset.name}`}
            className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-md bg-card/90 text-foreground shadow-sm"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem
              onClick={() => {
                setName(asset.name);
                setRenaming(true);
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to folder</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {folders.map((f) => (
                  <DropdownMenuItem key={f.id} disabled={f.id === asset.folderId} onClick={() => move(f.id)}>
                    {f.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem disabled={!asset.folderId} onClick={() => move(null)}>
                  No folder
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem render={<a href={asset.url} target="_blank" rel="noreferrer" />}>Open original</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="p-3.5">
        <p className="truncate text-sm font-medium">{asset.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {mediaFormatLabel(asset.format)} · {formatBytes(asset.sizeBytes)}
          {isVideo ? ` · ${formatDuration(asset.durationSeconds)}` : ""}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <StatusPill tone={used ? "primary" : asset.status === "processing" ? "info" : "neutral"}>
            {used
              ? `Used in ${used} scheduled post${used === 1 ? "" : "s"}`
              : asset.status === "processing"
                ? "Processing…"
                : "Ready to use"}
          </StatusPill>
          <span className="shrink-0 text-[11px] text-muted-foreground">{formatShortDate(asset.createdAt, tz)}</span>
        </div>
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>Posts that use it keep working.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate({ mediaId: asset.id, body: { name } }, { onSuccess: () => setRenaming(false) });
            }}
          >
            <input
              autoFocus
              aria-label="File name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            />
            {update.isError && <p className="text-xs text-destructive">{errorMessage(update.error)}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={update.isPending || !name.trim()}>
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${asset.name}?`}
        description="It's removed from your library. This can't be undone."
        confirmLabel="Delete file"
        pending={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : undefined}
        onConfirm={() =>
          remove.mutate(asset.id, {
            onSuccess: () => {
              setDeleting(false);
              onNotice({ tone: "success", text: `${asset.name} was deleted.` });
            },
          })
        }
      />
    </Panel>
  );
}

function NewFolderDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (f: MediaFolder) => void;
}) {
  const create = useCreateFolder();
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>Group assets by campaign, season or anything that helps.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(
              { name },
              {
                onSuccess: (f) => {
                  onCreated(f);
                  onOpenChange(false);
                  setName("");
                },
              },
            );
          }}
        >
          <input
            autoFocus
            aria-label="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
          />
          {create.isError && <p className="text-xs text-destructive">{errorMessage(create.error)}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending || !name.trim()}>
              Create folder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
