// Worker durable de mensajes salientes. Se ejecuta dentro de Docker con tsx.
import { config } from "dotenv";

config({ path: ".env" });

import { processOutboundBatch } from "../src/lib/whatsapp/outbox";

const intervalMs = Number(process.env.OUTBOX_INTERVAL_MS ?? 3000);
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const result = await processOutboundBatch(5);
    if (result.processed > 0) {
      console.log(`[outbox] procesados=${result.processed} enviados=${result.sent} fallidos=${result.failed}`);
    }
  } catch (error) {
    console.error("[outbox] error:", error instanceof Error ? error.message.slice(0, 300) : "desconocido");
  } finally {
    running = false;
  }
}

console.log(`[outbox] worker iniciado (intervalo ${intervalMs}ms)`);
void tick();
const timer = setInterval(() => void tick(), intervalMs);

process.on("SIGTERM", () => {
  clearInterval(timer);
  process.exit(0);
});
