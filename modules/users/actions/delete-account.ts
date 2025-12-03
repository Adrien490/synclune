"use server";

import { AccountStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import type { ActionState } from "@/shared/types/server-action";
import { auth } from "@/modules/auth/lib/auth";
import { headers } from "next/headers";
import {
	requireAuth,
	enforceRateLimitForCurrentUser,
	success,
	error,
	handleActionError,
} from "@/shared/lib/actions";

// Rate limit: 3 requêtes par heure (action sensible RGPD)
const DELETE_ACCOUNT_RATE_LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 };

/**
 * Server Action pour supprimer le compte utilisateur (droit à l'oubli RGPD)
 *
 * Cette action :
 * - Anonymise les commandes (obligation comptable 10 ans - art. L123-22 Code de commerce)
 * - Supprime les données personnelles non nécessaires à la comptabilité
 * - Supprime le client Stripe
 * - Effectue un soft delete du compte
 *
 * Les commandes sont conservées avec des données anonymisées pour la comptabilité.
 */
export async function deleteAccount(): Promise<ActionState> {
	try {
		// 1. Rate limiting
		const rateCheck = await enforceRateLimitForCurrentUser(DELETE_ACCOUNT_RATE_LIMIT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification de l'authentification
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		const user = userAuth.user;

		const userId = user.id;
		const anonymizedEmail = `deleted_${userId.slice(0, 8)}@synclune.local`;
		const stripeCustomerId = user.stripeCustomerId;

		// 2. Transaction pour garantir l'intégrité des données
		await prisma.$transaction(async (tx) => {
			// 2.1 Anonymiser les commandes (conserver pour comptabilité)
			await tx.order.updateMany({
				where: { userId },
				data: {
					customerEmail: anonymizedEmail,
					customerName: "Client supprimé",
					customerPhone: null,
					// Adresse de livraison
					shippingFirstName: "Anonyme",
					shippingLastName: "Anonyme",
					shippingAddress1: "Adresse supprimée",
					shippingAddress2: null,
					shippingPhone: "",
					// Adresse de facturation
					billingFirstName: "Anonyme",
					billingLastName: "Anonyme",
					billingAddress1: "Adresse supprimée",
					billingAddress2: null,
					billingPhone: null,
				},
			});

			// 2.2 Supprimer les données non nécessaires à la comptabilité
			// Adresses
			await tx.address.deleteMany({ where: { userId } });

			// Panier
			await tx.cart.deleteMany({ where: { userId } });

			// Wishlist
			await tx.wishlist.deleteMany({ where: { userId } });

			// Sessions (déconnexion de tous les appareils)
			await tx.session.deleteMany({ where: { userId } });

			// Comptes OAuth
			await tx.account.deleteMany({ where: { userId } });

			// 2.3 Soft delete du compte utilisateur avec anonymisation RGPD
			await tx.user.update({
				where: { id: userId },
				data: {
					deletedAt: new Date(),
					anonymizedAt: new Date(),
					accountStatus: AccountStatus.ANONYMIZED,
					email: anonymizedEmail,
					name: "Compte supprimé",
					image: null,
					stripeCustomerId: null,
					emailVerified: false,
					// Effacer les données RGPD
					signupIpAddress: null,
					signupUserAgent: null,
					termsAcceptedAt: null,
					termsVersion: null,
					privacyPolicyAcceptedAt: null,
					privacyPolicyVersion: null,
					marketingEmailConsentedAt: null,
					marketingConsentSource: null,
				},
			});
		});

		// 3. Supprimer le client Stripe (hors transaction car externe)
		if (stripeCustomerId) {
			try {
				await stripe.customers.del(stripeCustomerId);
			} catch (stripeError) {
				// Log l'erreur mais ne fait pas échouer la suppression
				// Le client Stripe sera orphelin mais le compte est supprimé
				console.error(
					"[DELETE_ACCOUNT] Erreur suppression client Stripe:",
					stripeError
				);
			}
		}

		// 4. Invalider la session Better Auth
		const headersList = await headers();
		await auth.api.signOut({
			headers: headersList,
		});

		return success(
			"Votre compte a été supprimé. Vos données personnelles ont été effacées conformément au RGPD."
		);
	} catch (e) {
		return handleActionError(e, "Erreur lors de la suppression du compte");
	}
}
