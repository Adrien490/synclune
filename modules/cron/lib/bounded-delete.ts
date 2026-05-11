/**
 * Single-pass bounded delete: "find IDs (bounded) then deleteMany by id".
 *
 * Used by cleanup jobs that don't iterate (one batch per run) — `cleanup-sessions`,
 * `cleanup-webhook-events`. The bound prevents long-running queries on accumulated data.
 *
 * Returns:
 * - `count` — number of records actually deleted (from deleteMany result).
 * - `hasMore` — true when the limit was hit, signaling a follow-up run.
 */
interface BoundedDeleteOptions {
	findIds: () => Promise<{ id: string }[]>;
	deleteMany: (ids: string[]) => Promise<{ count: number }>;
	limit: number;
}

export async function boundedDelete(options: BoundedDeleteOptions): Promise<{
	count: number;
	hasMore: boolean;
}> {
	const { findIds, deleteMany, limit } = options;

	const toDelete = await findIds();
	if (toDelete.length === 0) {
		return { count: 0, hasMore: false };
	}

	const result = await deleteMany(toDelete.map((r) => r.id));
	return { count: result.count, hasMore: toDelete.length === limit };
}
