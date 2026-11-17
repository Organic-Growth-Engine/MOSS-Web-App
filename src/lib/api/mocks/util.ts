import { apiConfig } from "@/lib/api/config"
import { ApiError } from "@/lib/api/errors"
import type { ErrorCode, FieldError, PageMeta } from "@/lib/api/types"

/** Simulated network round-trip; returns a deep copy so callers can't mutate mock state. */
export async function respond<T>(value: T, ms = apiConfig.mockLatencyMs): Promise<T> {
  if (ms > 0) await new Promise((r) => setTimeout(r, ms))
  return value === undefined ? value : structuredClone(value)
}

const statusFor: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHENTICATED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INVALID_STATE: 409,
  PLAN_LIMIT_REACHED: 409,
  ACCOUNT_LOCKED: 409,
  VALIDATION_FAILED: 422,
  INTERNAL: 500,
}

/** Rejects exactly like the real HTTP client would for the same error response. */
export async function fail(code: ErrorCode, message: string, details?: FieldError[]): Promise<never> {
  await respond(undefined)
  throw new ApiError({
    status: statusFor[code],
    code,
    message,
    details,
    requestId: `req_mock_${Math.random().toString(36).slice(2, 8)}`,
  })
}

export function paginate<T>(items: T[], page = 1, pageSize = 20): { data: T[]; meta: PageMeta } {
  const size = Math.min(Math.max(pageSize, 1), 100)
  const totalPages = Math.ceil(items.length / size)
  return {
    data: items.slice((page - 1) * size, page * size),
    meta: { page, pageSize: size, total: items.length, totalPages },
  }
}

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(16).slice(2, 8)}`

export const includesText = (haystack: string, q?: string) =>
  !q || haystack.toLowerCase().includes(q.trim().toLowerCase())

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")

/** Minimal single-page PDF with lines of text, so mocked PDF exports are real, openable files. */
export function textPdf(lines: string[]): Blob {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, "-")
  const body = lines
    .slice(0, 48)
    .map((l, i) => `BT /F1 ${i === 0 ? 16 : 10} Tf 50 ${800 - i * 15} Td (${esc(l)}) Tj ET`)
    .join("\n")
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]
  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  objects.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([pdf], { type: "application/pdf" })
}

export function csv(rows: (string | number)[][]): Blob {
  const cell = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" })
}
