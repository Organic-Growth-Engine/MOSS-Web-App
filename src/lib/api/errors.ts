import type { ErrorCode, ErrorResponse, FieldError } from "@/lib/api/types"

/** Every failed API call — real or mocked — rejects with an ApiError. */
export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode | "NETWORK_ERROR" | "TIMEOUT"
  readonly details: FieldError[]
  readonly requestId?: string

  constructor(init: {
    status: number
    code: ApiError["code"]
    message: string
    details?: FieldError[]
    requestId?: string
  }) {
    super(init.message)
    this.name = "ApiError"
    this.status = init.status
    this.code = init.code
    this.details = init.details ?? []
    this.requestId = init.requestId
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const error = (body as ErrorResponse | undefined)?.error
    if (error?.code && error.message) {
      return new ApiError({ status, ...error })
    }
    return new ApiError({
      status,
      code: status >= 500 ? "INTERNAL" : "BAD_REQUEST",
      message: status >= 500 ? "Something went wrong on our side." : `Request failed (${status}).`,
    })
  }

  fieldError(field: string) {
    return this.details.find((d) => d.field === field)?.message
  }
}

export function isApiError(error: unknown, code?: ApiError["code"]): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

/** User-facing message for any thrown value. */
export function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    // For 422s the specific field messages are more useful than the generic summary.
    return error.details.length ? error.details.map((d) => d.message).join(" ") : error.message
  }
  return "Something went wrong. Please try again."
}
