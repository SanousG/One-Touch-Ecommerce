import { commerceErrorResponse } from "@/lib/commerce/http";
import { adjustStock, getApiCommerceActor } from "@/lib/commerce/service";

export async function POST(request: Request) {
  try {
    const actor = await getApiCommerceActor(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ item: await adjustStock(actor, body ?? {}) });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
