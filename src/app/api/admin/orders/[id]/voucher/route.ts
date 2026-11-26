import { commerceErrorResponse } from "@/lib/commerce/http";
import { getApiCommerceActor, attachVoucher } from "@/lib/commerce/service";
import { saveVoucher } from "@/lib/storage/vouchers";

type Context = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, { params }: Context) {
  let storageKey: string | null = null;
  try {
    const actor = await getApiCommerceActor(request);
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Se requiere un comprobante" }, { status: 400 });
    }
    const stored = await saveVoucher(file, actor.tenantId, id);
    storageKey = stored.storageKey;
    const order = await attachVoucher(actor, id, stored, {
      amountReported: form.get("amountReported"),
      reference: form.get("reference"),
    });
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    if (storageKey) {
      const { deleteVoucher } = await import("@/lib/storage/vouchers");
      await deleteVoucher(storageKey);
    }
    return commerceErrorResponse(error);
  }
}
