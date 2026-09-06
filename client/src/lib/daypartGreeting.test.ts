import { describe, expect, it } from "vitest";
import { daypartFromHour, greetingFromHour } from "./daypartGreeting";

describe("saudação administrativa pelo período do dia", () => {
  it("usa a hora local: madrugada é noite, manhã começa às 5", () => {
    expect(daypartFromHour(0)).toBe("noite");
    expect(daypartFromHour(4)).toBe("noite");
    expect(greetingFromHour(21)).toBe("Boa noite.");
    expect(greetingFromHour(5)).toBe("Bom dia.");
    expect(greetingFromHour(11)).toBe("Bom dia.");
    expect(greetingFromHour(12)).toBe("Boa tarde.");
    expect(greetingFromHour(17)).toBe("Boa tarde.");
    expect(greetingFromHour(18)).toBe("Boa noite.");
  });
});
