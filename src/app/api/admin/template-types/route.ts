import { flowErrorResponse } from "@/lib/flows/http";
import { createTemplateType, getApiFlowActor, listTemplateTypes } from "@/lib/flows/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiFlowActor(request);
    return Response.json({ templateTypes: await listTemplateTypes(actor) });
  } catch (error) {
    return flowErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getApiFlowActor(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ templateType: await createTemplateType(actor, body ?? {}) }, { status: 201 });
  } catch (error) {
    return flowErrorResponse(error);
  }
}
