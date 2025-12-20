import { cacheLife, cacheTag } from "next/cache";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";

import { GET_USER_ADDRESSES_DEFAULT_SELECT } from "../constants/user-addresses.constants";
import type {
	GetUserAddressesReturn,
	UserAddress,
} from "../types/user-addresses.types";

// Re-export pour compatibilité
export { GET_USER_ADDRESSES_DEFAULT_SELECT } from "../constants/user-addresses.constants";
export type {
	GetUserAddressesReturn,
	UserAddress,
} from "../types/user-addresses.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère toutes les adresses de l'utilisateur connecté
 *
 * Le cache est géré dans fetchUserAddresses() avec "use cache"
 *
 * @returns Liste des adresses triées par défaut puis date, ou null si non authentifié
 */
export async function getUserAddresses(): Promise<GetUserAddressesReturn | null> {
	const session = await getSession();

	if (!session || !session.user) {
		return null;
	}

	return await fetchUserAddresses(session.user.id);
}

/**
 * Récupère toutes les adresses d'un utilisateur depuis la DB avec use cache
 *
 * Utilise "use cache" pour:
 * - Isoler les données par utilisateur (pas de fuite)
 * - Permettre le prefetching runtime (stale >= 30s)
 * - Stockage côté client uniquement (sécurité)
 * - Invalidation lors de modifications d'adresses
 *
 * @param userId - ID de l'utilisateur
 * @returns Liste des adresses triées par défaut puis date de création
 */
export async function fetchUserAddresses(
	userId: string
): Promise<GetUserAddressesReturn> {
	"use cache: private";
	cacheLife("cart");
	cacheTag(`addresses-user-${userId}`);

	const addresses = await prisma.address.findMany({
		where: {
			userId,
		},
		select: GET_USER_ADDRESSES_DEFAULT_SELECT,
		orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
	});

	return addresses;
}
