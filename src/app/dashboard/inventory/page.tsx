import { InventoryView } from "@/components/commerce/inventory-view";
import { listInventory, listMovements, requireCommerceActor } from "@/lib/commerce/service";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const actor = await requireCommerceActor();
  const [items, movements] = await Promise.all([listInventory(actor), listMovements(actor)]);
  return <InventoryView items={items} movements={movements} canAdjust={actor.role === "OWNER"} />;
}
