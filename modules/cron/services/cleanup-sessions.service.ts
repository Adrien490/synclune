import { prisma } from "@/shared/lib/prisma";

/**
 * Service de nettoyage des sessions et tokens expirés
 *
 * Supprime :
 * - Sessions expirées
 * - Tokens de vérification expirés
 * - Tokens OAuth expirés (Account.accessTokenExpiresAt, refreshTokenExpiresAt)
 */
export async function cleanupExpiredSessions(): Promise<{
	sessionsDeleted: number;
	verificationsDeleted: number;
	tokensCleared: number;
}> {
	const now = new Date();

	console.log("[CRON:cleanup-sessions] Starting expired sessions cleanup...");

	// 1. Supprimer les sessions expirées
	const sessionsResult = await prisma.session.deleteMany({
		where: {
			expiresAt: { lt: now },
		},
	});

	console.log(
		`[CRON:cleanup-sessions] Deleted ${sessionsResult.count} expired sessions`
	);

	// 2. Supprimer les tokens de vérification expirés
	const verificationsResult = await prisma.verification.deleteMany({
		where: {
			expiresAt: { lt: now },
		},
	});

	console.log(
		`[CRON:cleanup-sessions] Deleted ${verificationsResult.count} expired verifications`
	);

	// 3. Nettoyer les tokens OAuth expirés (on ne supprime pas le compte, juste les tokens)
	const tokensResult = await prisma.account.updateMany({
		where: {
			OR: [
				{ accessTokenExpiresAt: { lt: now } },
				{ refreshTokenExpiresAt: { lt: now } },
			],
		},
		data: {
			accessToken: null,
			refreshToken: null,
			accessTokenExpiresAt: null,
			refreshTokenExpiresAt: null,
		},
	});

	console.log(
		`[CRON:cleanup-sessions] Cleared ${tokensResult.count} expired OAuth tokens`
	);

	console.log("[CRON:cleanup-sessions] Cleanup completed");

	return {
		sessionsDeleted: sessionsResult.count,
		verificationsDeleted: verificationsResult.count,
		tokensCleared: tokensResult.count,
	};
}
