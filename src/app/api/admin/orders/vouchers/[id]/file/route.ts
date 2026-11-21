import { getPrisma } from "@/lib/db/prisma";
import { getApiCommerceActor } from "@/lib/commerce/service";
import { readVoucher } from "@/lib/storage/vouchers";
import { commerceErrorResponse } from "@/lib/commerce/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

/** Endpoint privado: requiere sesión y pertenencia del comprobante al negocio activo. */
export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiCommerceActor(request);
    const { id } = await params;
    const voucher = await getPrisma().paymentVoucher.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!voucher) return Response.json({ error: "Comprobante no encontrado" }, { status: 404 });
    const bytes = await readVoucher(voucher.storageKey);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": voucher.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${voucher.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
      },
    });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
