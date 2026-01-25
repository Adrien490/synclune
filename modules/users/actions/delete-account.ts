"use server";

import { AccountStatus, OrderStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import type { ActionState } from "@/shared/types/server-action";
import { auth } from "@/modules/auth/lib/auth";
import { headers } from "next/headers";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import {
	success,
	error,
	handleActionError,
} from "@/shared/lib/actions";
import { USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { deleteUploadThingFileFromUrl } from "@/modules/media/services/delete-uploadthing-files.service";

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
		const rateCheck = await enforceRateLimitForCurrentUser(USER_LIMITS.DELETE_ACCOUNT);
		if ("error" in rateCheck) return rateCheck.error;

		// 2. Vérification de l'authentification
		const userAuth = await requireAuth();
		if ("error" in userAuth) return userAuth.error;

		const user = userAuth.user;

		const userId = user.id;

		// 3. Vérifier qu'il n'y a pas de commandes en cours
		const pendingOrders = await prisma.order.count({
			where: {
				userId,
				status: {
					in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPED],
				},
			},
		});

		if (pendingOrders > 0) {
			return error(
				`Vous avez ${pendingOrders} commande(s) en cours. Veuillez attendre leur livraison avant de supprimer votre compte.`
			);
		}

		const anonymizedEmail = `deleted_${userId.slice(0, 8)}@synclune.local`;
		const stripeCustomerId = user.stripeCustomerId;
		const userAvatar = user.image;

		// 4. Transaction pour garantir l'intégrité des données
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
			} catch {
				// Erreur silencieuse - le client Stripe sera orphelin mais le compte est supprimé
			}
		}

		// 4. Supprimer l'avatar UploadThing si present
		if (userAvatar) {
			deleteUploadThingFileFromUrl(userAvatar).catch((err) => {
				console.error("[deleteAccount] Erreur suppression avatar UploadThing:", err);
			});
		}

		// 5. Invalider la session Better Auth
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
