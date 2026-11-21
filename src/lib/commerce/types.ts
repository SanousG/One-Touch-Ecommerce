export type Actor = { userId: string; tenantId: string; role: "OWNER" | "OPERATOR" };

export type InventoryRowDTO = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  physical: number;
  reserved: number;
  available: number;
  isActive: boolean;
  coverUrl: string | null;
};

export type MovementDTO = {
  id: string;
  variantId: string;
  delta: number;
  previousPhysical: number;
  newPhysical: number;
  reason: string;
  note: string | null;
  reference: string | null;
  createdBy: string;
  createdAt: string;
};

export type OrderLineInput = { variantId: string; quantity: number };

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  deliveryMode: "LOCAL" | "PICKUP";
  deliveryAddress?: string | null;
  shippingCost?: string | number;
  shippingKnown?: boolean;
  paymentMethod: "CASH_ON_DELIVERY" | "TRANSFER";
  requiresAdvance?: boolean;
  advanceRequired?: string | number;
  notes?: string | null;
  items: OrderLineInput[];
};

export type OrderLineDTO = {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type VoucherDTO = {
  id: string;
  fileName: string;
  amountReported: string;
  reference: string | null;
  verified: boolean;
  verifiedAmount: string | null;
  verifiedAt: string | null;
  url: string;
};

export type OrderEventDTO = {
  id: string;
  type: string;
  description: string;
  amount: string | null;
  createdBy: string;
  createdAt: string;
};

export type OrderDTO = {
  id: string;
  orderNumber: number;
  origin: string;
  customerName: string;
  customerPhone: string;
  deliveryMode: string;
  deliveryAddress: string | null;
  shippingCost: string;
  shippingKnown: boolean;
  paymentMethod: string;
  requiresAdvance: boolean;
  advanceRequired: string;
  advancePaid: string;
  subtotal: string;
  total: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  notes: string | null;
  confirmedAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items: OrderLineDTO[];
  vouchers: VoucherDTO[];
  events: OrderEventDTO[];
};

export type AttentionItemDTO = {
  type: "VOUCHER_RECEIVED" | "WAITING_PREPARATION";
  orderId: string;
  orderNumber: number;
  customerName: string;
  description: string;
  createdAt: string;
};
