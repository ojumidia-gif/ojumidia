import { describe, expect, it } from "vitest";
import { firebasePreviewAssets, hasAnalyticsConfiguration } from "./runtimeMode";

describe("runtime mode configuration", () => {
  it("only accepts complete analytics settings without Vite placeholders", () => {
    expect(hasAnalyticsConfiguration("https://analytics.example", "site-1")).toBe(true);
    expect(hasAnalyticsConfiguration("%VITE_ANALYTICS_ENDPOINT%", "site-1")).toBe(false);
    expect(hasAnalyticsConfiguration("https://analytics.example", "%VITE_ANALYTICS_WEBSITE_ID%")).toBe(false);
    expect(hasAnalyticsConfiguration(undefined, "site-1")).toBe(false);
  });

  it("uses explicit local asset paths for the Firebase visual preview", () => {
    expect(firebasePreviewAssets.brandUrl).toBe("/oju-assets/oju-midia-marca.png");
    expect(firebasePreviewAssets.heroVideoUrl).toBe("/oju-assets/orixas-transicao-ritual-cinematografica.mp4");
  });
});
