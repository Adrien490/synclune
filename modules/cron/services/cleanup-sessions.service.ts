import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { BATCH_DEADLINE_MS, CLEANUP_DELETE_LIMIT } from "@/modules/cron/constants/limits";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "cleanup-sessions";

interface SessionCleanupBreakdown {
	sessionsDeleted: number;
	verificationsDeleted: number;
	accessTokensCleared: number;
	refreshTokensCleared: number;
	errored: number;
	hasMore: boolean;
}

function buildResult(b: SessionCleanupBreakdown): CronResult {
	const tokensCleared = b.accessTokensCleared + b.refreshTokensCleared;
	return {
		processed: b.sessionsDeleted + b.verificationsDeleted + tokensCleared,
		errored: b.errored,
		skipped: 0,
		sessionsDeleted: b.sessionsDeleted,
		verificationsDeleted: b.verificationsDeleted,
		accessTokensCleared: b.accessTokensCleared,
		refreshTokensCleared: b.refreshTokensCleared,
		tokensCleared,
		hasMore: b.hasMore,
	};
}

function captureStepError(error: unknown, step: string): void {
	Sentry.withScope((scope) => {
		scope.setTag("cronJob", CRON_JOB);
		scope.setTag("step", step);
		scope.setLevel("error");
		scope.setFingerprint(["cron", CRON_JOB, step]);
		Sentry.captureException(error);
	});
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
			cronJob: CRON_JOB,
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
	let errored = 0;
	let hasMore = false;

	logger.info("Starting expired sessions cleanup", { cronJob: CRON_JOB });

	// OPS-AUDIT-005 : per-step try/catch preserves partial counts when a later
	// phase fails, so the admin alert reports "3 phases ok + 1 errored" instead
	// of a 500 that loses the deleted counts.

	// 1. Delete expired sessions (bounded)
	try {
		const sessionsToDelete = await prisma.session.findMany({
			where: { expiresAt: { lt: now } },
			select: { id: true },
			take: CLEANUP_DELETE_LIMIT,
		});

		const sessionsResult = await prisma.session.deleteMany({
			where: { id: { in: sessionsToDelete.map((s) => s.id) } },
		});

		sessionsDeleted = sessionsResult.count;

		logger.info("Deleted expired sessions", { cronJob: CRON_JOB, sessionsDeleted });

		if (sessionsToDelete.length === CLEANUP_DELETE_LIMIT) {
			hasMore = true;
			logger.warn("Session delete limit reached, remaining will be cleaned on next run", {
				cronJob: CRON_JOB,
			});
		}
	} catch (error) {
		logger.error("Error deleting expired sessions", error, { cronJob: CRON_JOB });
		captureStepError(error, "sessions");
		errored++;
	}

	// 2. Delete expired verification tokens (bounded)
	const afterSessionsBail = checkDeadlineOrReturn(deadline, "sessions", {
		sessionsDeleted,
		verificationsDeleted: 0,
		accessTokensCleared: 0,
		refreshTokensCleared: 0,
		errored,
		hasMore,
	});
	if (afterSessionsBail) return afterSessionsBail;

	try {
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
			cronJob: CRON_JOB,
			verificationsDeleted,
		});

		if (verificationsToDelete.length === CLEANUP_DELETE_LIMIT) {
			hasMore = true;
		}
	} catch (error) {
		logger.error("Error deleting verifications", error, { cronJob: CRON_JOB });
		captureStepError(error, "verifications");
		errored++;
	}

	// 3. Clear expired access tokens (short-lived, don't touch refresh tokens)
	const afterVerificationsBail = checkDeadlineOrReturn(deadline, "verifications", {
		sessionsDeleted,
		verificationsDeleted,
		accessTokensCleared: 0,
		refreshTokensCleared: 0,
		errored,
		hasMore,
	});
	if (afterVerificationsBail) return afterVerificationsBail;

	try {
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
	} catch (error) {
		logger.error("Error clearing access tokens", error, { cronJob: CRON_JOB });
		captureStepError(error, "access-tokens");
		errored++;
	}

	// 4. Clear expired refresh tokens (long-lived, separate from access tokens)
	const afterAccessTokensBail = checkDeadlineOrReturn(deadline, "access tokens", {
		sessionsDeleted,
		verificationsDeleted,
		accessTokensCleared,
		refreshTokensCleared: 0,
		errored,
		hasMore,
	});
	if (afterAccessTokensBail) return afterAccessTokensBail;

	try {
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
	} catch (error) {
		logger.error("Error clearing refresh tokens", error, { cronJob: CRON_JOB });
		captureStepError(error, "refresh-tokens");
		errored++;
	}

	logger.info("Cleared expired tokens", {
		cronJob: CRON_JOB,
		accessTokensCleared,
		refreshTokensCleared,
	});

	logger.info("Cleanup completed", { cronJob: CRON_JOB, errored });

	return buildResult({
		sessionsDeleted,
		verificationsDeleted,
		accessTokensCleared,
		refreshTokensCleared,
		errored,
		hasMore,
	});
}
