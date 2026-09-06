export const FIRST_GUIDE_STORAGE_KEY = "oju-hide-first-guide";

export function isFirstGuideHidden() {
  return window.localStorage.getItem(FIRST_GUIDE_STORAGE_KEY) === "1";
}

export function hideFirstGuide() {
  window.localStorage.setItem(FIRST_GUIDE_STORAGE_KEY, "1");
}

export function showFirstGuideAgain() {
  window.localStorage.removeItem(FIRST_GUIDE_STORAGE_KEY);
}
