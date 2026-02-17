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

// Allowlist of table/column pairs permitted in Prisma.raw() interpolation.
// Prevents SQL injection if a caller ever passes dynamic values.
const ALLOWED_FUZZY_COLUMNS: ReadonlySet<string> = new Set([
	"Order.customerName",
	"Order.customerEmail",
	"User.name",
	"User.email",
])

type FuzzyColumn = {
	/** Table name (e.g. "User", "Order") — must be in ALLOWED_FUZZY_COLUMNS */
	table: string
	/** Column name (e.g. "name", "email") — must be in ALLOWED_FUZZY_COLUMNS */
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

	// Validate all table/column pairs against the allowlist
	for (const { table, column } of columns) {
		if (!ALLOWED_FUZZY_COLUMNS.has(`${table}.${column}`)) {
			throw new Error(`[SEARCH] Disallowed fuzzy search column: ${table}.${column}`)
		}
	}

	// Build OR conditions across all columns.
	// Table/column names are validated against ALLOWED_FUZZY_COLUMNS above.
	// Only `term` is user-supplied and is always passed through parameterized queries.
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

	const startTime = performance.now()

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
		const durationMs = Math.round(performance.now() - startTime)

		if (durationMs > 500) {
			console.warn(
				`[SEARCH] slow-admin-fuzzy | term="${term}" | table="${columns[0].table}" | results=${results.length} | duration=${durationMs}ms`
			)
		}

		return results.map((r) => r.id)
	} catch (error) {
		const durationMs = Math.round(performance.now() - startTime)
		console.warn(
			`[SEARCH] admin-fuzzy-error | term="${term}" | table="${columns[0].table}" | duration=${durationMs}ms | error="${error instanceof Error ? error.message : error}"`
		)
		return null
	}
}
