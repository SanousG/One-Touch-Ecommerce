import {
  buildCartMessage,
  getStoreBySlug,
  StoreError,
  validateCart,
  whatsappUrl,
  type CartInput,
} from "@/lib/store/service";

type Context = { params: Promise<{ tenantSlug: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { tenantSlug } = await params;
    const store = await getStoreBySlug(tenantSlug);
    if (!store) return Response.json({ error: "Tienda no encontrada" }, { status: 404 });
    if (!store.whatsappPhone) {
      return Response.json({ error: "La consulta por WhatsApp todavía no está disponible en esta tienda" }, { status: 409 });
    }

    const body = (await request.json().catch(() => null)) as { items?: CartInput[] } | null;
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) return Response.json({ error: "El carrito está vacío" }, { status: 400 });

    const validation = await validateCart(store.id, items);
    if (validation.issues.length || validation.lines.length === 0) {
      return Response.json({
        error: "Algunos artículos ya no están disponibles. Revise su carrito.",
        issues: validation.issues,
        validation,
      }, { status: 409 });
    }

    const message = buildCartMessage(store, validation);
    return Response.json({
      url: whatsappUrl(store.whatsappPhone, message),
      message,
      validation,
    });
  } catch (error) {
    if (error instanceof StoreError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "No se pudo preparar la consulta" }, { status: 500 });
  }
}
