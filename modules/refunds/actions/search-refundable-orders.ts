"use server";

import { z } from "zod";
import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/auth/lib/require-auth";
import { SORT_OPTIONS } from "@/modules/orders/constants/order.constants";
import { getOrders } from "@/modules/orders/data/get-orders";

/** Commande candidate au remboursement — projection minimale pour le sélecteur. */
export interface RefundableOrderOption {
	id: string;
	orderNumber: string;
	customerName: string | null;
	customerEmail: string | null;
	total: number;
	currency: string;
	status: OrderStatus;
	paymentStatus: PaymentStatus;
}

/** Nombre de commandes proposées dans le sélecteur (recherche live). */
const MAX_RESULTS = 8;

/** Query vide autorisée (liste les commandes récentes), bornée comme les searchTerms catalogue. */
const querySchema = z.string().trim().max(200);

/**
 * Recherche les commandes remboursables pour le sélecteur « Créer un
 * remboursement ». Le filtre `PROCESSING|SHIPPED|DELIVERED × PAID|PARTIALLY_REFUNDED`
 * est le miroir exact de `getOrderPermissions().canRefund` : toute commande
 * proposée ici passe le garde-fou de `/admin/ventes/remboursements/nouveau`
 * (qui redirige sinon vers la fiche commande).
 *
 * L'auth admin est vérifiée ici (`requireAdmin`, re-check DB) ET de nouveau en
 * DB par `getOrders`. Retour custom (`RefundableOrderOption[]`, pas `ActionState`)
 * ⇒ sur échec d'auth ou de validation on renvoie une liste vide plutôt que
 * `admin.error` — d'où le safeParse direct au lieu de `validateInput`.
 *
 * RATE LIMIT — délégué, volontairement pas dupliqué ici : `getOrders()` applique
 * `ADMIN_SEARCH_LIMIT` sur le chemin coûteux (recherche fuzzy sur les index GIN trgm,
 * ≥ 3 caractères). Ajouter un second `enforceRateLimitForCurrentUser` sur le même
 * profil ferait consommer deux jetons par frappe, donc réduirait de moitié le budget
 * réel de la recherche admin. Les requêtes < 3 caractères ne sont pas bornées, comme
 * toute lecture de `getOrders` : si on veut fermer ça, c'est au niveau de `getOrders`,
 * pas ici (sinon la borne dépend du point d'entrée).
 */
export async function searchRefundableOrders(query: string): Promise<RefundableOrderOption[]> {
	const admin = await requireAdmin();
	if ("error" in admin) return [];

	const validation = querySchema.safeParse(query);
	if (!validation.success) return [];
	const trimmed = validation.data;

	try {
		const { orders } = await getOrders({
			direction: "forward",
			perPage: MAX_RESULTS,
			sortBy: SORT_OPTIONS.CREATED_DESC,
			search: trimmed.length > 0 ? trimmed : undefined,
			filters: {
				status: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED],
				paymentStatus: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED],
				showDeleted: "active",
			},
		});

		return orders.map((order) => ({
			id: order.id,
			orderNumber: order.orderNumber,
			customerName: order.customerName,
			customerEmail: order.customerEmail,
			total: order.total,
			currency: order.currency,
			status: order.status,
			paymentStatus: order.paymentStatus,
		}));
	} catch {
		// getOrders throw (non autorisé / params invalides) → liste vide, l'UI gère l'état.
		return [];
	}
}
