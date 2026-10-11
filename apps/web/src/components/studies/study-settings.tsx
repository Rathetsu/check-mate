'use client';

// Study settings, owner only (P1-ST-01): name, description, delete.
import type { StudyDetail } from '@checkmate/core';
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
  const [error, setError] = useState('');

  const save = async () => {
    try {
      await api(`/api/v1/studies/${study.id}`, 'PATCH', { name, description });
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
