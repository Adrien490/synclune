import { redirect } from "next/navigation"
import Stripe from "stripe"
import type { Metadata } from "next"
import { z } from "zod"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const searchParamsSchema = z.object({
	session_id: z.string().min(1),
	order_id: z.string().cuid().optional(),
})

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

	// Validation Zod des paramètres
	const validation = searchParamsSchema.safeParse(params)
	if (!validation.success) {
		redirect("/")
	}

	const { session_id: sessionId, order_id: orderId } = validation.data

	try {
		// Récupérer le statut de la session Stripe
		const session = await stripe.checkout.sessions.retrieve(sessionId)

		// Extract orderNumber from Stripe session metadata for secure confirmation lookup
		const orderNumber = session.metadata?.orderNumber

		// Vérifier le statut de paiement (critère principal pour Embedded Checkout)
		if (session.payment_status === "paid") {
			// Paiement réussi - redirection vers la confirmation
			redirect(`/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}`)
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
