import { notFound } from "next/navigation";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreHeader } from "@/components/store/store-header";
import { getStoreBySlug } from "@/lib/store/service";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ tenantSlug: string }> };

export default async function StoreLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  const store = await getStoreBySlug(tenantSlug);
  if (!store) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <StoreHeader store={store} />
      <main className="flex-1 pt-16">{children}</main>
      <StoreFooter storeName={store.name} />
    </div>
  );
}
