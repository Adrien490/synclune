import { cacheLife, cacheTag } from "next/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import { isPrerenderInterrupt } from "@/shared/lib/prerender-interrupt";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";

/**
 * Indexé par id d'item de navigation (`badges?.[item.id]` dans la sidebar et la
 * bottom bar) : le type reste stringly-keyed À DESSEIN — la SSOT des ids badgés
 * vit dans `navigation-config.tsx` (app/), que ce module ne peut pas importer
 * sans inverser la dépendance modules → app.
 */
export type AdminNavBadges = Record<string, number>;

/**
 * Pastilles de navigation admin — schéma lean (lot 4).
 *
 * `orders` = commandes PAID non expédiées (la file « à expédier »). Les
 * rétractations n'ont volontairement PAS de pastille (lot 5) : l'item n'est
 * pas dans QUICK_ACCESS et l'échéance de remboursement est portée par la
 * liste elle-même (`RefundDeadlineBadge`).
 *
 * Appelée par le layout admin, déjà gardé par `requireAdmin` — un simple
 * compteur, pas de donnée nominative.
 */
export async function getAdminNavBadges(): Promise<AdminNavBadges> {
	try {
		return await fetchAdminNavBadges();
	} catch (error) {
		if (!isPrerenderInterrupt(error)) {
			logger.error("[getAdminNavBadges] Échec de comptage", { error });
		}
		return { orders: 0 };
	}
}

async function fetchAdminNavBadges(): Promise<AdminNavBadges> {
	"use cache";
	cacheLife("user");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

	const toShip = await prisma.order.count({ where: { status: "PAID" } });
	return { orders: toShip };
}
