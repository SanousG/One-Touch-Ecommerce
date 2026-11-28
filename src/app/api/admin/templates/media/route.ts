import { flowErrorResponse } from "@/lib/flows/http";
import { getApiFlowActor, uploadTemplateMedia } from "@/lib/flows/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const actor = await getApiFlowActor(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Se requiere un archivo de imagen o video" }, { status: 400 });
    }
    return Response.json({ media: await uploadTemplateMedia(actor, file) }, { status: 201 });
  } catch (error) {
    return flowErrorResponse(error);
  }
}
