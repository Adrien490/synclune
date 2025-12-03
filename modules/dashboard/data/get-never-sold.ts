import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import { cacheDashboard, DASHBOARD_CACHE_TAGS } from "../constants/cache";
import type { GetNeverSoldProductsReturn, NeverSoldProductItem } from "../types/dashboard.types";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Limite maximale de résultats pour éviter les requêtes trop coûteuses */
const MAX_TAKE = 100;
const DEFAULT_TAKE = 20;
const DEFAULT_SKIP = 0;

// ============================================================================
// TYPES
// ============================================================================

type NeverSoldRow = {
	productId: string;
	title: string;
	slug: string;
	createdAt: Date;
	skuCount: bigint;
	totalInventory: bigint;
	totalValue: bigint;
};

type CountRow = {
	count: bigint;
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Recupere les produits publics qui n'ont jamais ete vendus
 * Utilise des requêtes SQL agrégées pour de meilleures performances
 *
 * @param skip - Nombre de produits a ignorer (pagination)
 * @param take - Nombre de produits a retourner (pagination)
 */
export async function fetchNeverSoldProducts(
	skip: number = DEFAULT_SKIP,
	take: number = DEFAULT_TAKE
): Promise<GetNeverSoldProductsReturn> {
	"use cache: remote";

	cacheDashboard(DASHBOARD_CACHE_TAGS.NEVER_SOLD);

	// Valider et limiter les paramètres de pagination pour la sécurité
	const validatedSkip = Math.max(0, Math.floor(skip));
	const validatedTake = Math.min(Math.max(1, Math.floor(take)), MAX_TAKE);

	// Compter le total avec une requête SQL optimisée
	const [countResult] = await prisma.$queryRaw<CountRow[]>`
		SELECT COUNT(DISTINCT p.id) as count
		FROM "Product" p
		LEFT JOIN "OrderItem" oi ON oi."productId" = p.id
		WHERE
			p.status = 'PUBLIC'
			AND p."deletedAt" IS NULL
			AND oi.id IS NULL
	`;

	const totalCount = Number(countResult?.count ?? 0);

	// Récupérer les produits avec agrégation des SKUs en une seule requête
	const rows = await prisma.$queryRaw<NeverSoldRow[]>`
		SELECT
			p.id as "productId",
			p.title,
			p.slug,
			p."createdAt" as "createdAt",
			COUNT(ps.id) as "skuCount",
			COALESCE(SUM(ps.inventory), 0) as "totalInventory",
			COALESCE(SUM(ps.inventory * ps."priceInclTax"), 0) as "totalValue"
		FROM "Product" p
		LEFT JOIN "ProductSku" ps ON ps."productId" = p.id AND ps."isActive" = true
		LEFT JOIN "OrderItem" oi ON oi."productId" = p.id
		WHERE
			p.status = 'PUBLIC'
			AND p."deletedAt" IS NULL
			AND oi.id IS NULL
		GROUP BY p.id, p.title, p.slug, p."createdAt"
		ORDER BY p."createdAt" ASC
		LIMIT ${validatedTake}
		OFFSET ${validatedSkip}
	`;

	// Convertir les bigint en number
	const products: NeverSoldProductItem[] = rows.map((row) => ({
		productId: row.productId,
		title: row.title,
		slug: row.slug,
		createdAt: row.createdAt,
		skuCount: Number(row.skuCount),
		totalInventory: Number(row.totalInventory),
		totalValue: Number(row.totalValue),
	}));

	return {
		products,
		totalCount,
	};
}
