import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { prisma } from "@/shared/lib/prisma";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère les providers OAuth/credential de l'utilisateur connecté
 */
export async function getUserProviders(): Promise<string[]> {
	const user = await getCurrentUser();

	if (!user) {
		return [];
	}

	return fetchUserProviders(user.id);
}

/**
 * Récupère les providers d'un utilisateur par ID avec cache
 */
async function fetchUserProviders(userId: string): Promise<string[]> {
	"use cache: private";
	cacheLife("session");
	cacheTag(`user-providers-${userId}`);

	const accounts = await prisma.account.findMany({
		where: { userId },
		select: { providerId: true },
	});

	return accounts.map((a) => a.providerId);
}
