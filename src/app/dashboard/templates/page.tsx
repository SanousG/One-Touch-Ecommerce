import { TemplateManager } from "@/components/flows/template-manager";
import { listProducts } from "@/lib/catalog/service";
import { listTemplates, requireFlowActor } from "@/lib/flows/service";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const actor = await requireFlowActor();
  const [templates, products] = await Promise.all([listTemplates(actor), listProducts(actor)]);
  const images = products.flatMap((product) =>
    product.images.map((image) => ({ id: image.id, url: image.url, label: `${product.name} · ${image.fileName}` })),
  );
  return <TemplateManager templates={templates} images={images} />;
}
