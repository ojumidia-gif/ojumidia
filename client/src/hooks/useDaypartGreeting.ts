import { useEffect, useState } from "react";
import { greetingFromHour, localHour, msUntilNextDaypart } from "@/lib/daypartGreeting";

export function useDaypartGreeting() {
  const [greeting, setGreeting] = useState(() => greetingFromHour(localHour()));
  useEffect(() => {
    let timeout = 0;
    const sync = () => {
      setGreeting(greetingFromHour(localHour()));
      window.clearTimeout(timeout);
      timeout = window.setTimeout(sync, msUntilNextDaypart());
    };
    sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return greeting;
}
