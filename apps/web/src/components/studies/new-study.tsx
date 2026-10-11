'use client';

// "New study" (P1-ST-01): a name, then straight into chapter 1.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from './api';

export function NewStudy() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id, chapterId } = await api<{ id: string; chapterId: string }>('/api/v1/studies', 'POST', { name });
      router.push(`/studies/${id}/${chapterId}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New study</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={create} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>New study</DialogTitle>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="new-study-name">Name</Label>
            <Input
              id="new-study-name"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
