import { useEffect, useRef } from "react";
import { isStaticFirebasePreview } from "@/lib/runtimeMode";

export function useEditorialLive(onEvent: () => void) {
  const callback = useRef(onEvent);
  callback.current = onEvent;
  useEffect(() => {
    if (isStaticFirebasePreview) return;
    let retry: number | undefined;
    const events = new EventSource("/api/editorial/events");
    events.addEventListener("editorial", () => callback.current());
    events.onerror = () => {
      events.close();
      retry = window.setTimeout(() => window.location.reload(), 4000);
    };
    return () => { events.close(); if (retry) window.clearTimeout(retry); };
  }, []);
}
