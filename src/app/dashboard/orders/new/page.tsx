import { NewOrderForm } from "@/components/commerce/new-order-form";
import { listInventory, requireCommerceActor } from "@/lib/commerce/service";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const actor = await requireCommerceActor();
  const items = await listInventory(actor);
  return <NewOrderForm items={items.filter((item) => item.isActive)} />;
}
