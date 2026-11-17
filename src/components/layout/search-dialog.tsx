"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { mainNav } from "@/config/nav"
import { useSearch } from "@/lib/api/hooks/queries"
import { useDebounced } from "@/hooks/use-debounced"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

type Result = { label: string; hint: string; href: string }

/** Pages are searched locally; posts, media and accounts come from the search API. */
const pages: Result[] = mainNav.map((n) => ({ label: n.title, hint: "Page", href: n.href }))

/** "Search posts, media, accounts… ⌘K" — the top bar search. */
export function SearchTrigger({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-10 items-center gap-3 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <Search className="size-4" aria-hidden />
        <span>Search posts, media, accounts…</span>
        <kbd className="font-sans text-xs">⌘ K</kbd>
      </button>
      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const term = useDebounced(q.trim(), 200)
  const remote = useSearch(term)
  const results = useMemo(() => {
    const s = term.toLowerCase()
    if (!s) return pages.slice(0, 8)
    const local = pages.filter((r) => r.label.toLowerCase().includes(s))
    return [...local, ...(remote.data?.data ?? [])].slice(0, 8)
  }, [term, remote.data])
  const searching = q.trim() !== term || (Boolean(term) && remote.isFetching && !remote.data)

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQ("")
      }}
    >
      <DialogContent className="gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-4 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts, media, accounts…"
            className="h-12 flex-1 bg-transparent text-sm outline-none focus-visible:shadow-none focus-visible:outline-none"
            aria-label="Search"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {remote.isError && (
            <li className="px-3 py-2 text-xs text-destructive">Search is unavailable right now. Showing pages only.</li>
          )}
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {searching ? "Searching…" : "Nothing found."}
            </li>
          )}
          {results.map((r) => (
            <li key={`${r.href}-${r.label}`}>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false)
                  router.push(r.href)
                }}
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="truncate">{r.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{r.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
