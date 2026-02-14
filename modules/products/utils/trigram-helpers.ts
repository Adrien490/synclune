import type { PrismaClient } from "@/app/generated/prisma/client";

// ============================================================================
// TRIGRAM HELPERS
// ============================================================================

/**
 * Type for a Prisma transaction (or PrismaClient).
 * Excludes connection/transaction methods unavailable
 * within an interactive transaction context.
 */
type PrismaTransaction = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Set the pg_trgm similarity threshold for a transaction.
 *
 * Uses SET LOCAL to isolate the change to the current transaction,
 * preventing interference with other queries via connection pooling.
 *
 * SECURITY NOTE:
 * - Value is converted via Number() (no string injection)
 * - Math.max(0, Math.min(1, ...)) clamps the value between 0 and 1
 * - Number.isFinite() rejects NaN and Infinity
 * - Only a valid float between 0.0 and 1.0 can be interpolated
 *
 * @param tx - Prisma client or transaction
 * @param threshold - Similarity threshold (0.0 - 1.0)
 * @throws Error if threshold is not a valid number
 */
export async function setTrigramThreshold(
	tx: PrismaTransaction,
	threshold: number
): Promise<void> {
	const safeThreshold = Math.max(0, Math.min(1, Number(threshold)));
	if (!Number.isFinite(safeThreshold)) {
		throw new Error("Invalid trigram threshold value");
	}
	await tx.$executeRawUnsafe(
		`SET LOCAL pg_trgm.similarity_threshold = ${safeThreshold}`
	);
}
