import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type {
	GetStockByColorReturn,
	GetStockByMaterialReturn,
	StockByAttributeItem,
} from "../types/dashboard.types";

// ============================================================================
// TYPES SQL RESULTS
// ============================================================================

type StockByColorResult = {
	id: string | null;
	name: string | null;
	hex: string | null;
	totalUnits: bigint;
	skuCount: bigint;
	value: number;
};

type StockByMaterialResult = {
	id: string | null;
	name: string | null;
	totalUnits: bigint;
	skuCount: bigint;
	value: number;
};

// ============================================================================
// STOCK BY COLOR
// ============================================================================

/**
 * Recupere le stock agrege par couleur
 * Utilise une requete SQL native avec GROUP BY pour la performance
 */
export async function fetchStockByColor(): Promise<GetStockByColorReturn> {
	"use cache: remote";

	cacheDashboard(DASHBOARD_CACHE_TAGS.STOCK_BY_COLOR);

	const results = await prisma.$queryRaw<StockByColorResult[]>`
		SELECT
			c.id,
			c.name,
			c.hex,
			COALESCE(SUM(ps.inventory), 0)::bigint as "totalUnits",
			COUNT(ps.id)::bigint as "skuCount",
			COALESCE(SUM(ps.inventory * ps."priceInclTax"), 0)::float8 as value
		FROM "ProductSku" ps
		LEFT JOIN "Color" c ON ps."colorId" = c.id
		WHERE ps."isActive" = true AND ps.inventory > 0
		GROUP BY c.id, c.name, c.hex
		ORDER BY SUM(ps.inventory) DESC
	`;

	// Separer les resultats avec et sans couleur
	const colors: StockByAttributeItem[] = [];
	let uncategorizedUnits = 0;
	let uncategorizedValue = 0;

	for (const row of results) {
		if (row.id === null) {
			// SKUs sans couleur
			uncategorizedUnits = Number(row.totalUnits);
			uncategorizedValue = row.value;
		} else {
			colors.push({
				id: row.id,
				name: row.name ?? "Sans nom",
				hex: row.hex ?? undefined,
				totalUnits: Number(row.totalUnits),
				skuCount: Number(row.skuCount),
				value: row.value,
			});
		}
	}

	return {
		colors,
		uncategorized: {
			totalUnits: uncategorizedUnits,
			value: uncategorizedValue,
		},
	};
}

// ============================================================================
// STOCK BY MATERIAL
// ============================================================================

/**
 * Recupere le stock agrege par materiau
 * Utilise une requete SQL native avec GROUP BY pour la performance
 */
export async function fetchStockByMaterial(): Promise<GetStockByMaterialReturn> {
	"use cache: remote";

	cacheDashboard(DASHBOARD_CACHE_TAGS.STOCK_BY_MATERIAL);

	const results = await prisma.$queryRaw<StockByMaterialResult[]>`
		SELECT
			m.id,
			m.name,
			COALESCE(SUM(ps.inventory), 0)::bigint as "totalUnits",
			COUNT(ps.id)::bigint as "skuCount",
			COALESCE(SUM(ps.inventory * ps."priceInclTax"), 0)::float8 as value
		FROM "ProductSku" ps
		LEFT JOIN "Material" m ON ps."materialId" = m.id
		WHERE ps."isActive" = true AND ps.inventory > 0
		GROUP BY m.id, m.name
		ORDER BY SUM(ps.inventory) DESC
	`;

	// Separer les resultats avec et sans materiau
	const materials: StockByAttributeItem[] = [];
	let uncategorizedUnits = 0;
	let uncategorizedValue = 0;

	for (const row of results) {
		if (row.id === null) {
			// SKUs sans materiau
			uncategorizedUnits = Number(row.totalUnits);
			uncategorizedValue = row.value;
		} else {
			materials.push({
				id: row.id,
				name: row.name ?? "Sans nom",
				totalUnits: Number(row.totalUnits),
				skuCount: Number(row.skuCount),
				value: row.value,
			});
		}
	}

	return {
		materials,
		uncategorized: {
			totalUnits: uncategorizedUnits,
			value: uncategorizedValue,
		},
	};
}
