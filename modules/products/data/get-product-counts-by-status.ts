import { isAdmin } from "@/modules/admin-auth/lib/require-admin";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { PRODUCTS_CACHE_TAGS } from "../constants/cache";

import type {
	GetProductCountsByStatusReturn,
	ProductCountsByStatus,
} from "../types/product-counts.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le nombre de produits par statut (en vente / brouillons) — schéma
 * lean : le statut est le booléen `active`.
 *
 * Protection: Nécessite un compte ADMIN
 */
export async function getProductCountsByStatus(): Promise<GetProductCountsByStatusReturn> {
	const admin = await isAdmin();
	if (!admin) {
		throw new Error("Accès non autorisé. Droits administrateur requis.");
	}

	// Repli HORS du scope de cache : les compteurs à zéro d'une panne étaient mis en
	// cache comme un résultat légitime pour la fenêtre du profil `user`, et « 0
	// brouillon / 0 publié » est indiscernable d'un catalogue vide.
	try {
		return await fetchProductCountsByStatus();
	} catch (error) {
		logger.error("Failed to fetch product counts by status", error, {
			service: "getProductCountsByStatus",
		});
		return { active: 0, draft: 0 };
	}
}

/**
 * Récupère les compteurs depuis la DB avec cache
 */
async function fetchProductCountsByStatus(): Promise<ProductCountsByStatus> {
	"use cache";
	cacheLife("user");
	cacheTag(PRODUCTS_CACHE_TAGS.COUNTS);

	const [active, draft] = await Promise.all([
		prisma.product.count({ where: { active: true } }),
		prisma.product.count({ where: { active: false } }),
	]);

	return { active, draft };
}
