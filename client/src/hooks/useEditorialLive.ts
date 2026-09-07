import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { isStaticFirebasePreview } from "@/lib/runtimeMode";

const EDITORIAL_LIVE_ROLES = new Set([
  "editor",
  "aprovador",
  "administrador",
  "administrador principal",
]);

/**
 * Live editorial updates for signed-in desk roles.
 * Visitors must not open EventSource: the stream is authenticated, and a
 * 401 error handler used to refresh the whole document, which made the public site blink.
 */
export function useEditorialLive(onEvent: () => void) {
  const callback = useRef(onEvent);
  callback.current = onEvent;
  const me = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const canSubscribe = Boolean(me.data?.role && EDITORIAL_LIVE_ROLES.has(me.data.role));

  useEffect(() => {
    if (isStaticFirebasePreview || !canSubscribe) return;
    let source: EventSource | null = null;
    let retry: number | undefined;
    let stopped = false;
    let openedAt = 0;

    const connect = () => {
      if (stopped) return;
      source = new EventSource("/api/editorial/events");
      openedAt = 0;
      source.onopen = () => {
        openedAt = Date.now();
      };
      source.addEventListener("editorial", () => callback.current());
      source.onerror = () => {
        source?.close();
        source = null;
        if (stopped) return;
        const connected = openedAt > 0 && Date.now() - openedAt > 1500;
        if (!connected) return;
        retry = window.setTimeout(connect, 15_000);
      };
    };

    connect();
    return () => {
      stopped = true;
      source?.close();
      if (retry) window.clearTimeout(retry);
    };
  }, [canSubscribe]);
}
