import { logger } from "@/shared/lib/logger";

interface WithId {
	id: string;
}

interface PaginateCursorOptions<T extends WithId> {
	/**
	 * Fetches one batch of records starting from `cursor` (undefined for first page).
	 * Implementations should:
	 * - `take: batchSize`
	 * - `orderBy: { id: "asc" }`
	 * - `cursor: cursor ? { id: cursor } : undefined` + `skip: cursor ? 1 : 0`
	 */
	fetch: (cursor: string | undefined, batchSize: number) => Promise<T[]>;
	/** Called once per batch to consume records (accumulate keys, delete, etc). */
	onBatch: (batch: T[]) => void | Promise<void>;
	/** Per-batch take. */
	batchSize: number;
	/** Absolute timestamp (ms) at which to abort early. */
	deadline: number;
	/** Used in deadline-exceeded logs and the thrown error message. */
	jobName: string;
	/** Used to identify the loop in deadline-exceeded log/error. */
	step: string;
}

/**
 * Cursor-based pagination loop with deadline checking.
 *
 * Replaces hand-rolled `for (;;) { findMany + cursor + break-on-short-batch }` blocks.
 * Throws `Error("Deadline exceeded during <jobName> <step>")` if the deadline is reached.
 *
 * Each iteration:
 * 1. Checks `Date.now() < deadline` — throws if exceeded.
 * 2. Calls `fetch(cursor, batchSize)`.
 * 3. Calls `onBatch(batch)`.
 * 4. Stops when the batch returns fewer than `batchSize` records.
 * 5. Otherwise advances cursor to `batch[batch.length - 1].id` and continues.
 */
export async function paginateCursor<T extends WithId>(
	options: PaginateCursorOptions<T>,
): Promise<void> {
	const { fetch, onBatch, batchSize, deadline, jobName, step } = options;
	let cursor: string | undefined;

	for (;;) {
		if (Date.now() > deadline) {
			logger.warn("Deadline reached during cursor pagination, aborting safely", {
				cronJob: jobName,
				step,
			});
			throw new Error(`Deadline exceeded during ${jobName} ${step}`);
		}

		const batch = await fetch(cursor, batchSize);
		await onBatch(batch);

		if (batch.length < batchSize) return;
		cursor = batch[batch.length - 1]!.id;
	}
}
