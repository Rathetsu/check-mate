import { publishPresence, studyHello, subscribe, type StudyEvent } from '@checkmate/core';
import { publicRoute } from '@/lib/api';

const HEARTBEAT_MS = 15_000;

// Live study events over SSE (P1-ST-31, ADR 2026-10-11-04). `hello` comes
// first with every chapter's version, so a fresh or reconnected client can
// catch up. A study the caller can't read is a 404, which stops EventSource
// from retrying. `no-transform` keeps Next's compression and Caddy's
// `encode` from buffering the stream.
export const GET = publicRoute<{ id: string }>(async ({ userId, req, params }) => {
  const hello = await studyHello(userId, params.id);
  const studyId = params.id;
  const enc = new TextEncoder();
  let stop = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let done = false;
      const write = (chunk: string) => {
        try {
          controller.enqueue(enc.encode(chunk));
        } catch {
          stop(); // the client is gone
        }
      };
      const send = (e: StudyEvent | ({ type: 'hello' } & typeof hello)) =>
        write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
      const unsubscribe = subscribe(studyId, {
        userId,
        member: hello.role !== 'reader',
        send,
        close: () => stop(),
      });
      const beat = setInterval(() => write(': ping\n\n'), HEARTBEAT_MS);
      const onAbort = () => stop();
      // One idempotent cleanup for cancel(), an aborted request, a failed
      // write, and an access change (closeStudy).
      stop = () => {
        if (done) return;
        done = true;
        clearInterval(beat);
        unsubscribe();
        req.signal.removeEventListener('abort', onAbort);
        try {
          controller.close();
        } catch {}
        publishPresence(studyId);
      };
      req.signal.addEventListener('abort', onAbort);
      write('retry: 3000\n\n');
      send({ type: 'hello', ...hello });
      publishPresence(studyId);
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
});
