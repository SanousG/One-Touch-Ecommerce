import { commerceErrorResponse } from "@/lib/commerce/http";
import { createOrder, getApiCommerceActor, listOrders } from "@/lib/commerce/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiCommerceActor(request);
    return Response.json({ orders: await listOrders(actor) });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getApiCommerceActor(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
    return Response.json({ order: await createOrder(actor, (body ?? {}) as never, idempotencyKey) }, { status: 201 });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
