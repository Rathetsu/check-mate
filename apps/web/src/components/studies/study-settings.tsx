'use client';

// Study settings, owner only (P1-ST-01, P1-ST-11, P1-ST-21): name,
// description, visibility, what others may do, topics, delete.
import type { StudyDetail, StudySettings } from '@checkmate/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api } from './api';

export function StudySettingsDialog({
  study,
  open,
  onOpenChange,
  onSaved,
}: {
  study: StudyDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(study.name);
  const [description, setDescription] = useState(study.description);
  const [visibility, setVisibility] = useState(study.visibility);
  const [settings, setSettings] = useState<StudySettings>(study.settings);
  const [topics, setTopics] = useState(study.topics.join(', '));
  const [error, setError] = useState('');

  const save = async () => {
    try {
      await api(`/api/v1/studies/${study.id}`, 'PATCH', {
        name,
        description,
        visibility,
        settings,
        topics: topics
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const remove = async () => {
    if (!confirm(`Delete "${study.name}" and all its chapters? This can't be undone.`)) return;
    try {
      await api(`/api/v1/studies/${study.id}`, 'DELETE');
      toast.success('Study deleted');
      router.push('/studies');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Study settings</DialogTitle>
          <DialogDescription>Only you, the owner, can change these.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="study-name">Name</Label>
          <Input id="study-name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="study-description">Description</Label>
          <Textarea
            id="study-description"
            maxLength={2000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Choice
          id="study-visibility"
          label="Who can see it"
          value={visibility}
          onChange={setVisibility}
          options={[
            ['private', 'Only me and invited members'],
            ['unlisted', 'Anyone with the link'],
            ['public', 'Everyone (listed in public studies)'],
          ]}
        />
        <Choice
          id="study-cloneable"
          label="Who can copy it"
          value={settings.cloneable}
          onChange={(cloneable) => setSettings((s) => ({ ...s, cloneable: cloneable as StudySettings['cloneable'] }))}
          options={RULES}
        />
        <Choice
          id="study-shareable"
          label="Who can export it"
          value={settings.shareable}
          onChange={(shareable) => setSettings((s) => ({ ...s, shareable: shareable as StudySettings['shareable'] }))}
          options={RULES}
        />
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="study-computer">Computer analysis for others</Label>
          <Switch
            id="study-computer"
            checked={settings.computer}
            onCheckedChange={(computer) => setSettings((s) => ({ ...s, computer }))}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="study-sticky">Members follow the shared position</Label>
          <Switch
            id="study-sticky"
            checked={settings.sticky}
            onCheckedChange={(sticky) => setSettings((s) => ({ ...s, sticky }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="study-topics">Topics</Label>
          <Input
            id="study-topics"
            placeholder="Sicilian, endgames, tactics"
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Up to 10, separated by commas.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter className="sm:justify-between">
          <Button variant="destructive" onClick={remove}>
            Delete study
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const RULES: [string, string][] = [
  ['everyone', 'Everyone who can see it'],
  ['contributors', 'Contributors only'],
  ['nobody', 'Only me'],
];

function Choice({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([v, text]) => (
            <SelectItem key={v} value={v}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
