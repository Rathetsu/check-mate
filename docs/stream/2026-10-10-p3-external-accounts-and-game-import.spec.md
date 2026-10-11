# Spec: External accounts, game import and sync

Date: 2026-10-10
Status: Approved (design; no code yet)
Phase: 3 · Milestones M3.1 (linking) and M3.2 (import/sync jobs)

## Goal

Users connect Lichess and/or Chess.com, import their full game history once,
store it permanently, and later sync only new games. Manual PGN files import
through the same pipeline. Imports run in the background, with visible
progress, per-game failure handling, retries and no duplicates.

Decisions: 2026-10-10-10-better-auth-for-accounts-and-lichess-oauth ·
2026-10-10-11-raw-player-data-append-only-aggregates-derived ·
2026-10-10-06-postgres-drizzle-and-pg-boss ·
2026-10-10-14-self-hosted-opening-explorer-from-licensed-data (Chess.com
data stays private) ·
2026-10-10-18-import-own-chesscom-games-accepted-risk.

## Scope

In: linking and unlinking, initial import, manual sync, manual PGN upload,
the `games` table, import runs, failures, retries, progress UI, rate-limit
compliance.
Out: scouting other players' games, automatic scheduled sync (architected,
not enabled: COULD), the library UI (p3-game-library spec), position
indexing (p3-personal-opening-tree spec).

## Linking

- **P3-IM-01 MUST** **Lichess:** linked via OAuth PKCE. This is the Better
  Auth `genericOAuth` provider `lichess`, called with `linkSocial`, using the
  redirect flow and no scopes. Reasons:
  - It proves the user owns the account.
  - It enables the 60 games/s own-games export rate.
  - Lichess has announced that anonymous exports will be throttled or
    blocked.
  - The callback reads `/api/account`, stores `platform_user_id` and
    `username`, and creates the `external_accounts` row.
- **P3-IM-02 MUST** **Chess.com:** linked by username, because Chess.com has
  no third-party OAuth. This is an accepted risk with mitigations
  (2026-10-10-18-import-own-chesscom-games-accepted-risk).
  - The username is checked with `GET /pub/player/{username}`; a 404 gives
    "No such Chess.com user".
  - Stored with `verified=false`.
  - The UI says ownership isn't verified, and that only public games are
    imported.
- **P3-IM-03 MUST** One Lichess account can be linked by only one CheckMate
  user, enforced by `UNIQUE(platform, platform_user_id)` where `verified`.
  Unverified Chess.com usernames may be linked by several users.
- **P3-IM-04 MUST** A user can link at least one Lichess and at least one
  Chess.com account at the same time. SHOULD: several accounts per platform.
- **P3-IM-05 MUST** Lichess tokens:
  - Stored encrypted at rest with AES-256-GCM, key from env. Use Better
    Auth's token encryption if the pinned version has it; otherwise use a DB
    hook wrapper. Verify at build time.
  - Never sent to the browser.
  - A 401 sets `needs_reauth`, and the UI offers "Reconnect".
- **P3-IM-06 MUST** Unlink asks "Keep imported games" or "Delete them".
  Lichess unlink also revokes the token (`DELETE /api/token`).
- **P3-IM-07 MUST** Linking starts the initial import automatically.
- **P3-IM-08 MUST** At most 3 linked Chess.com usernames per CheckMate user.
  Imports run only for linked usernames. No endpoint imports an arbitrary
  player's games (ADR 18).

## Import and sync jobs

- **P3-IM-10 MUST** Queues:
  - `import:lichess` and `import:chesscom`, `singletonKey = external_account_id`, so an account never has two concurrent runs.
  - `import:chesscom` runs with global concurrency 1, because Chess.com
    allows serial access only.
  - `import:lichess` runs one request per token at a time.
- **P3-IM-11 MUST** **Lichess fetch:**
  `GET /api/games/user/{username}?sort=dateAsc&since={cursor}&pgnInJson=true&clocks=true&evals=true&opening=true&accuracy=true&tags=true`
  with `Accept: application/x-ndjson` and `Authorization: Bearer`.
  - The ndjson response is streamed.
  - A checkpoint is written every 500 games: the cursor is the last
    `createdAt` + 1 and is saved to `import_runs` and `external_accounts`.
  - Ongoing games are excluded.
- **P3-IM-12 MUST** **Chess.com fetch:**
  1. `GET /pub/player/{u}/games/archives`.
  2. For each month ≥ the cursor month, request it in order with
     `If-None-Match` set to the stored ETag. A 304 means skip.
  3. The current month is always re-requested.
  4. Each month's ETag is stored in `chesscom_archive_state`.
  5. Every request sends `User-Agent: CheckMate/<version> (+<contact email>)`.
