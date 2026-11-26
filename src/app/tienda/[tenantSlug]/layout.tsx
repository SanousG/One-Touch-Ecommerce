import { notFound } from "next/navigation";
import { StoreShell } from "@/components/store/store-shell";
import { getStoreBySlug } from "@/lib/store/service";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ tenantSlug: string }> };

export default async function StoreLayout({ children, params }: Props) {
  const { tenantSlug } = await params;
  const store = await getStoreBySlug(tenantSlug);
  if (!store) notFound();

  return <StoreShell store={store}>{children}</StoreShell>;
}
