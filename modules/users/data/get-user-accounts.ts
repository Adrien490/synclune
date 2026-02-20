import { cacheUserAccounts } from "../constants/cache";
import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "./get-current-user";

import type {
	UserAccount,
	GetUserAccountsReturn,
} from "../types/user-accounts.types";

// Re-export pour compatibilité
export type {
	UserAccount,
	GetUserAccountsReturn,
} from "../types/user-accounts.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère les comptes OAuth liés de l'utilisateur actuel
 * SÉCURITÉ: Tokens JAMAIS exposés
 *
 * Cette fonction gère l'authentification et délègue la récupération à fetchUserAccounts
 *
 * @returns La liste des comptes OAuth liés, ou un tableau vide si non authentifié
 */
export async function getUserAccounts(): Promise<GetUserAccountsReturn> {
	const user = await getCurrentUser();

	if (!user) {
		return [];
	}

	return fetchUserAccounts(user.id);
}

/**
 * Récupère les comptes OAuth liés d'un utilisateur
 * SÉCURITÉ: Tokens JAMAIS exposés
 * @param userId L'ID de l'utilisateur
 */
export async function fetchUserAccounts(
	userId: string
): Promise<GetUserAccountsReturn> {
	"use cache: private";
	cacheUserAccounts(userId);

	try {
		const accounts = await prisma.account.findMany({
			where: {
				userId,
				providerId: {
					not: "credential",
				},
			},
			select: {
				id: true,
				providerId: true,
				accountId: true,
				createdAt: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		return accounts;
	} catch (error) {
		return [];
	}
}
