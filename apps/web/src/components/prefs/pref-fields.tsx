'use client';

// Preference controls shared by the settings page and the board's engine
// settings. Values are validated again by the server (preferencesSchema).
import type { Preferences } from '@checkmate/core/shared';
import { toast } from 'sonner';
import { saveDevice, useDeviceSettings } from '@/components/analysis/use-engine';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { usePrefs } from '@/lib/prefs';

export const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');

type Opt = string | number | null;
const encode = (v: Opt) => (v === null ? 'none' : String(v));

// Values are validated again by the server (preferencesSchema).
export function PrefSelect({
  name,
  label: text,
  options,
  format = (v) => label(String(v)),
}: {
  name: keyof Preferences;
  label: string;
  options: readonly Opt[];
  format?: (v: Opt) => string;
}) {
  const { prefs, update } = usePrefs();
  const id = `pref-${name}`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{text}</Label>
      <Select
        value={encode(prefs[name] as Opt)}
        onValueChange={(raw) => {
          const value = options.find((o) => encode(o) === raw);
          if (value !== undefined) save(update, { [name]: value });
        }}
      >
        <SelectTrigger id={id} className="w-full sm:w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={encode(o)} value={encode(o)}>
              {format(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PrefSwitch({ name, label: text }: { name: keyof Preferences; label: string }) {
  const { prefs, update } = usePrefs();
  const id = `pref-${name}`;
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id}>{text}</Label>
      <Switch id={id} checked={prefs[name] === true} onCheckedChange={(v) => save(update, { [name]: v })} />
    </div>
  );
}

function save(update: (p: Partial<Preferences>) => Promise<void>, patch: Record<string, unknown>) {
  update(patch as Partial<Preferences>).then(
    () => toast.success('Saved'),
    (err: Error) => toast.error(err.message),
  );
}

// P1-AN-13/14. Threads, hash and the arrow depend on the device, so they stay in this browser.
export function EngineFields() {
  const { device, maxThreads } = useDeviceSettings();
  return (
    <>
      <PrefSwitch name="engineEnabled" label="Turn the engine on when I open the analysis board" />
      <PrefSelect
        name="engineFlavor"
        label="Engine"
        options={['lite', 'full']}
        format={(v) => (v === 'lite' ? 'Stockfish Lite (fast to load)' : 'Stockfish Full (about 94 MB download)')}
      />
      <PrefSelect name="engineMultipv" label="Lines shown" options={[1, 2, 3, 4, 5]} />
      <PrefSelect
        name="engineDepth"
        label="Search depth"
        options={[null, 16, 20, 24, 30, 40]}
        format={(v) => (v === null ? 'Unlimited' : String(v))}
      />
      <DeviceSelect
        id="engine-threads"
        label={maxThreads > 1 ? 'Threads' : 'Threads (this page can only use 1)'}
        value={Math.min(device.threads, maxThreads)}
        options={Array.from({ length: maxThreads }, (_, i) => i + 1)}
        onChange={(threads) => saveDevice({ ...device, threads })}
      />
      <DeviceSelect
        id="engine-hash"
        label="Memory (hash)"
        value={device.hashMb}
        options={[16, 32, 64, 128, 256]}
        format={(v) => `${v} MB`}
        onChange={(hashMb) => saveDevice({ ...device, hashMb })}
      />
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="engine-arrow">Show the best move as an arrow</Label>
        <Switch
          id="engine-arrow"
          checked={device.bestArrow}
          onCheckedChange={(bestArrow) => saveDevice({ ...device, bestArrow })}
        />
      </div>
    </>
  );
}

function DeviceSelect({
  id,
  label: text,
  value,
  options,
  format = String,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  options: number[];
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{text}</Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))} disabled={options.length < 2}>
        <SelectTrigger id={id} className="w-full sm:w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={String(o)}>
              {format(o)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
