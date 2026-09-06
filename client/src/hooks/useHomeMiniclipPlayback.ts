import { HOME_MINICLIP_DISPLAY_SECONDS, HOME_MINICLIP_PRELOAD_AHEAD_MS } from "@shared/const";
import { useEffect, useRef, useState } from "react";

export function useHomeMiniclipPlayback(
  videoCount: number,
  sequenceKey: string,
  isMuted: boolean,
  videoRefs: React.MutableRefObject<Array<HTMLVideoElement | null>>,
) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroCycle, setHeroCycle] = useState(0);
  const [preloadNext, setPreloadNext] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const remainingMsRef = useRef(HOME_MINICLIP_DISPLAY_SECONDS * 1000);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    const onVisibility = () => {
      const visible = !document.hidden;
      if (!visible) {
        remainingMsRef.current = Math.max(0, remainingMsRef.current - (Date.now() - lastTickRef.current));
        videoRefs.current.forEach(video => video?.pause());
      } else {
        lastTickRef.current = Date.now();
        const active = videoRefs.current[heroIndex];
        if (active) void active.play().catch(() => {});
      }
      setPageVisible(visible);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [heroIndex, videoRefs]);

  useEffect(() => {
    setHeroIndex(index => (videoCount ? index % videoCount : 0));
  }, [videoCount, sequenceKey]);

  useEffect(() => {
    if (!pageVisible) return;
    lastTickRef.current = Date.now();
    const remaining = remainingMsRef.current || HOME_MINICLIP_DISPLAY_SECONDS * 1000;
    const preloadAt = Math.max(0, remaining - HOME_MINICLIP_PRELOAD_AHEAD_MS);
    const preloadTimer = window.setTimeout(() => setPreloadNext(true), preloadAt);
    const rotateTimer = window.setTimeout(() => {
      remainingMsRef.current = HOME_MINICLIP_DISPLAY_SECONDS * 1000;
      setPreloadNext(false);
      setHeroIndex(index => (index + 1) % Math.max(videoCount, 1));
      setHeroCycle(cycle => cycle + 1);
    }, remaining);
    return () => {
      window.clearTimeout(preloadTimer);
      window.clearTimeout(rotateTimer);
    };
  }, [heroIndex, heroCycle, pageVisible, videoCount, sequenceKey]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === heroIndex) {
        try { video.currentTime = 0; } catch { /* seek before metadata */ }
        if (!document.hidden) void video.play().catch(() => {});
      } else {
        video.pause();
        try { video.currentTime = 0; } catch { /* ignore */ }
      }
    });
  }, [heroIndex, heroCycle, sequenceKey, videoRefs]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      video.muted = isMuted || index !== heroIndex;
    });
  }, [isMuted, heroIndex, sequenceKey, videoRefs]);

  useEffect(() => {
    if (!preloadNext || videoCount < 2) return;
    const next = (heroIndex + 1) % videoCount;
    if (next === heroIndex) return;
    const video = videoRefs.current[next];
    if (!video) return;
    video.preload = "auto";
  }, [preloadNext, heroIndex, videoCount, videoRefs]);

  const selectIndex = (index: number) => {
    remainingMsRef.current = HOME_MINICLIP_DISPLAY_SECONDS * 1000;
    setPreloadNext(false);
    setHeroIndex(index);
    setHeroCycle(cycle => cycle + 1);
  };

  return {
    heroIndex,
    preloadNext,
    nextIndex: (heroIndex + 1) % Math.max(videoCount, 1),
    selectIndex,
    pageVisible,
  };
}
