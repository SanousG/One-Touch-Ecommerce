import { landingErrorResponse } from "@/lib/landings/http";
import { getApiLandingActor, publishLanding } from "@/lib/landings/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiLandingActor(request);
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { expectedRevision?: unknown } | null;
    const expectedRevision = typeof body?.expectedRevision === "number" ? body.expectedRevision : undefined;
    const landing = await publishLanding(actor, id, expectedRevision);
    return Response.json({ landing });
  } catch (error) {
    return landingErrorResponse(error);
  }
}
