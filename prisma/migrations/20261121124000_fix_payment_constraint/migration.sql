-- Corrección: `advancePaid` acumula todo lo cobrado (adelanto + saldo final),
-- por lo que el límite correcto es el total del pedido, no el adelanto requerido.
-- La validación de que un adelanto verificado no exceda lo requerido se mantiene
-- en la capa de dominio (`verifyAdvance`).
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "advance_paid_within_required";
ALTER TABLE "orders" ADD CONSTRAINT "paid_within_total" CHECK ("advancePaid" <= "total");
