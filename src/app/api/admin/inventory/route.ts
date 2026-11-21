import { commerceErrorResponse } from "@/lib/commerce/http";
import { getApiCommerceActor, listInventory } from "@/lib/commerce/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiCommerceActor(request);
    const q = new URL(request.url).searchParams.get("q") ?? "";
    return Response.json({ items: await listInventory(actor, q) });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
