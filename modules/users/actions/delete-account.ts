"use server";

import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { auth } from "@/modules/auth/lib/auth";
import { headers } from "next/headers";

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
		// 1. Vérification de l'authentification
		const user = await getCurrentUser();

		if (!user) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour supprimer votre compte",
			};
		}

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

			// 2.3 Soft delete du compte utilisateur
			await tx.user.update({
				where: { id: userId },
				data: {
					deletedAt: new Date(),
					email: anonymizedEmail,
					name: "Compte supprimé",
					image: null,
					stripeCustomerId: null,
					emailVerified: false,
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

		return {
			status: ActionStatus.SUCCESS,
			message:
				"Votre compte a été supprimé. Vos données personnelles ont été effacées conformément au RGPD.",
		};
	} catch (error) {
		console.error("[DELETE_ACCOUNT] Erreur:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error
					? error.message
					: "Une erreur est survenue lors de la suppression du compte",
		};
	}
}
