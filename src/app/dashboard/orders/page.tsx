import { OrdersList } from "@/components/commerce/orders-list";
import { listOrders, requireCommerceActor } from "@/lib/commerce/service";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const actor = await requireCommerceActor();
  const orders = await listOrders(actor);
  return <OrdersList orders={orders} />;
}
