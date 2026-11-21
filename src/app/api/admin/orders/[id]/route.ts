import { commerceErrorResponse } from "@/lib/commerce/http";
import { getApiCommerceActor, getOrder } from "@/lib/commerce/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiCommerceActor(request);
    const { id } = await params;
    return Response.json({ order: await getOrder(actor, id) });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