- **P3-IM-13 MUST** Rate limits:
  - On 429, back off for at least 60 s, then resume from the checkpoint.
  - Network or 5xx errors go to pg-boss retries (limit 5, exponential
    backoff), which also resume from the checkpoint.
  - A run that exhausts its retries ends `failed`. Games already stored are
    kept.
- **P3-IM-14 MUST** Each game is processed in its own transaction:
  1. Validate the moves through `packages/chess`.
  2. Normalize the game (mapping below).
  3. Upsert-ignore on `UNIQUE(user_id, source, source_game_id)`.
  4. Enqueue position indexing for new games.
  - A validation or normalization failure writes an `import_failures` row
    (with the raw payload) and the run continues.
- **P3-IM-15 MUST** Sync is the same job with the stored cursor. It imports
  only missing games, and duplicates are counted, not re-inserted.
- **P3-IM-16 MUST** The "Retry failed" action re-processes `import_failures`
  rows from their stored raw payload, so the platform is not called again.
- **P3-IM-17 COULD** Scheduled sync: a daily pg-boss schedule per account,
  behind a feature flag and off in the initial release.
- **P3-IM-18 MUST** Kill switch: when `CHESSCOM_IMPORT_ENABLED=false`:
  - Chess.com linking is hidden.
  - Queued and new `import:chesscom` jobs are no-ops.
  - Existing games stay.
  - The UI points to manual PGN upload (Chess.com's own archive download).
- **P3-IM-19 MUST** Takedown runbook (written in `docs/wiki` when built).
  On a request from Chess.com or a user:
  1. Flip the kill switch if the request covers all imports.
  2. Delete the specified games, or all `source='chesscom'` games, together
     with their derived positions.
  3. Record the request and the action in a stream `decision-record`.
  4. Treat it as a legal-review trigger
     (2026-10-10-17-self-administered-license-compliance).

## Normalization

| `games` column | Lichess ndjson | Chess.com game |
|---|---|---|
| `source_game_id` | `id` | `uuid` |
| `source_url` | `https://lichess.org/{id}` | `url` |
| `played_at` (game end) | `lastMoveAt` | `end_time` |
| `white_name/black_name` | `players.*.user.name` | `white/black.username` |
| `white_rating/black_rating` | `players.*.rating` | `white/black.rating` |
| `result` | `winner` / `status` → `1-0 \| 0-1 \| 1/2-1/2` | `white/black.result` codes → same |
| `termination` | `status` | the losing side's result code (`checkmated`, `timeout`, `resigned`, …) |
| `time_control` | `clock.initial+increment` | `time_control` (`180+2`, `1/86400`) |
| `speed` | `speed` | from `time_control` via Lichess estimate (`base + 40·inc`); `daily` → `correspondence` |
| `rated` | `rated` | `rated` |
| `variant` | `variant` | `rules` (`chess` → standard) |
| `source_eco/source_opening` | `opening.eco/name` | PGN `[ECO]` and `[ECOUrl]` (Chess.com's `eco` field is a URL) |
| `pgn` | `pgn` | `pgn` |
| `raw` | the full ndjson object | the full game object |

- **P3-IM-20 MUST** `user_color` is the side whose name matches the linked
  username (case-insensitive). `user_result` is win/draw/loss from that side.
  Both are null for uploads where the user didn't identify themselves.
- **P3-IM-21 MUST** Non-standard variants are stored raw with their
  `variant` and excluded from trees (CORE-70).
- **P3-IM-22 MUST** Imported evals and accuracies stay in `raw` and in PGN
  comments, labelled with their source. They are never shown as CheckMate
  analysis (2026-10-10-02).

## Manual PGN upload

- **P3-IM-30 MUST** Upload `.pgn` up to 50 MB. The file goes to the
  `uploads` volume shared by web and worker, and is deleted after the run.
- **P3-IM-31 MUST** A preview job parses only headers and returns the game
  count, date range, and player names by frequency. The user then picks
  which names are "me", pre-filled from linked usernames.
- **P3-IM-32 MUST** Source detection: if `[Site]` or `[Link]` is a Lichess
  or Chess.com game URL, the game is stored as that `source` with that id, so
  it dedups against API imports. Otherwise it is stored as
  `source='pgn_upload'` with `source_game_id = gameFingerprint`.
- **P3-IM-33 MUST** A file with invalid games imports the valid ones, and
  each failure gets a row showing game index, line and reason.

## Data model

```
games (id uuid PK, user_id FK CASCADE, external_account_id FK null ON DELETE SET NULL,
  source text, source_game_id text, source_url text null,
  played_at timestamptz, white_name text, black_name text,
  white_rating int null, black_rating int null, result text, termination text null,
  time_control text null, speed text, rated bool null, variant text,
  source_eco text null, source_opening text null,
  user_color text null, user_result text null,
  pgn text, raw jsonb, import_run_id FK, imported_at timestamptz,
  -- derived (rebuildable; see opening-tree spec):
  opening_eco text null, opening_name text null, opening_ply int null, positions_indexed_at timestamptz null,
  UNIQUE (user_id, source, source_game_id))
INDEX (user_id, played_at DESC); INDEX (user_id, user_color, speed); GIN trigram on white_name, black_name

import_runs (id uuid PK, user_id FK CASCADE, external_account_id FK null, upload_id null,
  kind text,            -- 'initial'|'sync'|'pgn_upload'|'retry'
  status text,          -- 'queued'|'running'|'succeeded'|'partial'|'failed'
  cursor_before text, cursor_after text,
  seen int, inserted int, duplicates int, failed int,
  expected_total int null, progress_note text,
  started_at, finished_at, error text null)

import_failures (id uuid PK, user_id FK CASCADE, import_run_id FK,
  source text, source_game_id text null, raw text,
  error_code text, error_message text, resolved_at timestamptz null, created_at)

chesscom_archive_state (external_account_id FK CASCADE, month text, etag text,
  last_fetched_at timestamptz, PRIMARY KEY (external_account_id, month))

pgn_uploads (id uuid PK, user_id FK CASCADE, filename text, bytes int, path text,
  preview jsonb, my_names text[], status text, created_at)
```

`external_accounts` gains `sync_cursor text`, `verified bool`, and `last_run_id`.

## API surface

- Lichess linking: Better Auth client `linkSocial({ provider: 'lichess' })`. The callback hook creates the account row and enqueues an import.
- `POST /api/v1/external-accounts/chesscom` with `{username}`, returns the account plus `{runId}`.
- `DELETE /api/v1/external-accounts/:id?deleteGames=bool`
- `POST /api/v1/external-accounts/:id/sync`, returns `{runId}` (409 if a run is already active).
- `GET /api/v1/import-runs?accountId=`; `GET /api/v1/import-runs/:id`. The UI polls every 2 s while a run is active.
- `POST /api/v1/import-runs/:id/retry-failures`
- `POST /api/v1/pgn-uploads` (multipart), returns `{uploadId}`. `GET /api/v1/pgn-uploads/:id` returns the preview. `POST /api/v1/pgn-uploads/:id/import` with `{myNames[]}`.

## Reuse

| Component | Mode |
|---|---|
| Lichess API and OAuth, Chess.com PubAPI | external services (terms in the reuse register) |
| OpeningTree fetch logic | reference only (perspective, URL formats); not copied |
| Pipeline, schema, UI | independent |

## Chess-authority notes

Every stored game was validated move-by-move by the rules layer. Results and
perspective come from the source data, never inferred.

## Phase 4 hooks

`games.raw` keeps everything the platforms gave us (clocks, evals,
accuracies), and `/api/v1/games` exposes it. The checkpointed cursors also
support future automatic sync.

## Acceptance criteria

- Against a recorded Lichess ndjson fixture plus a mocked server: an initial
  import of 1,200 games is followed by a sync with 3 new games → 3 inserted,
  0 duplicates. Killing the worker mid-run, then resuming, gives the same
  final count.
- Chess.com fixture: archives for 3 months; a re-sync with unchanged ETags
  makes only the current-month request.
- A mocked 429 makes the job wait at least 60 s, then continue from the
  checkpoint.
- Uploading the same Lichess games as PGN after an API import → 0 inserted,
  all counted as duplicates.
- A malformed game in an upload lands in `import_failures`, and the other
  games import.
- User B can't see user A's runs, failures or uploads (CORE-52).
- Unlink with "delete games" removes those games and their positions.
- Linking a 4th Chess.com username is rejected with a clear message.
- With `CHESSCOM_IMPORT_ENABLED=false`, linking is hidden, a queued Chess.com
  job completes as a no-op, and existing games remain.

## Open questions

None. Chess.com personal import was decided as an accepted risk on
2026-10-10 (ADR 18).
