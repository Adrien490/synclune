"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { getUserOrdersSchema } from "../schemas/user-orders.schemas";
import type { GetUserOrdersParams, GetUserOrdersReturn } from "../types/user-orders.types";
import { fetchUserOrders } from "../utils/fetch-user-orders";

/**
 * Récupère les commandes de l'utilisateur connecté
 *
 * Le cache est géré dans fetchUserOrders() avec "use cache: private"
 *
 * @param params - Paramètres de pagination et tri
 * @returns Liste des commandes avec pagination
 */
export async function getUserOrders(
	params?: GetUserOrdersParams
): Promise<GetUserOrdersReturn> {
	// Récupérer la session utilisateur
	const session = await getSession();

	if (!session?.user?.id) {
		// Retourner un résultat vide si non authentifié
		return {
			orders: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}

	// Validation des paramètres (avec valeurs par défaut)
	const validation = getUserOrdersSchema.safeParse(params || {});

	if (!validation.success) {
		// Retourner un résultat vide en cas d'erreur de validation
		return {
			orders: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}

	return fetchUserOrders(session.user.id, validation.data);
}
