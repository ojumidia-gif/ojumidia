export type Daypart = "manha" | "tarde" | "noite";

export function localHour(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23" }).format(now));
  return Number.isFinite(hour) ? hour : now.getHours();
}

export function daypartFromHour(hour: number): Daypart {
  if (hour >= 5 && hour < 12) return "manha";
  if (hour >= 12 && hour < 18) return "tarde";
  return "noite";
}

export function greetingFromDaypart(part: Daypart) {
  if (part === "manha") return "Bom dia.";
  if (part === "tarde") return "Boa tarde.";
  return "Boa noite.";
}

export function greetingFromHour(hour: number) {
  return greetingFromDaypart(daypartFromHour(hour));
}

export function msUntilNextDaypart(now = new Date()) {
  const hour = localHour(now);
  const nextHour = hour < 5 ? 5 : hour < 12 ? 12 : hour < 18 ? 18 : 29;
  const target = new Date(now.getTime());
  if (nextHour >= 24) {
    target.setDate(target.getDate() + 1);
    target.setHours(nextHour - 24, 0, 0, 0);
  } else {
    target.setHours(nextHour, 0, 0, 0);
  }
  return Math.max(1_000, target.getTime() - now.getTime());
}
