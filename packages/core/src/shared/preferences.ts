// Pure: imported by client components too, so no db or Node imports here.
import { z } from 'zod';

// P1-UI-06 allowlists. Each set must also have a row in
// docs/wiki/open-source-reuse.md before its files are added.
export const PIECE_SETS = [
  'cburnett',
  'merida',
  'mono',
  'mpchess',
  'fantasy',
  'spatial',
  'celtic',
  'chessnut',
  'rhosgfx',
  'kiwen-suwi',
  'firi',
] as const;
export const BOARD_THEMES = ['brown', 'blue', 'green', 'grey'] as const; // CSS two-color themes we define
export const SOUND_SETS = ['sfx', 'futuristic', 'nes', 'piano', 'off'] as const;

export const preferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  boardTheme: z.enum(BOARD_THEMES),
  pieceSet: z.enum(PIECE_SETS),
  soundSet: z.enum(SOUND_SETS),
  showCoords: z.boolean(),
  moveInput: z.enum(['both', 'drag', 'click']),
  animationMs: z.int().min(0).max(1000),
  showLegalDests: z.boolean(),
  boardSizePx: z.int().min(240).max(2000).nullable(),
  engineEnabled: z.boolean(),
  engineFlavor: z.enum(['lite', 'full']),
  engineMultipv: z.int().min(1).max(5),
  engineDepth: z.int().min(16).max(40).nullable(), // null = infinite (P1-AN-13)
});
export type Preferences = z.infer<typeof preferencesSchema>;

export const defaultPreferences: Preferences = {
  theme: 'system',
  boardTheme: 'brown',
  pieceSet: 'cburnett',
  soundSet: 'sfx',
  showCoords: true,
  moveInput: 'both',
  animationMs: 200,
  showLegalDests: true,
  boardSizePx: null,
  engineEnabled: true,
  engineFlavor: 'lite',
  engineMultipv: 1,
  engineDepth: null,
};
