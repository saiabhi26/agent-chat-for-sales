import { Hono } from "hono";

const app = new Hono();

// store all active SSE clients
type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

const clients: SSEClient[] = [];

// broadcast to all connected clients
export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    try {
      client.controller.enqueue(new TextEncoder().encode(payload));
    } catch {
      // client disconnected, will be cleaned up
    }
  }
}

app.get("/", (c) => {
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      clients.push({ id: clientId, controller });

      // send initial connection confirmation
      const welcome = `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(welcome));
    },
    cancel() {
      const index = clients.findIndex((c) => c.id === clientId);
      if (index !== -1) clients.splice(index, 1);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

export default app;