import type { OrderListItem } from "../data/get-orders";

/** « n° 12 » dès la facture émise ; l'id court sinon (commande PENDING). */
export function orderDisplayLabel(order: Pick<OrderListItem, "id" | "invoiceNumber">): string {
	return order.invoiceNumber != null ? `n° ${order.invoiceNumber}` : `…${order.id.slice(-6)}`;
}
