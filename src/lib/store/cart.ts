export type CartItem = { variantId: string; quantity: number };

export const CART_EVENT = "one-touch:cart-changed";

export function cartKey(tenantId: string): string {
  return `one-touch:cart:${tenantId}`;
}

function normalize(items: CartItem[]): CartItem[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    if (typeof item?.variantId !== "string" || !item.variantId) continue;
    if (!Number.isInteger(item.quantity)) continue;
    const quantity = Math.min(99, Math.max(1, item.quantity));
    merged.set(item.variantId, Math.min(99, (merged.get(item.variantId) ?? 0) + quantity));
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function readCart(tenantId: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(cartKey(tenantId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? normalize(parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

// Snapshot estable para useSyncExternalStore: evita bucles por referencias nuevas.
const snapshots = new Map<string, CartItem[]>();

export function getCartSnapshot(tenantId: string): CartItem[] {
  const key = cartKey(tenantId);
  const current = readCart(tenantId);
  const previous = snapshots.get(key);
  if (previous && JSON.stringify(previous) === JSON.stringify(current)) return previous;
  snapshots.set(key, current);
  return current;
}

export function subscribeCart(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function writeCart(tenantId: string, items: CartItem[]): CartItem[] {
  const clean = normalize(items);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(cartKey(tenantId), JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { tenantId } }));
  }
  return clean;
}

export function addToCart(tenantId: string, variantId: string, quantity = 1): CartItem[] {
  const current = readCart(tenantId);
  const existing = current.find((item) => item.variantId === variantId);
  return writeCart(
    tenantId,
    existing
      ? current.map((item) => item.variantId === variantId ? { ...item, quantity: item.quantity + quantity } : item)
      : [...current, { variantId, quantity }],
  );
}

export function setCartQuantity(tenantId: string, variantId: string, quantity: number): CartItem[] {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) return readCart(tenantId);
  return writeCart(tenantId, readCart(tenantId).map((item) =>
    item.variantId === variantId ? { ...item, quantity } : item,
  ));
}

export function removeFromCart(tenantId: string, variantId: string): CartItem[] {
  return writeCart(tenantId, readCart(tenantId).filter((item) => item.variantId !== variantId));
}

export function clearCart(tenantId: string): CartItem[] {
  return writeCart(tenantId, []);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
