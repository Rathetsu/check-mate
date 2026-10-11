import type { Position } from 'chessops/chess';
import { makeFen } from 'chessops/fen';

// Normalized EPD (2026-10-10-15). `toSetup()` keeps the en passant square
// only when a capture is legal, so equal positions get equal keys.
export const positionKey = (pos: Position): string => makeFen(pos.toSetup(), { epd: true });
