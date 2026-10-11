// Domain errors carry the CORE-41 envelope fields. Route handlers turn them
// into `{ error: { code, message, details } }` with `status`.
export class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: string, status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
