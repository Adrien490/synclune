import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
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

	logger.info("Starting expired sessions cleanup", { cronJob: "cleanup-sessions" });

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

		logger.info("Deleted expired sessions", { cronJob: "cleanup-sessions", sessionsDeleted });

		if (sessionsToDelete.length === CLEANUP_DELETE_LIMIT) {
			hasMore = true;
			logger.warn("Session delete limit reached, remaining will be cleaned on next run", {
				cronJob: "cleanup-sessions",
			});
		}

		// 2. Delete expired verification tokens (bounded)
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping after sessions", { cronJob: "cleanup-sessions" });
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

		logger.info("Deleted expired verifications", {
			cronJob: "cleanup-sessions",
			verificationsDeleted,
		});

		if (verificationsToDelete.length === CLEANUP_DELETE_LIMIT) {
			hasMore = true;
		}

		// 3. Clear expired access tokens (short-lived, don't touch refresh tokens)
		if (Date.now() > deadline) {
			logger.warn("Approaching timeout, stopping after verifications", {
				cronJob: "cleanup-sessions",
			});
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
			logger.warn("Approaching timeout, stopping after access tokens", {
				cronJob: "cleanup-sessions",
			});
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

		logger.info("Cleared expired tokens", {
			cronJob: "cleanup-sessions",
			accessTokensCleared,
			refreshTokensCleared,
		});

		logger.info("Cleanup completed", { cronJob: "cleanup-sessions" });

		return {
			sessionsDeleted,
			verificationsDeleted,
			tokensCleared,
			hasMore,
		};
	} catch (error) {
		logger.error("Error during cleanup", error, { cronJob: "cleanup-sessions" });
		throw error;
	}
}
