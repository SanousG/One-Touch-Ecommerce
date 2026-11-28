import { flowErrorResponse } from "@/lib/flows/http";
import { deleteTemplateMedia, getApiFlowActor } from "@/lib/flows/service";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  try {
    const actor = await getApiFlowActor(request);
    const { id } = await params;
    return Response.json(await deleteTemplateMedia(actor, id));
  } catch (error) {
    return flowErrorResponse(error);
  }
}
