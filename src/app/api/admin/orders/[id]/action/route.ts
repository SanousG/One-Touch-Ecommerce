import { commerceErrorResponse } from "@/lib/commerce/http";
import { getApiCommerceActor, recordPayment, transitionOrder, verifyAdvance } from "@/lib/commerce/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiCommerceActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = String(body?.action ?? "");

    if (action === "VERIFY_ADVANCE") {
      return Response.json({ order: await verifyAdvance(actor, id, body ?? {}) });
    }
    if (action === "RECORD_PAYMENT") {
      return Response.json({ order: await recordPayment(actor, id, body ?? {}) });
    }
    const transitions = ["START_PREPARATION", "SHIP", "DELIVER", "CANCEL"];
    if (transitions.includes(action)) {
      return Response.json({ order: await transitionOrder(actor, id, action as "START_PREPARATION" | "SHIP" | "DELIVER" | "CANCEL") });
    }
    return Response.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    return commerceErrorResponse(error);
  }
}
