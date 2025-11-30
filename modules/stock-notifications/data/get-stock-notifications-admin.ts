import { prisma } from "@/shared/lib/prisma";
import { Prisma, StockNotificationStatus } from "@/app/generated/prisma/client";
import { cacheLife, cacheTag } from "next/cache";
import {
	buildCursorPagination,
	processCursorResults,
} from "@/shared/components/cursor-pagination/pagination";
import { getSortDirection } from "@/shared/utils/sort-direction";
import { STOCK_NOTIFICATIONS_CACHE_TAGS } from "../constants/cache";

// ============================================================================
// TYPES
// ============================================================================

export interface StockNotificationAdminFilters {
	status?: StockNotificationStatus;
	search?: string;
}

export interface GetStockNotificationsAdminParams {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: number;
	sortBy?: string;
	filters?: StockNotificationAdminFilters;
}

export interface StockNotificationAdmin {
	id: string;
	email: string;
	status: StockNotificationStatus;
	createdAt: Date;
	notifiedAt: Date | null;
	sku: {
		id: string;
		sku: string;
		inventory: number;
		priceInclTax: number;
		color: { name: string; hex: string } | null;
		material: string | null;
		size: string | null;
		images: Array<{ url: string; isPrimary: boolean }>;
		product: {
			id: string;
			slug: string;
			title: string;
		};
	};
	user: {
		id: string;
		name: string | null;
		email: string;
	} | null;
}

export interface GetStockNotificationsAdminReturn {
	notifications: StockNotificationAdmin[];
	pagination: {
		nextCursor: string | null;
		prevCursor: string | null;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 100;

const ADMIN_SELECT = {
	id: true,
	email: true,
	status: true,
	createdAt: true,
	notifiedAt: true,
	sku: {
		select: {
			id: true,
			sku: true,
			inventory: true,
			priceInclTax: true,
			color: {
				select: { name: true, hex: true },
			},
			material: true,
			size: true,
			images: {
				select: { url: true, isPrimary: true },
				orderBy: { isPrimary: "desc" as const },
				take: 1,
			},
			product: {
				select: {
					id: true,
					slug: true,
					title: true,
				},
			},
		},
	},
	user: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
} satisfies Prisma.StockNotificationRequestSelect;

// ============================================================================
// SORT OPTIONS
// ============================================================================

export const STOCK_NOTIFICATIONS_SORT_OPTIONS = {
	CREATED_DESC: "created-descending",
	CREATED_ASC: "created-ascending",
	STATUS_ASC: "status-ascending",
	STATUS_DESC: "status-descending",
	PRODUCT_ASC: "product-ascending",
} as const;

export const STOCK_NOTIFICATIONS_SORT_LABELS: Record<string, string> = {
	"created-descending": "Date (récent)",
	"created-ascending": "Date (ancien)",
	"status-ascending": "Statut (A-Z)",
	"status-descending": "Statut (Z-A)",
	"product-ascending": "Produit (A-Z)",
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Récupère les demandes de notification pour l'admin avec pagination et filtres
 */
export async function getStockNotificationsAdmin(
	params: GetStockNotificationsAdminParams
): Promise<GetStockNotificationsAdminReturn> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST);

	try {
		const { cursor, direction, sortBy, filters } = params;
		const perPage = Math.min(
			Math.max(1, params.perPage || DEFAULT_PER_PAGE),
			MAX_PER_PAGE
		);

		// Build where clause
		// ⚠️ AUDIT FIX: Filtre deletedAt sur la notification elle-même + utilisateurs soft-deleted
		const where: Prisma.StockNotificationRequestWhereInput = {
			deletedAt: null, // Exclure les notifications soft-deleted
			OR: [
				{ user: null }, // Visiteurs anonymes
				{ user: { deletedAt: null } }, // Utilisateurs actifs
			],
		};

		if (filters?.status) {
			where.status = filters.status;
		}

		if (filters?.search) {
			where.AND = [
				{
					OR: [
						{ email: { contains: filters.search, mode: "insensitive" } },
						{
							sku: {
								product: {
									title: { contains: filters.search, mode: "insensitive" },
								},
							},
						},
					],
				},
			];
		}

		// Build order by
		const sortDirection = getSortDirection(sortBy || "created-descending");
		let orderBy: Prisma.StockNotificationRequestOrderByWithRelationInput[] = [
			{ createdAt: sortDirection },
			{ id: "asc" },
		];

		if (sortBy?.startsWith("status-")) {
			orderBy = [{ status: sortDirection }, { id: "asc" }];
		} else if (sortBy?.startsWith("product-")) {
			orderBy = [
				{ sku: { product: { title: sortDirection } } },
				{ id: "asc" },
			];
		}

		// Pagination
		const cursorConfig = buildCursorPagination({
			cursor,
			direction,
			take: perPage,
		});

		const notifications = await prisma.stockNotificationRequest.findMany({
			where,
			select: ADMIN_SELECT,
			orderBy,
			...cursorConfig,
		});

		const { items, pagination } = processCursorResults(
			notifications,
			perPage,
			direction,
			cursor
		);

		return {
			notifications: items,
			pagination,
		};
	} catch (error) {
		console.error("[getStockNotificationsAdmin] Error:", error);
		return {
			notifications: [],
			pagination: {
				nextCursor: null,
				prevCursor: null,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		};
	}
}

// ============================================================================
// STATS
// ============================================================================

export interface StockNotificationsStats {
	totalPending: number;
	notifiedThisMonth: number;
	skusWithPendingRequests: number;
}

/**
 * Récupère les statistiques pour l'admin
 */
export async function getStockNotificationsStats(): Promise<StockNotificationsStats> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(STOCK_NOTIFICATIONS_CACHE_TAGS.PENDING_LIST);

	try {
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [totalPending, notifiedThisMonth, skusWithPending] =
			await Promise.all([
				// Total demandes en attente (excluant soft-deleted)
				prisma.stockNotificationRequest.count({
					where: { status: StockNotificationStatus.PENDING, deletedAt: null },
				}),

				// Notifications envoyées ce mois (excluant soft-deleted)
				prisma.stockNotificationRequest.count({
					where: {
						status: StockNotificationStatus.NOTIFIED,
						notifiedAt: { gte: startOfMonth },
						deletedAt: null,
					},
				}),

				// Nombre de SKUs distincts avec demandes en attente (excluant soft-deleted)
				prisma.stockNotificationRequest.groupBy({
					by: ["skuId"],
					where: { status: StockNotificationStatus.PENDING, deletedAt: null },
				}),
			]);

		return {
			totalPending,
			notifiedThisMonth,
			skusWithPendingRequests: skusWithPending.length,
		};
	} catch (error) {
		console.error("[getStockNotificationsStats] Error:", error);
		return {
			totalPending: 0,
			notifiedThisMonth: 0,
			skusWithPendingRequests: 0,
		};
	}
}
