import { Hono } from "hono";

const app = new Hono();

// store all active SSE clients
type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

const clients: SSEClient[] = [];
const encoder = new TextEncoder();

/**
 * Proxies (Fly's included) drop idle connections after ~60s. A periodic
 * comment frame keeps the stream alive. Comment frames start with ':' and
 * are ignored by EventSource.
 */
const HEARTBEAT_MS = 25_000;

function removeClient(id: string) {
  const index = clients.findIndex((c) => c.id === id);
  if (index !== -1) clients.splice(index, 1);
}

// broadcast to all connected clients
export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    try {
      client.controller.enqueue(encoder.encode(payload));
    } catch {
      // client disconnected, will be cleaned up
    }
  }
}

app.get("/", (c) => {
  const clientId = crypto.randomUUID();
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      clients.push({ id: clientId, controller });

      // send initial connection confirmation
      const welcome = `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`;
      controller.enqueue(encoder.encode(welcome));

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(heartbeat);
          removeClient(clientId);
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      clearInterval(heartbeat);
      removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      // Disable proxy buffering; without this some proxies hold the stream.
      "X-Accel-Buffering": "no",
    },
  });
});

export default app;
