import { afterEach, describe, expect, it, vi } from "vitest";
import { openEditorialEventStream, publishEditorialEvent } from "./editorialEvents";

type Listener = () => void;
function responseSpy() {
  const writes: string[] = []; const listeners = new Map<string, Listener>();
  return { writes, writeHead: vi.fn(), write: vi.fn((value: string) => writes.push(value)), on: vi.fn((event: string, listener: Listener) => listeners.set(event, listener)), close: () => listeners.get("close")?.() };
}

afterEach(() => vi.useRealTimers());

describe("sincronização editorial por eventos", () => {
  it("abre o stream, publica mudança identificável e encerra o assinante", () => {
    vi.useFakeTimers(); const response = responseSpy();
    openEditorialEventStream(response as never);
    publishEditorialEvent("publication-updated", 42);
    expect(response.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ "Content-Type": "text/event-stream" }));
    expect(response.writes[0]).toContain("connected");
    expect(response.writes[1]).toContain('"kind":"publication-updated"');
    expect(response.writes[1]).toContain('"entityId":42');
    response.close(); vi.advanceTimersByTime(25000);
    expect(response.writes).toHaveLength(2);
  });
});
