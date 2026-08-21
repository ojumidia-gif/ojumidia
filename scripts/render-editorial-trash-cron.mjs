const baseUrl = process.env.OJU_PUBLIC_BASE_URL?.replace(/\/+$/, "");
const secret = process.env.EDITORIAL_TRASH_CRON_SECRET;

if (!baseUrl || !secret) {
  throw new Error("OJU_PUBLIC_BASE_URL e EDITORIAL_TRASH_CRON_SECRET são obrigatórios para o expurgo editorial.");
}

const response = await fetch(`${baseUrl}/api/scheduled/editorial-trash-purge`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

if (!response.ok) {
  throw new Error(`Expurgo editorial falhou (${response.status}): ${await response.text()}`);
}

const result = await response.json();
console.info(`[EditorialTrashCron] concluído: ${JSON.stringify(result)}`);
