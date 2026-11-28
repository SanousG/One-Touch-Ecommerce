import { flowErrorResponse } from "@/lib/flows/http";
import { deleteTemplateType, getApiFlowActor, updateTemplateType } from "@/lib/flows/service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await getApiFlowActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Response.json({ templateType: await updateTemplateType(actor, id, body ?? {}) });
  } catch (error) {
    return flowErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const actor = await getApiFlowActor(request);
    const { id } = await params;
    return Response.json(await deleteTemplateType(actor, id));
  } catch (error) {
    return flowErrorResponse(error);
  }
}
