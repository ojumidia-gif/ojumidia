import type { Page, Response } from "@playwright/test";

export async function waitTrpcPost(page: Page, procedure: string): Promise<Response> {
  return page.waitForResponse(response => {
    if (response.request().method() !== "POST") return false;
    return response.url().includes(`/api/trpc/${procedure}`);
  }, { timeout: 45_000 });
}

export async function trpcResponseJson(response: Response) {
  return response.json() as Promise<unknown>;
}
