// Every /api/v1 handler goes through `route` (signed in) or `publicRoute`
// (anyone). They resolve the session into an explicit userId (CORE-42),
// validate input with zod (CORE-40) and answer errors with the CORE-41
// envelope.
import { auth, DomainError } from '@checkmate/core';
import { APIError } from 'better-auth/api';
import { z } from 'zod';

type Params = Record<string, string | string[]>;
export type Ctx<P = Params> = { userId: string; req: Request; params: P };
export type PublicCtx<P = Params> = { userId: string | null; req: Request; params: P };

export function errorResponse(code: string, status: number, message: string, details?: unknown) {
  return Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

function handle<P>(signedIn: boolean, handler: (ctx: PublicCtx<P>) => Promise<unknown>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      if (signedIn && !session) return errorResponse('UNAUTHENTICATED', 401, 'Sign in to continue.');
      const result = await handler({ userId: session?.user.id ?? null, req, params: await ctx.params });
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

export const route = <P = Params>(handler: (ctx: Ctx<P>) => Promise<unknown>) =>
  handle<P>(true, handler as (ctx: PublicCtx<P>) => Promise<unknown>);

// Signed-out callers get `userId: null`. Private things answer them 404,
// never 401, so their existence doesn't leak (CORE-52).
export const publicRoute = <P = Params>(handler: (ctx: PublicCtx<P>) => Promise<unknown>) => handle<P>(false, handler);

export async function readBody<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  const json: unknown = await req.json().catch(() => {
    throw new DomainError('VALIDATION', 400, 'The request body must be JSON.');
  });
  return schema.parse(json);
}
