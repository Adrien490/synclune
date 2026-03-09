import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { stripe } from "@/shared/lib/stripe";

const searchParamsSchema = z.object({
	session_id: z.string().min(1),
	order_id: z.string().cuid().optional(),
});

export const metadata: Metadata = {
	title: "Vérification du paiement | Synclune",
	robots: {
		index: false,
		follow: false,
	},
};

interface CheckoutReturnPageProps {
	searchParams: Promise<{
		session_id?: string;
		order_id?: string;
	}>;
}

/**
 * Page de retour après paiement Stripe Embedded Checkout
 * Vérifie le statut de la session et redirige vers la page appropriée
 */
export default async function CheckoutReturnPage({ searchParams }: CheckoutReturnPageProps) {
	const params = await searchParams;

	// Validation Zod des paramètres
	const validation = searchParamsSchema.safeParse(params);
	if (!validation.success) {
		redirect("/");
	}

	const { session_id: sessionId, order_id: orderId } = validation.data;

	let redirectUrl: string;

	try {
		// Récupérer le statut de la session Stripe
		const session = await stripe.checkout.sessions.retrieve(sessionId);

		// Extract orderNumber from Stripe session metadata for secure confirmation lookup
		const orderNumber = session.metadata?.orderNumber;

		// Vérifier le statut de paiement (critère principal pour Embedded Checkout)
		if (session.payment_status === "paid") {
			// Paiement réussi - redirection vers la confirmation
			redirectUrl = `/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}`;
		} else if (session.status === "open") {
			// Session encore ouverte - paiement non finalisé ou échoué
			// Retour au checkout pour réessayer
			redirectUrl = `/paiement?retry=true&order_id=${orderId}`;
		} else if (session.payment_status === "unpaid" && session.status === "complete") {
			// Async payment in progress (SEPA, Klarna, etc.)
			redirectUrl = `/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}&pending=true`;
		} else if (session.status === "expired") {
			// Session expirée
			redirectUrl = `/paiement/annulation?order_id=${orderId}&reason=expired`;
		} else {
			// Autre statut (processing, etc.)
			redirectUrl = `/paiement/annulation?order_id=${orderId}&reason=processing_error`;
		}
	} catch {
		// Erreur lors de la récupération de la session
		redirectUrl = `/paiement/annulation?order_id=${orderId}&reason=processing_error`;
	}

	redirect(redirectUrl);
}
