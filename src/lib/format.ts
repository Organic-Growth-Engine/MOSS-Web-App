/**
 * Display formatting. The API sends raw values (bytes, seconds, ISO UTC timestamps, enums);
 * everything is formatted here, in the workspace timezone.
 */
import type {
  DestinationFormat,
  MediaFormat,
  Platform,
  PostStatus,
  Role,
} from "@/lib/api/types"
import { platformMeta } from "@/config/platforms"

// ── Numbers ─────────────────────────────────────────────────────────────

export const formatNumber = (n: number) => n.toLocaleString("en-US")

/** 128400 → "128.4K" */
export function formatCompact(n: number) {
  if (n < 10_000) return formatNumber(n)
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)
}

export const formatPercent = (n: number, digits = 1) => `${n.toFixed(digits)}%`

/** Decimal units, as the design shows ("18.4 MB", "1.8 GB"). */
export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let i = 0
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000
    i++
  }
  return `${Math.round(value * 10) / 10} ${units[i]}`
}

/** 24 → "0:24" */
export function formatDuration(seconds?: number | null) {
  if (seconds === undefined || seconds === null) return ""
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

// ── Dates (workspace timezone) ──────────────────────────────────────────

type DateInput = string | Date
const toDate = (d: DateInput) => (typeof d === "string" ? new Date(d) : d)

export function formatInTz(d: DateInput, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(toDate(d))
}

/** "10:00 AM" */
export const formatTime = (d: DateInput, tz: string) =>
  formatInTz(d, tz, { hour: "numeric", minute: "2-digit" })

/** "Mar 23" */
export const formatShortDate = (d: DateInput, tz: string) =>
  formatInTz(d, tz, { month: "short", day: "numeric" })

/** YYYY-MM-DD of an instant in a timezone. */
export function dateKeyInTz(d: DateInput, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(toDate(d))
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  return `${get("year")}-${get("month")}-${get("day")}`
}

/** Offset of `timeZone` from UTC at an instant, in minutes. */
function tzOffsetMinutes(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at)
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"))
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** Wall-clock date + time in a timezone → ISO UTC string. */
export function zonedToIso(dateKey: string, time: string, timeZone: string) {
  const [y, m, d] = dateKey.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const offset = tzOffsetMinutes(new Date(guess), timeZone)
  const result = guess - offset * 60_000
  // Correct across a DST change between the guess and the result.
  const offset2 = tzOffsetMinutes(new Date(result), timeZone)
  return new Date(guess - offset2 * 60_000).toISOString()
}

/** "America/Los_Angeles · PDT (UTC−07:00)" */
export function timezoneLabel(timeZone: string, at: Date, withOffset = true) {
  const abbr = formatInTz(at, timeZone, { timeZoneName: "short" }).split(" ").pop()
  const offset = tzOffsetMinutes(at, timeZone)
  const sign = offset < 0 ? "−" : "+"
  const abs = Math.abs(offset)
  const hhmm = `${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`
  return withOffset ? `${timeZone} · ${abbr} (UTC${sign}${hhmm})` : `${timeZone} · ${abbr}`
}

export const tzAbbr = (timeZone: string, at: Date) =>
  formatInTz(at, timeZone, { timeZoneName: "short" }).split(" ").pop() ?? ""

/** Adds days to a YYYY-MM-DD key. */
export function addDays(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function daysBetween(fromKey: string, toKey: string) {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000)
}

/** "Today" / "Tomorrow" / "Yesterday" / "Mar 25" relative to `now`, in the timezone. */
export function relativeDay(d: DateInput, tz: string, now: Date) {
  const diff = daysBetween(dateKeyInTz(now, tz), dateKeyInTz(d, tz))
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff === -1) return "Yesterday"
  return formatShortDate(d, tz)
}

/** "just now", "12 minutes ago", "1h ago"-style. */
export function timeAgo(d: DateInput, now: Date, style: "short" | "long" = "long") {
  const minutes = Math.max(0, Math.round((now.getTime() - toDate(d).getTime()) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return style === "short" ? `${minutes}m ago` : `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return style === "short" ? `${hours}h ago` : `${hours} hour${hours === 1 ? "" : "s"} ago`
  const days = Math.round(hours / 24)
  return style === "short" ? `${days}d ago` : `${days} day${days === 1 ? "" : "s"} ago`
}

/** "Mar 1–23, 2026" / "Feb 6–28, 2026" / "Feb 22 – Mar 23, 2026" */
export function formatRange(from: string, to: string, spaced = false) {
  const f = new Date(`${from}T12:00:00Z`)
  const t = new Date(`${to}T12:00:00Z`)
  const opts = { timeZone: "UTC" } as const
  const mon = (d: Date) => d.toLocaleDateString("en-US", { ...opts, month: "short" })
  const day = (d: Date) => d.getUTCDate()
  const dash = spaced ? " – " : "–"
  if (f.getUTCFullYear() === t.getUTCFullYear() && f.getUTCMonth() === t.getUTCMonth())
    return `${mon(f)} ${day(f)}${dash}${day(t)}, ${t.getUTCFullYear()}`
  return `${mon(f)} ${day(f)} – ${mon(t)} ${day(t)}, ${t.getUTCFullYear()}`
}

// ── Enum labels ─────────────────────────────────────────────────────────

export const platformName = (p: Platform) => platformMeta[p].name

export const postStatusLabel: Record<PostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  partially_published: "Partially published",
  failed: "Failed",
}

export const destinationFormatLabel: Record<DestinationFormat, string> = {
  post: "Post",
  reel: "Reel",
  native_video: "Native video",
  video_post: "Video post",
  short: "Short",
}

export const roleLabel: Record<Role, string> = { owner: "Owner", admin: "Admin", editor: "Editor" }

export const mediaFormatLabel = (f: MediaFormat) => f.toUpperCase()

export const mediaKindLabel = (k: "image" | "video" | null) =>
  k === "video" ? "Video" : k === "image" ? "Image" : "Text"

const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
export const numberWord = (n: number) => words[n] ?? String(n)

/** "9:16 portrait" */
export function aspectLabel(width: number, height: number) {
  if (!width || !height) return ""
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  const g = gcd(width, height)
  const orientation = width === height ? "square" : width > height ? "landscape" : "portrait"
  return `${width / g}:${height / g} ${orientation}`
}
