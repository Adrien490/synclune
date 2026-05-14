import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import { stripe } from "@/shared/lib/stripe";
import { prisma } from "@/shared/lib/prisma";

const searchParamsSchema = z.object({
	session_id: z.string().min(1),
});

/**
 * Cherche l'Order créée par le webhook `checkout.session.completed`.
 * Le webhook fire en parallèle de la redirection Stripe → race possible où
 * l'utilisateur arrive ici AVANT que le webhook n'ait commit l'Order.
 * On retry 3× espacés de 500 ms (1,5 s max) avant de fallback `pending=true`.
 */
async function findOrderWithRetry(
	sessionId: string,
	attempts = 3,
	delayMs = 500,
): Promise<{ id: string; orderNumber: string } | null> {
	for (let i = 0; i < attempts; i++) {
		const order = await prisma.order.findUnique({
			where: { stripeCheckoutSessionId: sessionId },
			select: { id: true, orderNumber: true },
		});
		if (order) return order;
		if (i < attempts - 1) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
	return null;
}

export const metadata: Metadata = {
	title: "Vérification du paiement | Synclune",
	robots: {
		index: false,
		follow: false,
	},
};

interface CheckoutReturnPageProps {
	searchParams: Promise<{ session_id?: string }>;
}

/**
 * Page de retour Stripe Checkout (mode embedded).
 *
 * Stripe redirige ici après le paiement via `return_url=…/paiement/retour?session_id={CHECKOUT_SESSION_ID}`.
 * On rapatrie la Session, on lit son `payment_status`, et on redirige selon
 * l'état réel (paid → confirmation, unpaid pour async SEPA → "en cours", expired/no_payment → annulation).
 */
export default async function CheckoutReturnPage({ searchParams }: CheckoutReturnPageProps) {
	const params = await searchParams;
	const validation = searchParamsSchema.safeParse(params);
	if (!validation.success) {
		redirect("/");
	}

	const { session_id: sessionId } = validation.data;

	let redirectUrl = "/paiement/annulation?reason=processing_error";

	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId);

		if (session.payment_status === "paid") {
			// Le webhook crée l'Order de manière asynchrone. On poll brièvement avant
			// de tomber sur le fallback pending=true (qui redirigerait sans order_id).
			const order = await findOrderWithRetry(sessionId);
			redirectUrl = order
				? `/paiement/confirmation?order_id=${order.id}&order_number=${order.orderNumber}`
				: `/paiement/confirmation?session_id=${sessionId}&pending=true`;
		} else if (session.payment_status === "unpaid" && session.status === "complete") {
			// Paiement asynchrone en attente de confirmation (SEPA Direct Debit, virement).
			redirectUrl = `/paiement/confirmation?session_id=${sessionId}&pending=true`;
		} else if (session.status === "open") {
			redirectUrl = `/paiement?retry=true`;
		} else if (session.status === "expired") {
			redirectUrl = `/paiement/annulation?reason=expired`;
		} else {
			redirectUrl = `/paiement/annulation?reason=processing_error`;
		}
	} catch {
		redirectUrl = `/paiement/annulation?reason=processing_error`;
	}

	redirect(redirectUrl);
}
