import { redirect } from "next/navigation"
import Stripe from "stripe"
import type { Metadata } from "next"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const metadata: Metadata = {
	title: "Vérification du paiement | Synclune",
	robots: {
		index: false,
		follow: false,
	},
}

interface CheckoutReturnPageProps {
	searchParams: Promise<{
		session_id?: string
		order_id?: string
	}>
}

/**
 * Page de retour après paiement Stripe Embedded Checkout
 * Vérifie le statut de la session et redirige vers la page appropriée
 */
export default async function CheckoutReturnPage({
	searchParams,
}: CheckoutReturnPageProps) {
	const params = await searchParams
	const sessionId = params.session_id
	const orderId = params.order_id

	// Si pas de session_id, retour au panier
	if (!sessionId) {
		redirect("/panier")
	}

	try {
		// Récupérer le statut de la session Stripe
		const session = await stripe.checkout.sessions.retrieve(sessionId)

		// Vérifier le statut de paiement (critère principal pour Embedded Checkout)
		if (session.payment_status === "paid") {
			// Paiement réussi - redirection vers la confirmation
			redirect(`/paiement/confirmation?order_id=${orderId}`)
		} else if (session.status === "open") {
			// Session encore ouverte - paiement non finalisé ou échoué
			// Retour au checkout pour réessayer
			redirect(`/paiement?retry=true&order_id=${orderId}`)
		} else if (session.status === "expired") {
			// Session expirée
			redirect(`/paiement/annulation?order_id=${orderId}&reason=expired`)
		} else {
			// Autre statut (processing, etc.)
			redirect(`/paiement/annulation?order_id=${orderId}&reason=processing_error`)
		}
	} catch (error) {
		// Erreur lors de la récupération de la session
		// console.error("[CHECKOUT_RETURN_ERROR]", error)
		redirect(`/paiement/annulation?order_id=${orderId}&reason=processing_error`)
	}
}
