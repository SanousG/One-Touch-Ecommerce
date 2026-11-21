import { flowErrorResponse } from "@/lib/flows/http";
import { getApiFlowActor, publishFlow } from "@/lib/flows/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiFlowActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ flow: await publishFlow(actor, id, body ?? {}) });
  } catch (error) {
    return flowErrorResponse(error);
  }
}
