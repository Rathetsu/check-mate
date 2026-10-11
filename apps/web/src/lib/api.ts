// Every /api/v1 handler goes through `route`. It resolves the session into an
// explicit userId (CORE-42), validates input with zod (CORE-40) and answers
// errors with the CORE-41 envelope.
import { auth, DomainError } from '@checkmate/core';
import { APIError } from 'better-auth/api';
import { z } from 'zod';

export type Ctx = { userId: string; req: Request };

export function errorResponse(code: string, status: number, message: string, details?: unknown) {
  return Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function route(handler: (ctx: Ctx) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (!session) return errorResponse('UNAUTHENTICATED', 401, 'Sign in to continue.');
      const result = await handler({ userId: session.user.id, req });
      return result instanceof Response ? result : Response.json(result);
    } catch (err) {
      if (err instanceof DomainError) return errorResponse(err.code, err.status, err.message, err.details);
      if (err instanceof z.ZodError)
        return errorResponse('VALIDATION', 400, 'Some fields are invalid.', { issues: err.issues });
      if (err instanceof APIError)
        return errorResponse(String(err.body?.code ?? err.status), err.statusCode, err.body?.message ?? err.message);
      console.error('[api]', err);
      return errorResponse('INTERNAL', 500, 'Something went wrong on our side.');
    }
  };
}

export async function readBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const json: unknown = await req.json().catch(() => {
    throw new DomainError('VALIDATION', 400, 'The request body must be JSON.');
  });
  return schema.parse(json);
}
