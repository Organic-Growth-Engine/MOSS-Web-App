"use client"

import { useState } from "react"
import { ArrowDownToLine } from "lucide-react"
import { toast } from "sonner"

import { errorMessage } from "@/lib/api/errors"
import type { ExportFormat } from "@/lib/api/types"
import { saveBlob } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** "Export" button with CSV / PDF choices; downloads whatever the export endpoint returns. */
export function ExportMenu({
  label = "Export",
  size = "sm",
  filename,
  run,
}: {
  label?: string
  size?: "sm" | "default"
  filename: (format: ExportFormat) => string
  run: (format: ExportFormat) => Promise<Blob>
}) {
  const [busy, setBusy] = useState(false)
  const exportAs = async (format: ExportFormat) => {
    setBusy(true)
    try {
      saveBlob(await run(format), filename(format))
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline", size }))} disabled={busy}>
        <ArrowDownToLine aria-hidden /> {busy ? "Exporting…" : label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuItem onClick={() => exportAs("csv")}>CSV spreadsheet</DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportAs("pdf")}>PDF report</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
