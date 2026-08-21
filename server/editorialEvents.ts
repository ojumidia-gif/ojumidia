import type { Response } from "express";

const clients = new Set<Response>();

export function openEditorialEventStream(response: Response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });
  response.write("event: editorial\ndata: connected\n\n");
  clients.add(response);
  const keepAlive = setInterval(() => response.write(": keep-alive\n\n"), 25000);
  response.on("close", () => { clearInterval(keepAlive); clients.delete(response); });
}

export function publishEditorialEvent(kind: string, entityId?: number) {
  const payload = JSON.stringify({ kind, entityId, occurredAt: Date.now() });
  clients.forEach(client => client.write(`event: editorial\ndata: ${payload}\n\n`));
}
