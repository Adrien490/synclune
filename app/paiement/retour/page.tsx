import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { stripe } from "@/shared/lib/stripe";

const STRIPE_RETRIEVE_TIMEOUT_MS = 5_000;

const piSearchParamsSchema = z.object({
	payment_intent: z.string().min(1),
	redirect_status: z.string().min(1),
	order_id: z.string().cuid(),
});

const sessionSearchParamsSchema = z.object({
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
		payment_intent?: string;
		redirect_status?: string;
		session_id?: string;
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
 * Payment return page — handles both PI flow and legacy Checkout Session flow.
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

			if (redirectStatus === "succeeded" || pi.status === "succeeded") {
				redirectUrl = `/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}`;
			} else if (pi.status === "processing" || pi.status === "requires_action") {
				// Async payment in progress (SEPA, Klarna, etc.)
				redirectUrl = `/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}&pending=true`;
			} else if (redirectStatus === "failed" || pi.status === "canceled") {
				redirectUrl = `/paiement/annulation?order_id=${orderId}${cancelSuffix}&reason=payment_failed`;
			} else {
				redirectUrl = `/paiement/annulation?order_id=${orderId}${cancelSuffix}&reason=processing_error`;
			}
		} catch {
			redirectUrl = `/paiement/annulation?order_id=${orderId}&reason=processing_error`;
		}

		redirect(redirectUrl);
	}

	// === Legacy Checkout Session flow (encore utilisé par modules/webhooks/services/checkout.service.ts) ===
	const sessionValidation = sessionSearchParamsSchema.safeParse(params);
	if (!sessionValidation.success) {
		redirect("/");
	}

	const { session_id: sessionId, order_id: orderId } = sessionValidation.data;

	let redirectUrl: string;

	try {
		const session = await withStripeDeadline(
			stripe.checkout.sessions.retrieve(sessionId),
			STRIPE_RETRIEVE_TIMEOUT_MS,
		);
		const orderNumber = session.metadata?.orderNumber;
		const cancelSuffix = orderNumber ? `&order_number=${orderNumber}` : "";

		if (session.payment_status === "paid") {
			redirectUrl = `/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}`;
		} else if (session.status === "open") {
			redirectUrl = `/paiement?retry=true&order_id=${orderId}`;
		} else if (session.payment_status === "unpaid" && session.status === "complete") {
			redirectUrl = `/paiement/confirmation?order_id=${orderId}&order_number=${orderNumber}&pending=true`;
		} else if (session.status === "expired") {
			redirectUrl = `/paiement/annulation?order_id=${orderId}${cancelSuffix}&reason=expired`;
		} else {
			redirectUrl = `/paiement/annulation?order_id=${orderId}${cancelSuffix}&reason=processing_error`;
		}
	} catch {
		redirectUrl = `/paiement/annulation?order_id=${orderId}&reason=processing_error`;
	}

	redirect(redirectUrl);
}
