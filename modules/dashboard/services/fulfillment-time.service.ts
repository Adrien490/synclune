/**
 * Calcule la durée moyenne (en heures) entre `paidAt` et `shippedAt` pour
 * une liste de commandes. Retourne 0 si aucune commande exploitable.
 *
 * Service pur — pas d'accès DB, pas d'effet de bord. Testable directement.
 */
export function computeAverageFulfillmentHours(
	orders: ReadonlyArray<{ paidAt: Date | null; shippedAt: Date | null }>,
): number {
	const valid = orders.filter((order) => order.paidAt && order.shippedAt);
	if (valid.length === 0) return 0;

	const totalMs = valid.reduce(
		(acc, order) => acc + (order.shippedAt!.getTime() - order.paidAt!.getTime()),
		0,
	);

	return totalMs / valid.length / 1000 / 3600;
}
