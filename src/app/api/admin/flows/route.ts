import { flowErrorResponse } from "@/lib/flows/http";
import { createFlow, getApiFlowActor, listFlows } from "@/lib/flows/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiFlowActor(request);
    const scope = new URL(request.url).searchParams.get("scope");
    return Response.json({ flows: await listFlows(actor, scope === "GLOBAL" || scope === "PRODUCT" ? scope : undefined) });
  } catch (error) {
    return flowErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getApiFlowActor(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ flow: await createFlow(actor, body ?? {}) }, { status: 201 });
  } catch (error) {
    return flowErrorResponse(error);
  }
}
