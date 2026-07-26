import { prisma, notDeleted } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { normalizeEmail } from "@/shared/utils/normalize-email";
import { ActionStatus } from "@/shared/types/server-action";
import { AccountStatus } from "@/app/generated/prisma/client";

/**
 * Sous-ensemble structurel du ctx Better Auth (`createAuthMiddleware`) consommé
 * par le hook post-login. Permet de tester la logique sans charger la config
 * Better Auth complète (env, adapters, plugins).
 */
export interface PostLoginMergeContext {
	context: {
		newSession?: {
			user: { id: string; email?: string | null };
		} | null;
	};
	getCookie(name: string): string | null | undefined;
	setCookie(name: string, value: string, options?: { maxAge?: number; path?: string }): unknown;
}

/**
 * Rattachement des données invité au compte après connexion/inscription réussie.
 *
 * Corps du hook Better Auth `after` (extrait de `auth.ts` pour testabilité) :
 * 1. Merge du panier invité (cookie `cart_session`) — cookie supprimé UNIQUEMENT
 *    si le merge réussit, conservé sinon pour retry au prochain login.
 * 2. Merge de la wishlist invité (cookie `wishlist_session`), même contrat.
 * 3. Liaison rétroactive des commandes guest par email.
 *
 * Skip intégral si le compte n'est pas ACTIVE : un user PENDING_DELETION qui se
 * reconnecte uniquement pour annuler sa demande (cancelAccountDeletion) ne doit
 * pas rattacher de nouvelles données à son compte mort.
 *
 * Les modules cart/wishlist/orders sont importés dynamiquement pour éviter les
 * cycles de dépendances (ils importent eux-mêmes le module auth).
 */
export async function handlePostLoginMerges(ctx: PostLoginMergeContext): Promise<void> {
	const newSession = ctx.context.newSession;

	// Vérifier qu'une nouvelle session a été créée (connexion/inscription réussie)
	if (!newSession) {
		return; // Pas de nouvelle session, rien à faire
	}

	const accountState = await prisma.user.findUnique({
		where: { id: newSession.user.id },
		select: { accountStatus: true },
	});
	if (accountState?.accountStatus !== AccountStatus.ACTIVE) {
		return;
	}

	// Récupérer le cookie de session visiteur du panier (validation UUID v4 stricte)
	const rawCartSessionId = ctx.getCookie("cart_session");
	const { isValidCartSessionId } = await import("@/modules/cart/lib/cart-session");
	const cartSessionId = isValidCartSessionId(rawCartSessionId) ? rawCartSessionId : null;

	// 🛒 MERGE DU PANIER
	if (cartSessionId) {
		try {
			const { mergeCarts } = await import("@/modules/cart/actions/merge-carts");
			const cartResult = await mergeCarts(newSession.user.id, cartSessionId);

			if (cartResult.status === ActionStatus.SUCCESS) {
				// ✅ Merge réussi : supprimer le cookie
				ctx.setCookie("cart_session", "", {
					maxAge: 0,
					path: "/",
				});
			}
		} catch (_error) {
			// Ignore - Cookie preserved for retry
		}
	}

	// ❤️ MERGE DE LA WISHLIST
	const wishlistSessionId = ctx.getCookie("wishlist_session");
	const { isValidUuidV4 } = await import("@/modules/wishlist/lib/wishlist-session");
	if (wishlistSessionId && isValidUuidV4(wishlistSessionId)) {
		try {
			const { mergeWishlists } = await import("@/modules/wishlist/actions/merge-wishlists");
			const wishlistResult = await mergeWishlists(newSession.user.id, wishlistSessionId);

			if (wishlistResult.status === ActionStatus.SUCCESS) {
				// ✅ Merge réussi : supprimer le cookie
				ctx.setCookie("wishlist_session", "", {
					maxAge: 0,
					path: "/",
				});
			}
		} catch (error) {
			// Log l'erreur pour debugging mais continue (cookie preserved for retry)
			logger.error("Wishlist merge failed", error, {
				service: "auth",
				userId: newSession.user.id,
			});
		}
	}

	// 📦 LINK GUEST ORDERS (retroactive order linking by email)
	// When a guest creates an account or signs in, link their previous
	// guest orders (userId: null) to the new account by email match.
	//
	// AUDIT-BIZ-001 : l'email est normalisé ICI (trim + lowercase) et pas
	// seulement supposé normalisé en amont. `Order.customerEmail` est écrit via
	// `normalizeEmail` par `confirmCheckout`, et la comparaison Prisma est
	// sensible à la casse sur Postgres : ce rattachement est le SEUL pont entre
	// une commande invité et un compte, et il échouerait en SILENCE (aucune
	// erreur — la commande n'apparaîtrait simplement jamais dans l'espace client)
	// si la casse divergeait. Better Auth normalise aujourd'hui à l'inscription
	// email/mot de passe, mais on ne dépend pas d'un invariant interne de lib pour
	// un pont métier — d'autant que les providers OAuth ne passent pas par ce
	// chemin. Verrouillé par `post-login-merge.test.ts`.
	if (newSession.user.email) {
		const normalizedEmail = normalizeEmail(newSession.user.email);
		try {
			const { count } = await prisma.order.updateMany({
				where: {
					userId: null,
					customerEmail: normalizedEmail,
					...notDeleted,
				},
				data: {
					userId: newSession.user.id,
				},
			});

			if (count > 0) {
				// Invalidate user orders cache so they appear in the account
				const { updateTag } = await import("next/cache");
				const { ORDERS_CACHE_TAGS } = await import("@/modules/orders/constants/cache");
				updateTag(ORDERS_CACHE_TAGS.USER_ORDERS(newSession.user.id));
			}
		} catch (error) {
			logger.error("Guest order linking failed", error, {
				service: "auth",
				userId: newSession.user.id,
			});
		}
	}
}
