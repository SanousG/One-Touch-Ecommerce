import { commerceErrorResponse } from "@/lib/commerce/http";
import { getApiCommerceActor, listMovements } from "@/lib/commerce/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiCommerceActor(request);
    const variantId = new URL(request.url).searchParams.get("variantId") ?? undefined;
    return Response.json({ movements: await listMovements(actor, variantId) });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
