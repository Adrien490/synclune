import { Prisma } from "@/app/generated/prisma/client"
import { setStatementTimeout, setTrigramThreshold } from "@/modules/products/utils/trigram-helpers"
import { prisma } from "@/shared/lib/prisma"

/**
 * Generic fuzzy search utility using pg_trgm + immutable_unaccent.
 * Returns matching record IDs for any table/column combination.
 *
 * Used by admin query builders to add fuzzy matching without
 * restructuring their Prisma-based WHERE clauses.
 */

const ADMIN_FUZZY_THRESHOLD = 0.3
const ADMIN_FUZZY_TIMEOUT_MS = 2000
const ADMIN_FUZZY_MAX_RESULTS = 200

type FuzzyColumn = {
	/** Table name (e.g. "User", "Order") */
	table: string
	/** Column name (e.g. "name", "email") */
	column: string
	/** Whether to apply COALESCE for nullable columns */
	nullable?: boolean
}

type FuzzyAdminSearchOptions = {
	/** Columns to search across (OR logic between columns) */
	columns: FuzzyColumn[]
	/** Additional raw SQL WHERE condition (e.g. soft delete filter) */
	baseCondition?: Prisma.Sql
	/** Max results (default: 200) */
	limit?: number
}

/**
 * Perform fuzzy search on specified columns and return matching record IDs.
 * Uses pg_trgm similarity + ILIKE with immutable_unaccent for accent-insensitive matching.
 *
 * @param searchTerm - Raw search term
 * @param options - Table/column configuration
 * @returns Array of matching IDs, or null if search term is too short
 */
export async function fuzzySearchIds(
	searchTerm: string,
	options: FuzzyAdminSearchOptions
): Promise<string[] | null> {
	const term = searchTerm.trim()
	if (!term || term.length < 2) return null

	const { columns, baseCondition, limit = ADMIN_FUZZY_MAX_RESULTS } = options

	// Build OR conditions across all columns
	// Escape LIKE wildcards to prevent user input from being interpreted as patterns
	const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`
	const columnFragments = columns.map(({ table, column, nullable }) => {
		const col = nullable
			? Prisma.sql`COALESCE(${Prisma.raw(`"${table}"."${column}"`)}, '')`
			: Prisma.raw(`"${table}"."${column}"`)
		return Prisma.sql`(
			immutable_unaccent(${col}) ILIKE immutable_unaccent(${like})
			OR immutable_unaccent(${col}) % immutable_unaccent(${term})
		)`
	})

	const searchCondition = Prisma.sql`(${Prisma.join(columnFragments, " OR ")})`

	// Use the first column's table as the main table
	const mainTable = Prisma.raw(`"${columns[0].table}"`)

	try {
		const queryPromise = prisma.$transaction(async (tx) => {
			await setTrigramThreshold(tx, ADMIN_FUZZY_THRESHOLD)
			await setStatementTimeout(tx, ADMIN_FUZZY_TIMEOUT_MS)

			return tx.$queryRaw<{ id: string }[]>`
				SELECT ${mainTable}.id
				FROM ${mainTable}
				WHERE ${searchCondition}
				${baseCondition ?? Prisma.empty}
				LIMIT ${limit}
			`
		})

		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("Admin fuzzy search timeout")), ADMIN_FUZZY_TIMEOUT_MS)
		)

		const results = await Promise.race([queryPromise, timeoutPromise])
		return results.map((r) => r.id)
	} catch (error) {
		console.warn("[adminFuzzySearch] Failed:", error instanceof Error ? error.message : error)
		return null
	}
}
