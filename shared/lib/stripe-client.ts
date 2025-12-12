import { loadStripe } from "@stripe/stripe-js"

let stripePromise: ReturnType<typeof loadStripe> | null = null

/**
 * Singleton pour charger Stripe.js côté client
 * Évite de charger le script plusieurs fois
 */
export function getStripe() {
	if (!stripePromise) {
		stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
	}
	return stripePromise
}
