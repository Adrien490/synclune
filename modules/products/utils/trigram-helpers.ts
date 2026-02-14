import type { PrismaClient } from "@/app/generated/prisma/client";

/**
 * Type for a Prisma transaction (or PrismaClient).
 * Excludes connection/transaction methods unavailable
 * within an interactive transaction context.
 */
type PrismaTransaction = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

// ============================================================================
// TRANSACTION HELPERS
// ============================================================================

/**
 * Set a statement timeout for the current transaction.
 *
 * Uses SET LOCAL to scope the timeout to the current transaction only.
 * This ensures long-running queries are cancelled server-side by PostgreSQL,
 * complementing the client-side Promise.race timeout.
 *
 * SECURITY NOTE: Same safety as setTrigramThreshold — only a validated integer
 * is interpolated into the SET LOCAL command.
 *
 * @param tx - Prisma transaction
 * @param timeoutMs - Timeout in milliseconds
 */
export async function setStatementTimeout(
	tx: PrismaTransaction,
	timeoutMs: number
): Promise<void> {
	const safeTimeout = Math.max(0, Math.round(Number(timeoutMs)));
	if (!Number.isFinite(safeTimeout)) {
		throw new Error("Invalid statement timeout value");
	}
	await tx.$executeRawUnsafe(
		`SET LOCAL statement_timeout = '${safeTimeout}ms'`
	);
}

// ============================================================================
// TRIGRAM HELPERS
// ============================================================================

/**
 * Set the pg_trgm similarity threshold for a transaction.
 *
 * Uses SET LOCAL to isolate the change to the current transaction,
 * preventing interference with other queries via connection pooling.
 *
 * Sets both similarity_threshold (for the % operator on short text like titles)
 * and word_similarity_threshold (for the <% operator on long text like descriptions).
 *
 * SECURITY NOTE:
 * $executeRawUnsafe is required here because SET LOCAL is not a parameterizable
 * statement (it's a session command, not a query with bind parameters).
 * The interpolated value is safe because:
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
	await tx.$executeRawUnsafe(
		`SET LOCAL pg_trgm.word_similarity_threshold = ${safeThreshold}`
	);
}
