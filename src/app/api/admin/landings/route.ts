import { landingErrorResponse } from "@/lib/landings/http";
import { createLanding, getApiLandingActor, listLandings } from "@/lib/landings/service";

export async function GET(request: Request) {
  try {
    const actor = await getApiLandingActor(request);
    return Response.json({ landings: await listLandings(actor) });
  } catch (error) {
    return landingErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getApiLandingActor(request);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const landing = await createLanding(actor, body ?? {});
    return Response.json({ landing }, { status: 201 });
  } catch (error) {
    return landingErrorResponse(error);
  }
}
