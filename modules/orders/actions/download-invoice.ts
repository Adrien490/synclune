"use server";

import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";
import { ActionStatus } from "@/shared/types/server-action";
import type { ActionState } from "@/shared/types/server-action";

/**
 * Télécharge la facture PDF d'une commande via Stripe
 *
 * @param orderId - ID de la commande
 * @returns URL de la facture PDF
 */
export async function downloadInvoice(
	orderId: string
): Promise<ActionState> {
	try {
		// Vérifier l'authentification
		const session = await getSession();

		if (!session?.user?.id) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour accéder à cette facture.",
			};
		}

		// Récupérer la commande
		const order = await prisma.order.findFirst({
			where: {
				id: orderId,
				userId: session.user.id, // S'assurer que c'est bien la commande de l'utilisateur
			},
			select: {
				stripeInvoiceId: true,
				invoiceNumber: true,
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: "Commande non trouvée.",
			};
		}

		if (!order.stripeInvoiceId) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune facture n'est disponible pour cette commande.",
			};
		}

		// Récupérer la facture depuis Stripe
		const invoice = await stripe.invoices.retrieve(order.stripeInvoiceId);

		if (!invoice.invoice_pdf) {
			return {
				status: ActionStatus.ERROR,
				message: "La facture PDF n'est pas encore disponible.",
			};
		}

		return {
			status: ActionStatus.SUCCESS,
			message: "Facture récupérée avec succès.",
			data: {
				url: invoice.invoice_pdf,
			},
		};
	} catch (error) {
		console.error("Error downloading invoice:", error);

		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de la récupération de la facture.",
		};
	}
}
