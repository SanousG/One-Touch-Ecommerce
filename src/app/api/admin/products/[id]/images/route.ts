import { catalogErrorResponse } from "@/lib/catalog/http";
import { addProductImage, getApiCatalogContext } from "@/lib/catalog/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const actor = await getApiCatalogContext(request);
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Se requiere un archivo de imagen" }, { status: 400 });
    }
    const product = await addProductImage(actor, id, file);
    return Response.json({ product }, { status: 201 });
  } catch (error) {
    return catalogErrorResponse(error);
  }
}
