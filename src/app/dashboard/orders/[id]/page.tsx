import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/commerce/order-detail";
import { CommerceNotFoundError, getOrder, requireCommerceActor } from "@/lib/commerce/service";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireCommerceActor();
  const { id } = await params;
  let order;
  try {
    order = await getOrder(actor, id);
  } catch (error) {
    if (error instanceof CommerceNotFoundError) notFound();
    throw error;
  }
  return (
    <OrderDetail
      order={order}
      canVerifyPayments={actor.role === "OWNER"}
      canAdjustFulfillment={actor.role === "OWNER" || actor.role === "OPERATOR"}
    />
  );
}
