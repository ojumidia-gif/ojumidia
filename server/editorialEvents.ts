import type { Request, Response } from "express";

const clients = new Set<Response>();
export const MAX_SSE_CLIENTS = 12;

export function openEditorialEventStream(response: Response, request?: Request) {
  if (clients.size >= MAX_SSE_CLIENTS) {
    response.status(429).json({ error: "sse_capacity" });
    return;
  }
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  response.write("event: editorial\ndata: connected\n\n");
  clients.add(response);
  const keepAlive = setInterval(() => response.write(": keep-alive\n\n"), 25000);
  const close = () => {
    clearInterval(keepAlive);
    clients.delete(response);
  };
  request?.on("close", close);
  response.on("close", close);
}

export function publishEditorialEvent(kind: string, entityId?: number) {
  const payload = JSON.stringify({ kind, entityId, occurredAt: Date.now() });
  clients.forEach(client => client.write(`event: editorial\ndata: ${payload}\n\n`));
}

export function editorialEventClientCount() {
  return clients.size;
}
