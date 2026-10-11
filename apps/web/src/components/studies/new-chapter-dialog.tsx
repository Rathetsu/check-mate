'use client';

// "Add chapter" (P1-ST-02): every source goes to one endpoint. A PGN with
// several games makes one chapter each.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { api } from './api';

type Source = 'blank' | 'fen' | 'pgn' | 'lichess';
export const MODES = [
  ['normal', 'Normal analysis'],
  ['conceal', 'Hide next moves'],
  ['gamebook', 'Interactive lesson'],
  ['practice', 'Practice with computer'],
] as const;

export function NewChapterDialog({
  studyId,
  count,
  open,
  onOpenChange,
  onCreated,
}: {
  studyId: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (ids: string[]) => void;
}) {
  const [type, setType] = useState<Source>('blank');
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [mode, setMode] = useState<string>('normal');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    const source =
      type === 'blank'
        ? { type }
        : type === 'fen'
          ? { type, fen: value.trim() }
          : type === 'pgn'
            ? { type, pgn: value }
            : { type, url: value.trim() };
    try {
      const { ids } = await api<{ ids: string[] }>(`/api/v1/studies/${studyId}/chapters`, 'POST', {
        source,
        name: name.trim() || undefined,
        orientation,
        mode,
      });
      onOpenChange(false);
      setValue('');
      setName('');
      onCreated(ids);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add chapter</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="chapter-name">Name</Label>
          <Input
            id="chapter-name"
            maxLength={100}
            placeholder={`Chapter ${count + 1}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Tabs value={type} onValueChange={(v) => setType(v as Source)}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="blank">Empty</TabsTrigger>
            <TabsTrigger value="fen">FEN</TabsTrigger>
            <TabsTrigger value="pgn">PGN</TabsTrigger>
            <TabsTrigger value="lichess">Lichess game</TabsTrigger>
          </TabsList>
          <TabsContent value="blank" className="text-sm text-muted-foreground">
            Starts from the initial position.
          </TabsContent>
          <TabsContent value="fen">
            <Input
              aria-label="Position (FEN)"
              className="font-mono text-xs"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </TabsContent>
          <TabsContent value="pgn" className="grid gap-2">
            <Textarea
              aria-label="Games (PGN)"
              rows={6}
              className="font-mono text-xs"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <label className="cursor-pointer text-sm text-primary underline-offset-4 hover:underline">
              Open a file
              <input
                type="file"
                accept=".pgn,.txt,application/x-chess-pgn"
                className="sr-only"
                onChange={async (e) => e.target.files?.[0] && setValue(await e.target.files[0].text())}
              />
            </label>
            <p className="text-xs text-muted-foreground">Each game becomes its own chapter.</p>
          </TabsContent>
          <TabsContent value="lichess" className="grid gap-1.5">
            <Input
              aria-label="Lichess game link"
              placeholder="https://lichess.org/abcd1234"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">We download that one game from Lichess when you add it.</p>
          </TabsContent>
        </Tabs>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="chapter-orientation">Board faces</Label>
            <Select value={orientation} onValueChange={(v) => setOrientation(v as 'white' | 'black')}>
              <SelectTrigger id="chapter-orientation" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="chapter-mode">Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger id="chapter-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button onClick={submit} disabled={busy || (type !== 'blank' && !value.trim())}>
            {busy ? 'Adding…' : 'Add chapter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
