'use client';

// The board editor (board-editor spec). This component owns the editor state
// and its FEN; the rules layer decides availability and validity.
import {
  castlingAvailability,
  CASTLING_TOGGLES,
  EMPTY_BOARD,
  editorFen,
  editorState,
  epCandidates,
  fenToUrl,
  INITIAL_FEN,
  placePiece,
  swapColors,
  validateSetup,
  type CastlingToggle,
  type EditorState,
  type SquareName,
} from '@checkmate/chess';
import { cn } from 'cn';
import { Eraser, FlipVertical2, MousePointer2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Board, type BoardHandle } from '@/components/board/Board';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SaveToStudyDialog } from '@/components/studies/save-to-study';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePrefs } from '@/lib/prefs';
import { useShortcuts } from '@/lib/use-shortcuts';

type Color = 'white' | 'black';
type Role = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type Tool = 'pointer' | 'eraser' | { role: Role; color: Color };

const ROLES: Role[] = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
const CASTLING_LABEL: Record<CastlingToggle, string> = {
  K: 'White O-O',
  Q: 'White O-O-O',
  k: 'Black O-O',
  q: 'Black O-O-O',
};
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function Editor({ fen, signedIn }: { fen: string; signedIn: boolean }) {
  const { prefs } = usePrefs();
  const [state, setState] = useState<EditorState>(() => {
    const r = editorState(fen);
    return r.ok ? r.state : editorStateOf(INITIAL_FEN);
  });
  const [orientation, setOrientation] = useState<Color>('white');
  const [tool, setTool] = useState<Tool>('pointer');
  const [typed, setTyped] = useState<{ text: string; error: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const board = useRef<BoardHandle>(null);

  const out = editorFen(state);
  const check = validateSetup(out);
  const available = castlingAvailability(state.board);
  const eps = epCandidates(state.board, state.turn);

  // P1-ED-11: the URL follows the position, replacing the history entry.
  useEffect(() => history.replaceState(null, '', `/editor/${fenToUrl(out)}`), [out]);

  const update = (patch: Partial<EditorState>) => setState((s) => ({ ...s, ...patch }));
  const flip = () => setOrientation((o) => (o === 'white' ? 'black' : 'white'));
  useShortcuts({ f: flip });

  const onSquare = (sq: SquareName) => {
    if (tool === 'pointer') return;
    setState((s) => ({ ...s, board: placePiece(s.board, sq, tool === 'eraser' ? null : tool) }));
  };

  // P1-ED-08: a pasted FEN loads only when it parses; otherwise the board
  // stays as it is and the parse error shows.
  const onFen = (text: string) => {
    const r = editorState(text);
    setTyped({ text, error: r.ok ? '' : r.message });
    if (r.ok) setState(r.state);
  };

  const top: Color = orientation === 'white' ? 'black' : 'white';
  const palette = (color: Color) => (
    <Palette color={color} tool={tool} onTool={setTool} onDrag={(piece, e) => board.current?.dragNewPiece(piece, e)} />
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section
        aria-label="Board"
        className={cn(
          'mx-auto flex w-full max-w-[min(100%,calc(100dvh-14rem))] min-w-0 flex-col gap-2',
          `pieces-${prefs.pieceSet}`,
        )}
      >
        {palette(top)}
        <Board
          ref={board}
          mode="free"
          fen={out}
          orientation={orientation}
          movable={tool === 'pointer' ? 'both' : 'none'}
          onBoardChange={(placement) => update({ board: placement })}
          onSquareClick={onSquare}
        />
        {palette(orientation)}
      </section>

      <aside aria-label="Position settings" className="flex min-w-0 flex-col gap-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setState(editorStateOf(INITIAL_FEN))}>
            Starting position
          </Button>
          <Button variant="outline" size="sm" onClick={() => update({ board: EMPTY_BOARD, ep: null })}>
            Clear board
          </Button>
          <Button variant="outline" size="sm" onClick={flip}>
            <FlipVertical2 aria-hidden /> Flip board
          </Button>
          <Button variant="outline" size="sm" onClick={() => setState(swapColors)}>
            Swap colors
          </Button>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="editor-turn">Side to move</Label>
          <Select value={state.turn} onValueChange={(v) => update({ turn: v as Color, ep: null })}>
            <SelectTrigger id="editor-turn" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="white">White to play</SelectItem>
              <SelectItem value="black">Black to play</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1.5 font-medium">Castling</legend>
          {CASTLING_TOGGLES.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <Checkbox
                id={`castle-${t}`}
                disabled={!available[t]}
                checked={state.castling[t] && available[t]}
                onCheckedChange={(v) => update({ castling: { ...state.castling, [t]: v === true } })}
              />
              <Label htmlFor={`castle-${t}`} className={cn(!available[t] && 'text-muted-foreground')}>
                {CASTLING_LABEL[t]}
              </Label>
            </div>
          ))}
        </fieldset>

        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="editor-ep">En passant</Label>
            <Select
              value={state.ep && eps.includes(state.ep) ? state.ep : 'none'}
              onValueChange={(v) => update({ ep: v === 'none' ? null : (v as SquareName) })}
              disabled={!eps.length}
            >
              <SelectTrigger id="editor-ep" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {eps.map((sq) => (
                  <SelectItem key={sq} value={sq}>
                    {sq}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="editor-halfmoves">Halfmove clock</Label>
            <Input
              id="editor-halfmoves"
              type="number"
              min={0}
              max={150}
              value={state.halfmoves}
              onChange={(e) => update({ halfmoves: Math.max(0, Math.min(150, Number(e.target.value) || 0)) })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="editor-fullmoves">Move number</Label>
            <Input
              id="editor-fullmoves"
              type="number"
              min={1}
              value={state.fullmoves}
              onChange={(e) => update({ fullmoves: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="editor-fen">FEN</Label>
          <Input
            id="editor-fen"
            className="font-mono text-xs"
            spellCheck={false}
            value={typed?.text ?? out}
            onChange={(e) => onFen(e.target.value)}
            onBlur={() => setTyped(null)}
            aria-invalid={!!typed?.error}
            aria-describedby={typed?.error ? 'editor-fen-error' : undefined}
          />
          {typed?.error && (
            <p id="editor-fen-error" role="alert" className="text-destructive">
              {typed.error} The board wasn&apos;t changed.
            </p>
          )}
        </div>

        {!check.ok && (
          <ul role="alert" aria-label="Problems with this position" className="list-disc pl-5 text-destructive">
            {check.reasons.map((r) => (
              <li key={r.code}>{r.message}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          {check.ok ? (
            <>
              <Button asChild>
                {/* A full page load: the analysis board is cross-origin isolated (P1-UI-12). */}
                <a href={`/analysis/${fenToUrl(check.fen)}`}>Analyze</a>
              </Button>
              <Button variant="outline" onClick={() => setSaving(true)}>
                Save as study chapter
              </Button>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex gap-2">
                  <Button disabled>Analyze</Button>
                  <Button variant="outline" disabled>
                    Save as study chapter
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{check.reasons.map((r) => r.message).join(' ')}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {check.ok && (
          <SaveToStudyDialog
            open={saving}
            onOpenChange={setSaving}
            signedIn={signedIn}
            source={() => ({ type: 'fen', fen: check.fen })}
          />
        )}
      </aside>
    </div>
  );
}

const editorStateOf = (fen: string) => (editorState(fen) as { ok: true; state: EditorState }).state;

// P1-ED-01/02/13: one color's pieces plus the pointer and eraser. With the
// pointer, a piece drags onto the board; clicking or tapping it makes it the
// sticky piece, placed on every square clicked until the pointer is chosen.
function Palette({
  color,
  tool,
  onTool,
  onDrag,
}: {
  color: Color;
  tool: Tool;
  onTool: (t: Tool) => void;
  onDrag: (piece: { role: Role; color: Color }, e: MouseEvent) => void;
}) {
  const sticky = (role: Role) => typeof tool === 'object' && tool.role === role && tool.color === color;
  return (
    <div
      role="toolbar"
      aria-label={`${cap(color)} pieces`}
      className="flex gap-1 overflow-x-auto rounded-md border p-1"
    >
      <ToolButton label="Move pieces" pressed={tool === 'pointer'} onClick={() => onTool('pointer')}>
        <MousePointer2 aria-hidden />
      </ToolButton>
      {ROLES.map((role) => (
        <ToolButton
          key={role}
          label={`${cap(color)} ${role}`}
          pressed={sticky(role)}
          onPointerDown={(e) => {
            if (tool === 'pointer' && e.pointerType === 'mouse' && e.button === 0)
              onDrag({ role, color }, e.nativeEvent);
          }}
          onClick={() => onTool(sticky(role) ? 'pointer' : { role, color })}
        >
          <span className={cn('cg-piece block size-full bg-cover', color, role)} />
        </ToolButton>
      ))}
      <ToolButton
        label="Eraser"
        pressed={tool === 'eraser'}
        onClick={() => onTool(tool === 'eraser' ? 'pointer' : 'eraser')}
      >
        <Eraser aria-hidden />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  label,
  pressed,
  className,
  ...rest
}: { label: string; pressed: boolean } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-md hover:bg-accent sm:size-12 [&_svg]:size-5',
        pressed && 'bg-accent ring-2 ring-ring',
        className,
      )}
      {...rest}
    />
  );
}
