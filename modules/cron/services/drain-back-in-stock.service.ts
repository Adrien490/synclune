import { ProductStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { notifyBackInStock } from "@/modules/wishlist/services/notify-back-in-stock";
import { MARKETING_DAILY_EMAIL_BUDGET } from "@/modules/emails/constants/email-budget";
import type { CronResult } from "@/modules/cron/lib/cron-result";

const CRON_JOB = "drain-back-in-stock";

/**
 * Nombre maximum de produits inspectés par passe.
 *
 * Chaque produit déclenche au plus `MARKETING_DAILY_EMAIL_BUDGET` envois, donc
 * le budget s'épuise bien avant cette borne dans tous les cas réalistes. Elle
 * n'existe que pour empêcher un scan illimité si la file grossit anormalement.
 */
const MAX_PRODUCTS_PER_RUN = 25;

/**
 * Vide la file d'attente des notifications « retour en stock » (audit coûts P1-3).
 *
 * `notifyBackInStock` est événementiel : il ne s'exécute qu'au moment du réassort.
 * Depuis qu'il est borné par le budget marketing quotidien, un réassort sur un
 * produit à forte demande laisse un reliquat d'inscrits non notifiés — sans cette
 * passe, ils n'auraient jamais leur email (le produit ne sera pas re-réassorti).
 *
 * La passe reprend donc chaque jour là où le budget s'était arrêté, jusqu'à
 * épuisement de la file. Elle est **idempotente** : `backInStockNotifiedAt`
 * exclut les items déjà notifiés, et `notifyBackInStock` re-consulte le budget
 * du jour à chaque appel.
 *
 * Ne sélectionne que les produits dont un SKU actif a effectivement du stock —
 * un produit retombé en rupture entre-temps ne doit pas générer d'email
 * « revenu en stock » menant vers un bouton d'achat désactivé.
 *
 * Exception services/ : service transactionnel cron (envoi email + flag DB),
 * cf. `01-conventions.md § Services transactionnels partagés`.
 */
export async function drainBackInStockQueue(): Promise<CronResult> {
	const startedAt = Date.now();

	try {
		const pending = await prisma.wishlistItem.findMany({
			where: {
				backInStockNotifiedAt: null,
				product: {
					status: ProductStatus.PUBLIC,
					deletedAt: null,
					// Stock réellement disponible au moment du drainage.
					skus: { some: { isActive: true, inventory: { gt: 0 } } },
				},
				wishlist: {
					userId: { not: null },
					user: { deletedAt: null, marketingOptOutAt: null },
				},
			},
			select: { productId: true },
			distinct: ["productId"],
			take: MAX_PRODUCTS_PER_RUN,
			orderBy: { productId: "asc" },
		});

		if (pending.length === 0) {
			return { processed: 0, errored: 0, skipped: 1, durationMs: Date.now() - startedAt };
		}

		let sent = 0;
		let errored = 0;
		let productsDrained = 0;

		// `WishlistItem.productId` est nullable au schéma (produit détaché) : la
		// clause `where` sur `product` les exclut déjà, ce filtre ne fait que
		// l'apprendre au typage.
		const productIds = pending
			.map(({ productId }) => productId)
			.filter((id): id is string => id !== null);

		for (const productId of productIds) {
			// Budget épuisé : inutile de continuer, `notifyBackInStock` renverrait 0
			// pour chaque produit restant. Le reliquat repart demain.
			if (sent >= MARKETING_DAILY_EMAIL_BUDGET) break;

			try {
				const delivered = await notifyBackInStock(productId);
				sent += delivered;
				productsDrained += 1;
			} catch (error) {
				errored += 1;
				logger.error("Back-in-stock drain failed for product", error, {
					cronJob: CRON_JOB,
					productId,
				});
			}
		}

		logger.info("Back-in-stock queue drain completed", {
			cronJob: CRON_JOB,
			productsDrained,
			sent,
			errored,
		});

		return {
			processed: sent,
			errored,
			skipped: 0,
			// La file n'est pas forcément vide : soit le budget a coupé, soit il
			// reste des produits au-delà de MAX_PRODUCTS_PER_RUN.
			hasMore: sent >= MARKETING_DAILY_EMAIL_BUDGET || productIds.length === MAX_PRODUCTS_PER_RUN,
			durationMs: Date.now() - startedAt,
		};
	} catch (error) {
		logger.error("Back-in-stock queue drain failed", error, { cronJob: CRON_JOB });
		return { processed: 0, errored: 1, skipped: 0, durationMs: Date.now() - startedAt };
	}
}
