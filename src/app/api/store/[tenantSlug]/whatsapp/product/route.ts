import {
  buildProductMessage,
  getStoreBySlug,
  getStoreProduct,
  StoreError,
  validateCart,
  whatsappUrl,
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

    const body = (await request.json().catch(() => null)) as { variantId?: unknown; quantity?: unknown } | null;
    const variantId = typeof body?.variantId === "string" ? body.variantId : "";
    const quantity = Number(body?.quantity);
    if (!variantId) return Response.json({ error: "Variante no válida" }, { status: 400 });

    const validation = await validateCart(store.id, [{ variantId, quantity }]);
    if (validation.issues.length || validation.lines.length !== 1) {
      return Response.json({ error: "El producto ya no está disponible o la cantidad no es válida", issues: validation.issues }, { status: 409 });
    }

    const line = validation.lines[0];
    const product = await getStoreProduct(store.id, line.productSlug);
    const variant = product?.variants.find((item) => item.id === variantId);
    if (!product || !variant) {
      return Response.json({ error: "El producto ya no está disponible" }, { status: 409 });
    }

    const message = buildProductMessage(store, product, variant, line.quantity);
    return Response.json({ url: whatsappUrl(store.whatsappPhone, message), message });
  } catch (error) {
    if (error instanceof StoreError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "No se pudo preparar la consulta" }, { status: 500 });
  }
}
