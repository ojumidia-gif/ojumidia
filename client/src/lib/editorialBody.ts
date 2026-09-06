export type EditorialBodyBlock = { type: "p" | "h2" | "quote"; html: string };

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatInline(value: string) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br />");
}

export function parseEditorialBody(raw?: string | null): EditorialBodyBlock[] {
  const text = (raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  return text.split(/\n{2,}/).map(chunk => {
    const line = chunk.trim();
    if (line.startsWith("## ")) return { type: "h2" as const, html: formatInline(line.slice(3).trim()) };
    if (line.startsWith(">")) return { type: "quote" as const, html: formatInline(line.replace(/^>\s?/gm, "").trim()) };
    return { type: "p" as const, html: formatInline(line) };
  }).filter(block => block.html);
}
