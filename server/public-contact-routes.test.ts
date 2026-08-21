import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("atendimento público cinematográfico", () => { it("mantém Orçamentos e Contato com header cinematográfico e canais oficiais", () => { const request = readFileSync(resolve(process.cwd(), "client/src/pages/RequestCoverage.tsx"), "utf8"); const contact = readFileSync(resolve(process.cwd(), "client/src/pages/Contact.tsx"), "utf8"); const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8"); [request, contact].forEach(source => { expect(source).toContain("<PublicHeader cinematic />"); expect(source).toContain("5592920019527"); expect(source).toContain("instagram.com/ojumidia"); }); expect(app).toContain('path={"/contato"} component={Contact}'); }); });

