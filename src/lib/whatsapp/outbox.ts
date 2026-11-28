import "server-only";
import type { OutboundStatus } from "@prisma/client";
import { getPrisma } from "../db/prisma";
import { getConnectionCredentials, getConnectionProvider } from "./connection-access";

export type OutboxResult = { processed: number; sent: number; failed: number };

/** Procesa hasta `limit` mensajes. El claim atómico evita doble ejecución concurrent. */
export async function processOutboundBatch(limit = 5): Promise<OutboxResult> {
  const prisma = getPrisma();
  const result: OutboxResult = { processed: 0, sent: 0, failed: 0 };
  const pending = await prisma.outboundMessage.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  for (const outbound of pending) {
    const claimed = await prisma.outboundMessage.updateMany({
      where: { id: outbound.id, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;
    result.processed += 1;

    const connection = await prisma.whatsAppConnection.findFirst({
      where: { id: outbound.connectionId, tenantId: outbound.tenantId },
    });
    if (!connection || connection.status !== "CONNECTED") {
      await finish(outbound.id, "PENDING", "Conexión no conectada", new Date(Date.now() + 60_000));
      continue;
    }

    try {
      const provider = getConnectionProvider(connection);
      const credentials = getConnectionCredentials(connection);
      const sent = outbound.kind === "IMAGE" && outbound.mediaUrl
        ? await provider.sendImage(credentials, outbound.to, outbound.mediaUrl, outbound.text || undefined)
        : outbound.kind === "VIDEO" && outbound.mediaUrl
          ? await provider.sendVideo(credentials, outbound.to, outbound.mediaUrl, outbound.text || undefined)
          : outbound.kind === "AUDIO" && outbound.mediaUrl
            ? await provider.sendAudio(credentials, outbound.to, outbound.mediaUrl)
            : await provider.sendText(credentials, outbound.to, outbound.text);
      const providerMessageId = sent.providerMessageId ?? `pending:${outbound.id}`;
      await prisma.$transaction([
        prisma.outboundMessage.update({
          where: { id: outbound.id },
          data: { status: "SENT", providerMessageId, lastError: null },
        }),
        prisma.conversationMessage.update({
          where: { id: outbound.conversationMessageId },
          data: { status: "ACCEPTED", providerStatus: sent.providerStatus },
        }),
      ]);
      result.sent += 1;
    } catch (error) {
      const uncertain = Boolean((error as { uncertain?: boolean })?.uncertain);
      const retryable = uncertain || (typeof (error as { status?: number })?.status === "number" &&
        ((error as { status: number }).status === 429 || (error as { status: number }).status >= 500));
      const attempts = outbound.attempts + 1;
      const final = !retryable || attempts >= 5;
      const status: OutboundStatus = final ? (uncertain ? "UNCERTAIN" : "FAILED") : "PENDING";
      const message = error instanceof Error ? error.message.slice(0, 300) : "Error desconocido";
      await finish(
        outbound.id,
        status,
        uncertain ? `Estado incierto: ${message}` : message,
        new Date(Date.now() + Math.min(60_000 * 2 ** (attempts - 1), 600_000)),
      );
      if (final) {
        await prisma.conversationMessage.update({
          where: { id: outbound.conversationMessageId },
          data: { status: uncertain ? "UNCERTAIN" : "FAILED" },
        });
      }
      result.failed += 1;
    }
  }
  return result;
}

async function finish(id: string, status: OutboundStatus, error: string | null, nextAttemptAt: Date) {
  await getPrisma().outboundMessage.update({
    where: { id },
    data: { status, lastError: error, nextAttemptAt },
  });
}
