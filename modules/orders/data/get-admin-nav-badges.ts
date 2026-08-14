import { RefundStatus } from "@/app/generated/prisma/client";
import { SHARED_CACHE_TAGS } from "@/shared/constants/cache-tags";
import { prisma } from "@/shared/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";
import { buildToShipWhereClause } from "../services/to-ship.service";

/**
 * Compteurs de files d'attente actionnables affichés en pastille dans la
 * navigation admin (menu sheet mobile + bottom-bar + quick access).
 *
 * Keyé par `NavItem.id` (cf. navigation-config) pour être consommé directement
 * comme `badges` prop. Seules les files réellement actionnables sont comptées :
 * - `orders`  : file « à expédier » — prédicat SSOT `buildToShipWhereClause()`.
 * - `refunds` : remboursements à rattraper — FAILED (échec Stripe) ou COMPLETED
 *   sans avoir alors que la commande est facturée (exactement le périmètre du
 *   bouton `reconcile-refunds` de la page Maintenance). Le compteur PENDING
 *   est mort avec le workflow d'approbation (Lot 2 S3.3 — plus aucun chemin
 *   ne produit ce statut).
 *
 *
 * Typé `Record<string, number>` (keys = NavItem.id) pour être directement
 * assignable au prop `badges` des composants de navigation.
 */
export type AdminNavBadges = Record<string, number>;

/**
 * Récupère les compteurs de badges de navigation admin.
 *
 * Appelé uniquement depuis `app/admin/layout.tsx`, déjà gardé par
 * la garde admin du layout — pas de ré-auth ici (les counts agrégés ne sont pas
 * des données sensibles par-utilisateur et sont identiques pour tous les
 * admins, d'où un cache partagé plutôt que `private`).
 */
export async function getAdminNavBadges(): Promise<AdminNavBadges> {
	"use cache";
	cacheLife("user");
	cacheTag(SHARED_CACHE_TAGS.ADMIN_BADGES);

	const [orders, refunds] = await Promise.all([
		// File « à expédier » — prédicat SSOT partagé avec le KPI du tableau de bord.
		// Les deux divergeaient (PAID+UNFULFILLED ici vs SHIPPABLE+{UNFULFILLED,PROCESSING}
		// là-bas) et affichaient donc deux nombres différents sur le même écran.
		prisma.order.count({ where: buildToShipWhereClause() }),
		// Remboursements à rattraper (Lot 2 S3.3) : échec Stripe, ou avoir manquant
		// sur une commande facturée — le prédicat du bouton Maintenance
		// `reconcile-refunds` (cf. backfillMissingCreditNotes).
		prisma.refund.count({
			where: {
				OR: [
					{ status: RefundStatus.FAILED },
					{
						status: RefundStatus.COMPLETED,
						creditNoteNumber: null,
						order: { invoiceNumber: { not: null } },
					},
				],
			},
		}),
	]);

	return { orders, refunds };
}
