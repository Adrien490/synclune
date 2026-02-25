import { prisma } from "@/shared/lib/prisma";
import { BATCH_DEADLINE_MS, CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";

/**
 * Cleans up expired sessions and tokens.
 *
 * Deletes:
 * - Expired sessions
 * - Expired verification tokens
 * - Expired OAuth access tokens
 * - Expired OAuth refresh tokens
 *
 * Uses deadline checking to avoid timeout across 4 sequential operations.
 */
export async function cleanupExpiredSessions(): Promise<{
	sessionsDeleted: number;
	verificationsDeleted: number;
	tokensCleared: number;
	hasMore: boolean;
}> {
	const now = new Date();
	const deadline = Date.now() + BATCH_DEADLINE_MS;

	let sessionsDeleted = 0;
	let verificationsDeleted = 0;
	let accessTokensCleared = 0;
	let refreshTokensCleared = 0;
	let hasMore = false;

	console.log("[CRON:cleanup-sessions] Starting expired sessions cleanup...");

	try {
		// 1. Delete expired sessions (bounded)
		const sessionsToDelete = await prisma.session.findMany({
			where: { expiresAt: { lt: now } },
			select: { id: true },
			take: CLEANUP_DELETE_LIMIT,
		});

		const sessionsResult = await prisma.session.deleteMany({
			where: { id: { in: sessionsToDelete.map((s) => s.id) } },
		});

		sessionsDeleted = sessionsResult.count;

		console.log(
			`[CRON:cleanup-sessions] Deleted ${sessionsDeleted} expired sessions`
		);

		if (sessionsToDelete.length === CLEANUP_DELETE_LIMIT) {
			hasMore = true;
			console.warn(
				"[CRON:cleanup-sessions] Session delete limit reached, remaining will be cleaned on next run"
			);
		}

		// 2. Delete expired verification tokens (bounded)
		if (Date.now() > deadline) {
			console.warn("[CRON:cleanup-sessions] Approaching timeout, stopping after sessions");
			return { sessionsDeleted, verificationsDeleted, tokensCleared: 0, hasMore: true };
		}

		const verificationsToDelete = await prisma.verification.findMany({
			where: { expiresAt: { lt: now } },
			select: { id: true },
			take: CLEANUP_DELETE_LIMIT,
		});

		const verificationsResult = await prisma.verification.deleteMany({
			where: { id: { in: verificationsToDelete.map((v) => v.id) } },
		});

		verificationsDeleted = verificationsResult.count;

		console.log(
			`[CRON:cleanup-sessions] Deleted ${verificationsDeleted} expired verifications`
		);

		if (verificationsToDelete.length === CLEANUP_DELETE_LIMIT) {
			hasMore = true;
		}

		// 3. Clear expired access tokens (short-lived, don't touch refresh tokens)
		if (Date.now() > deadline) {
			console.warn("[CRON:cleanup-sessions] Approaching timeout, stopping after verifications");
			return { sessionsDeleted, verificationsDeleted, tokensCleared: 0, hasMore: true };
		}

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

		accessTokensCleared = accessTokensResult.count;

		if (expiredAccessTokens.length === CLEANUP_DELETE_LIMIT) {
			hasMore = true;
		}

		// 4. Clear expired refresh tokens (long-lived, separate from access tokens)
		if (Date.now() > deadline) {
			console.warn("[CRON:cleanup-sessions] Approaching timeout, stopping after access tokens");
			return {
				sessionsDeleted,
				verificationsDeleted,
				tokensCleared: accessTokensCleared,
				hasMore: true,
			};
		}

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

		refreshTokensCleared = refreshTokensResult.count;

		if (expiredRefreshTokens.length === CLEANUP_DELETE_LIMIT) {
			hasMore = true;
		}

		const tokensCleared = accessTokensCleared + refreshTokensCleared;

		console.log(
			`[CRON:cleanup-sessions] Cleared ${accessTokensCleared} expired access tokens, ${refreshTokensCleared} expired refresh tokens`
		);

		console.log("[CRON:cleanup-sessions] Cleanup completed");

		return {
			sessionsDeleted,
			verificationsDeleted,
			tokensCleared,
			hasMore,
		};
	} catch (error) {
		console.error(
			"[CRON:cleanup-sessions] Error during cleanup:",
			error instanceof Error ? error.message : String(error)
		);
		throw error;
	}
}
