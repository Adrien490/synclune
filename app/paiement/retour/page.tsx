import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { stripe } from "@/shared/lib/stripe";

const STRIPE_RETRIEVE_TIMEOUT_MS = 5_000;

const piSearchParamsSchema = z.object({
	payment_intent: z.string().min(1),
	redirect_status: z.string().min(1),
	order_id: z.cuid(),
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
		payment_intent?: string;
		redirect_status?: string;
		order_id?: string;
	}>;
}

/**
 * Promise.race wrapper pour borner les appels Stripe.
 *
 * Le SDK Stripe v18 supporte `maxNetworkRetries` mais pas de deadline globale —
 * une indisponibilité Stripe pourrait figer la page jusqu'au timeout Vercel (10-30s).
 * On rejette manuellement après 5s et le caller redirige vers `/paiement/annulation?reason=processing_error`.
 */
async function withStripeDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			reject(new Error(`Stripe retrieve exceeded ${timeoutMs}ms`));
		}, timeoutMs);
	});
	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/**
 * Payment return page — PaymentIntent flow (Stripe Elements).
 * Verifies payment status and redirects to the appropriate page.
 */
export default async function CheckoutReturnPage({ searchParams }: CheckoutReturnPageProps) {
	const params = await searchParams;

	// === New PI flow ===
	const piValidation = piSearchParamsSchema.safeParse(params);
	if (piValidation.success) {
		const {
			payment_intent: piId,
			redirect_status: redirectStatus,
			order_id: orderId,
		} = piValidation.data;

		let redirectUrl: string;

		try {
			const pi = await withStripeDeadline(
				stripe.paymentIntents.retrieve(piId),
				STRIPE_RETRIEVE_TIMEOUT_MS,
			);
			const orderNumber = pi.metadata.orderNumber;
			const cancelSuffix = orderNumber ? `&order_number=${orderNumber}` : "";

			// La décision « succès » s'appuie EXCLUSIVEMENT sur `pi.status` retrieve
			// serveur — jamais sur `redirect_status`, qui provient de l'URL et est
			// donc manipulable. La page de confirmation re-vérifie de toute façon le
			// statut DB (posé par le webhook), mais cette page reste auto-suffisante.
			if (pi.status === "succeeded") {
				redirectUrl = `/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}`;
			} else if (redirectStatus === "failed" || pi.status === "canceled") {
				// Échec explicite testé AVANT le bucket « en attente » : un 3DS échoué
				// peut laisser le PI en `requires_action` tout en renvoyant
				// `redirect_status=failed` — on route alors vers l'annulation plutôt que
				// d'afficher une attente trompeuse (`pending=true`). Un paiement
				// asynchrone légitime (`processing`) ne renvoie jamais `failed`.
				redirectUrl = `/paiement/annulation?order_id=${orderId}${cancelSuffix}&reason=payment_failed`;
			} else if (pi.status === "processing" || pi.status === "requires_action") {
				// CARDONLY-01 : en card-only, `processing`/`requires_action` provient d'une
				// carte 3DS qui transite (settlement bancaire en cours), PAS d'un moyen
				// asynchrone (SEPA/Klarna sont exclus de payment_method_types). On route vers
				// un écran d'attente (le webhook finalisera). Toute réintroduction d'un moyen
				// asynchrone nécessite une décision produit + ajout dans payment_method_types.
				redirectUrl = `/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}&pending=true`;
			} else {
				redirectUrl = `/paiement/annulation?order_id=${orderId}${cancelSuffix}&reason=processing_error`;
			}
		} catch {
			redirectUrl = `/paiement/annulation?order_id=${orderId}&reason=processing_error`;
		}

		redirect(redirectUrl);
	}

	// Aucun `payment_intent` valide dans l'URL de retour → rien à vérifier.
	redirect("/");
}
