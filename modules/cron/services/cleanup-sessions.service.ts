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

	// 3. Clear expired access tokens (short-lived, don't touch refresh tokens)
	const accessTokensResult = await prisma.account.updateMany({
		where: {
			accessTokenExpiresAt: { lt: now },
		},
		data: {
			accessToken: null,
			accessTokenExpiresAt: null,
		},
	});

	// 4. Clear expired refresh tokens (long-lived, separate from access tokens)
	const refreshTokensResult = await prisma.account.updateMany({
		where: {
			refreshTokenExpiresAt: { lt: now },
		},
		data: {
			refreshToken: null,
			refreshTokenExpiresAt: null,
		},
	});

	const tokensCleared = accessTokensResult.count + refreshTokensResult.count;

	console.log(
		`[CRON:cleanup-sessions] Cleared ${accessTokensResult.count} expired access tokens, ${refreshTokensResult.count} expired refresh tokens`
	);

	console.log("[CRON:cleanup-sessions] Cleanup completed");

	return {
		sessionsDeleted: sessionsResult.count,
		verificationsDeleted: verificationsResult.count,
		tokensCleared,
	};
}
