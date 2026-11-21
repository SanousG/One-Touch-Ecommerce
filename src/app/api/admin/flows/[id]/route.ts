import { flowErrorResponse } from "@/lib/flows/http";
import { getApiFlowActor, getFlow, saveFlowDraft } from "@/lib/flows/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiFlowActor(request);
    const { id } = await params;
    return Response.json({ flow: await getFlow(actor, id) });
  } catch (error) {
    return flowErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await getApiFlowActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ flow: await saveFlowDraft(actor, id, body ?? {}) });
  } catch (error) {
    return flowErrorResponse(error);
  }
}
