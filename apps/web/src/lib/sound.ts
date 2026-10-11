// Move sounds from the user's sound set (P1-AC-09). Files are the
// allowlisted Enigmahack sets copied by scripts/fetch-lila-assets.sh.
const cache = new Map<string, HTMLAudioElement>();

export function playMoveSound(set: string, capture: boolean) {
  if (set === 'off' || typeof Audio === 'undefined') return;
  const src = `/assets/sound/${set}/${capture ? 'Capture' : 'Move'}.mp3`;
  let audio = cache.get(src);
  if (!audio) cache.set(src, (audio = new Audio(src)));
  audio.currentTime = 0;
  audio.play().catch(() => {}); // autoplay can be blocked until the first click
}
