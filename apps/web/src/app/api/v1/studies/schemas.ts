// Request bodies for /api/v1/studies (studies spec "API surface"). These are
// the wire-level caps; packages/chess and packages/core check everything
// again (applyOp normalizes, the services enforce limits and access).
import { CHAPTER_MODES } from '@checkmate/core';
import { MAX_COMMENT, MAX_PGN_CHARS, MAX_SHAPES, MAX_TAGS, type TreeOp } from '@checkmate/chess';
import { z } from 'zod';

const path = z.string().max(40_000);
const square = z.string().regex(/^[a-h][1-8]$/);
const text = z.string().max(MAX_COMMENT);

export const opBody = z.object({
  clientId: z.string().max(64).optional(),
  op: z.discriminatedUnion('op', [
    z.object({ op: z.literal('addNode'), path, uci: z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/) }),
    z.object({ op: z.literal('deleteNode'), path }),
    z.object({ op: z.literal('promote'), path, toMainline: z.boolean() }),
    z.object({ op: z.literal('setComment'), path, text }),
    z.object({ op: z.literal('setNags'), path, nags: z.array(z.int().min(0).max(255)).max(20) }),
    z.object({
      op: z.literal('setShapes'),
      path,
      shapes: z
        .array(z.object({ orig: square, dest: square.optional(), brush: z.enum(['green', 'red', 'yellow', 'blue']) }))
        .max(MAX_SHAPES),
    }),
    z.object({
      op: z.literal('setTags'),
      tags: z.array(z.tuple([z.string().max(40), z.string().max(255)])).max(MAX_TAGS),
    }),
    z.object({ op: z.literal('setGamebook'), path, hint: text, deviation: text }),
    z.object({ op: z.literal('clearAnnotations') }),
    z.object({ op: z.literal('clearVariations') }),
  ]),
});
export const asOp = (op: z.infer<typeof opBody>['op']) => op as TreeOp;

export const name = z.string().trim().min(1).max(100);
const orientation = z.enum(['white', 'black']);

export const chapterBody = z.object({
  source: z.discriminatedUnion('type', [
    z.object({ type: z.literal('blank') }),
    z.object({ type: z.literal('fen'), fen: z.string().max(100) }),
    z.object({ type: z.literal('pgn'), pgn: z.string().min(1).max(MAX_PGN_CHARS) }),
    z.object({ type: z.literal('lichess'), url: z.string().max(200) }),
  ]),
  name: name.optional(),
  orientation: orientation.optional(),
  mode: z.enum(CHAPTER_MODES).optional(),
});

export const chapterPatch = z.object({
  name: name.optional(),
  orientation: orientation.optional(),
  description: z.string().max(2_000).optional(),
  mode: z.enum(CHAPTER_MODES).optional(),
});

const rule = z.enum(['everyone', 'contributors', 'nobody']);
export const studyPatch = z.object({
  name: name.optional(),
  description: z.string().max(2_000).optional(),
  visibility: z.enum(['private', 'unlisted', 'public']).optional(),
  settings: z.object({ computer: z.boolean(), cloneable: rule, shareable: rule, sticky: z.boolean() }).optional(),
  topics: z
    .array(z.string().trim().min(1).max(40))
    .max(10)
    .transform((t) => [...new Set(t)])
    .optional(),
});
