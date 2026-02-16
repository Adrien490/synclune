import { prisma } from "@/shared/lib/prisma";
import { CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";

/**
 * Cleans up expired sessions and tokens.
 *
 * Deletes:
 * - Expired sessions
 * - Expired verification tokens
 * - Expired OAuth access tokens
 * - Expired OAuth refresh tokens
 */
export async function cleanupExpiredSessions(): Promise<{
	sessionsDeleted: number;
	verificationsDeleted: number;
	tokensCleared: number;
}> {
	const now = new Date();

	console.log("[CRON:cleanup-sessions] Starting expired sessions cleanup...");

	// 1. Delete expired sessions (bounded)
	const sessionsToDelete = await prisma.session.findMany({
		where: { expiresAt: { lt: now } },
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const sessionsResult = await prisma.session.deleteMany({
		where: { id: { in: sessionsToDelete.map((s) => s.id) } },
	});

	console.log(
		`[CRON:cleanup-sessions] Deleted ${sessionsResult.count} expired sessions`
	);

	if (sessionsToDelete.length === CLEANUP_DELETE_LIMIT) {
		console.warn(
			"[CRON:cleanup-sessions] Session delete limit reached, remaining will be cleaned on next run"
		);
	}

	// 2. Delete expired verification tokens (bounded)
	const verificationsToDelete = await prisma.verification.findMany({
		where: { expiresAt: { lt: now } },
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const verificationsResult = await prisma.verification.deleteMany({
		where: { id: { in: verificationsToDelete.map((v) => v.id) } },
	});

	console.log(
		`[CRON:cleanup-sessions] Deleted ${verificationsResult.count} expired verifications`
	);

	// 3. Clear expired access tokens (short-lived, don't touch refresh tokens)
	const expiredAccessTokens = await prisma.account.findMany({
		where: { accessTokenExpiresAt: { lt: now } },
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const accessTokensResult = await prisma.account.updateMany({
		where: { id: { in: expiredAccessTokens.map((a) => a.id) } },
		data: {
			accessToken: null,
			accessTokenExpiresAt: null,
		},
	});

	// 4. Clear expired refresh tokens (long-lived, separate from access tokens)
	const expiredRefreshTokens = await prisma.account.findMany({
		where: { refreshTokenExpiresAt: { lt: now } },
		select: { id: true },
		take: CLEANUP_DELETE_LIMIT,
	});

	const refreshTokensResult = await prisma.account.updateMany({
		where: { id: { in: expiredRefreshTokens.map((a) => a.id) } },
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
