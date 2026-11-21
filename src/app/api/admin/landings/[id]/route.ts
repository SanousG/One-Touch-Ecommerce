import { landingErrorResponse } from "@/lib/landings/http";
import { getApiLandingActor, getLanding, saveLandingDraft } from "@/lib/landings/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  try {
    const actor = await getApiLandingActor(request);
    const { id } = await params;
    return Response.json({ landing: await getLanding(actor, id) });
  } catch (error) {
    return landingErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await getApiLandingActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const expectedRevision = typeof body?.expectedRevision === "number" ? body.expectedRevision : undefined;
    const landing = await saveLandingDraft(actor, id, body ?? {}, expectedRevision);
    return Response.json({ landing });
  } catch (error) {
    return landingErrorResponse(error);
  }
}
