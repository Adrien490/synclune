import { getSession } from "@/shared/utils/get-session";
import { prisma } from "@/shared/lib/prisma";
import { stripe } from "@/shared/lib/stripe";

import type {
	GetOrderInvoiceUrlsReturn,
	DownloadInvoicePdfReturn,
} from "../types/invoice.types";

// Re-export pour compatibilité
export type {
	GetOrderInvoiceUrlsReturn,
	DownloadInvoicePdfReturn,
} from "../types/invoice.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * 🔒 SERVER ACTION SÉCURISÉE : Récupération URLs facture à la demande
 *
 * SÉCURITÉ :
 * - Ne JAMAIS stocker les URLs en base de données (contiennent tokens d'accès)
 * - Récupérer les URLs dynamiquement via API Stripe
 * - Vérifier les droits d'accès (admin OU propriétaire de la commande)
 *
 * @param orderId - ID de la commande
 * @returns URLs de facture (PDF + hosted invoice) ou null si non autorisé
 */
export async function getOrderInvoiceUrls(
	orderId: string
): Promise<GetOrderInvoiceUrlsReturn> {
	try {
		const session = await getSession();

		if (!session?.user) {
			return {
				success: false,
				error: "Non authentifié",
			};
		}

		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				userId: true,
				stripeInvoiceId: true,
				invoiceNumber: true,
				invoiceStatus: true,
			},
		});

		if (!order) {
			return {
				success: false,
				error: "Commande introuvable",
			};
		}

		const isAdminUser = session.user.role === "ADMIN";
		const isOwner = order.userId === session.user.id;

		if (!isAdminUser && !isOwner) {
			return {
				success: false,
				error: "Accès refusé",
			};
		}

		if (!order.stripeInvoiceId) {
			return {
				success: false,
				error: "Aucune facture générée pour cette commande",
			};
		}

		const invoice = await stripe.invoices.retrieve(order.stripeInvoiceId);

		if (!invoice) {
			return {
				success: false,
				error: "Facture introuvable sur Stripe",
			};
		}

		return {
			success: true,
			invoicePdfUrl: invoice.invoice_pdf || undefined,
			invoiceUrl: invoice.hosted_invoice_url || undefined,
			invoiceNumber: order.invoiceNumber || undefined,
		};
	} catch (error) {
// console.error("[getOrderInvoiceUrls] Erreur:", error);

		return {
			success: false,
			error: error instanceof Error ? error.message : "Erreur serveur",
		};
	}
}

/**
 * 🔒 SERVER ACTION : Téléchargement direct facture PDF
 *
 * Alternative sécurisée qui proxy le téléchargement via votre serveur
 * (évite d'exposer les URLs Stripe au client)
 *
 * @param orderId - ID de la commande
 * @returns Blob PDF ou null
 */
export async function downloadInvoicePdf(
	orderId: string
): Promise<DownloadInvoicePdfReturn> {
	try {
		const result = await getOrderInvoiceUrls(orderId);

		if (!result.success || !result.invoicePdfUrl) {
			return {
				success: false,
				error: result.error || "PDF non disponible",
			};
		}

		const response = await fetch(result.invoicePdfUrl);

		if (!response.ok) {
			return {
				success: false,
				error: "Échec de téléchargement du PDF",
			};
		}

		const arrayBuffer = await response.arrayBuffer();
		const pdfData = new Uint8Array(arrayBuffer);

		return {
			success: true,
			pdfData,
			filename: `facture-${result.invoiceNumber || orderId}.pdf`,
		};
	} catch (error) {
// console.error("[downloadInvoicePdf] Erreur:", error);

		return {
			success: false,
			error: error instanceof Error ? error.message : "Erreur serveur",
		};
	}
}
