import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { BATCH_DEADLINE_MS, CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

interface SessionCleanupBreakdown {
	sessionsDeleted: number;
	verificationsDeleted: number;
	accessTokensCleared: number;
	refreshTokensCleared: number;
	hasMore: boolean;
}

function buildResult(b: SessionCleanupBreakdown): CronResult {
	const tokensCleared = b.accessTokensCleared + b.refreshTokensCleared;
	return {
		processed: b.sessionsDeleted + b.verificationsDeleted + tokensCleared,
		errored: 0,
		skipped: 0,
		sessionsDeleted: b.sessionsDeleted,
		verificationsDeleted: b.verificationsDeleted,
		accessTokensCleared: b.accessTokensCleared,
		refreshTokensCleared: b.refreshTokensCleared,
		tokensCleared,
		hasMore: b.hasMore,
	};
}

/**
 * Early-return on deadline check. Returns the CronResult to forward, or null
 * to continue. Factorises the deadline-check / log-warn / buildResult triplet
 * that was duplicated 3× between the 4 cleanup phases.
 */
function checkDeadlineOrReturn(
	deadline: number,
	afterStep: string,
	current: SessionCleanupBreakdown,
): CronResult | null {
	if (Date.now() > deadline) {
		logger.warn(`Approaching timeout, stopping after ${afterStep}`, {
			cronJob: "cleanup-sessions",
		});
		return buildResult({ ...current, hasMore: true });
	}
	return null;
}

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
export async function cleanupExpiredSessions(): Promise<CronResult> {
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
		const afterSessionsBail = checkDeadlineOrReturn(deadline, "sessions", {
			sessionsDeleted,
			verificationsDeleted: 0,
			accessTokensCleared: 0,
			refreshTokensCleared: 0,
			hasMore,
		});
		if (afterSessionsBail) return afterSessionsBail;

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
		const afterVerificationsBail = checkDeadlineOrReturn(deadline, "verifications", {
			sessionsDeleted,
			verificationsDeleted,
			accessTokensCleared: 0,
			refreshTokensCleared: 0,
			hasMore,
		});
		if (afterVerificationsBail) return afterVerificationsBail;

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
		const afterAccessTokensBail = checkDeadlineOrReturn(deadline, "access tokens", {
			sessionsDeleted,
			verificationsDeleted,
			accessTokensCleared,
			refreshTokensCleared: 0,
			hasMore,
		});
		if (afterAccessTokensBail) return afterAccessTokensBail;

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

		logger.info("Cleared expired tokens", {
			cronJob: "cleanup-sessions",
			accessTokensCleared,
			refreshTokensCleared,
		});

		logger.info("Cleanup completed", { cronJob: "cleanup-sessions" });

		return buildResult({
			sessionsDeleted,
			verificationsDeleted,
			accessTokensCleared,
			refreshTokensCleared,
			hasMore,
		});
	} catch (error) {
		logger.error("Error during cleanup", error, { cronJob: "cleanup-sessions" });
		throw error;
	}
}
