/**
 * « n° 12 » ou l'email — identité lisible de la commande liée à une demande.
 * Util pur (couche `utils/`), partagé par la liste, le détail et le titre de
 * la page admin.
 */
export function retractationOrderLabel(order: {
	invoiceNumber: number | null;
	email: string;
}): string {
	return order.invoiceNumber != null ? `n° ${order.invoiceNumber}` : order.email;
}
