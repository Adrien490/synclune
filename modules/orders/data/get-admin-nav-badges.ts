/**
 * Pastilles de navigation admin — STUB (migration lean, lot 2).
 *
 * TODO lot 4 : recompter les commandes actionnables sur le schéma lean
 * (Order.status PAID non expédiées, demandes de rétractation RECEIVED).
 */
export type AdminNavBadges = Record<string, number>;

export async function getAdminNavBadges(): Promise<AdminNavBadges> {
	return { orders: 0 };
}
