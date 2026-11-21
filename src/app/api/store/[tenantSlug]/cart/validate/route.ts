import { getStoreBySlug, validateCart, type CartInput } from "@/lib/store/service";

type Context = { params: Promise<{ tenantSlug: string }> };

export async function POST(request: Request, { params }: Context) {
  const { tenantSlug } = await params;
  const store = await getStoreBySlug(tenantSlug);
  if (!store) return Response.json({ error: "Tienda no encontrada" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { items?: CartInput[] } | null;
  const items = Array.isArray(body?.items) ? body.items : [];
  const validation = await validateCart(store.id, items);
  return Response.json(validation);
}
