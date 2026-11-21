import { flowErrorResponse } from "@/lib/flows/http";
import { createTemplate, getApiFlowActor, listTemplates } from "@/lib/flows/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiFlowActor(request);
    return Response.json({ templates: await listTemplates(actor) });
  } catch (error) {
    return flowErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getApiFlowActor(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ template: await createTemplate(actor, body ?? {}) }, { status: 201 });
  } catch (error) {
    return flowErrorResponse(error);
  }
}
