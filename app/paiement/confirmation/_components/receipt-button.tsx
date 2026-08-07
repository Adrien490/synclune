import { Button } from "@/shared/components/ui/button";
import { stripe } from "@/shared/lib/stripe";
import { ArrowSquareOutIcon, ReceiptIcon } from "@phosphor-icons/react/ssr";
import type Stripe from "stripe";

interface ReceiptButtonProps {
	stripePaymentIntentId: string;
}

function extractReceiptUrl(charge: Stripe.PaymentIntent["latest_charge"]): string | null {
	if (charge && typeof charge !== "string") {
		return charge.receipt_url ?? null;
	}
	return null;
}

/**
 * Async server component rendering the Stripe receipt download button.
 *
 * Isolated in Suspense so the upstream paymentIntents.retrieve (~100-300ms)
 * doesn't block the confirmation page TTFB. Returns null on any Stripe failure —
 * the receipt link is non-critical (Stripe also sends it by email).
 */
export async function ReceiptButton({ stripePaymentIntentId }: ReceiptButtonProps) {
	let receiptUrl: string | null = null;
	try {
		const pi = await stripe.paymentIntents.retrieve(stripePaymentIntentId, {
			expand: ["latest_charge"],
		});
		receiptUrl = extractReceiptUrl(pi.latest_charge);
	} catch {
		return null;
	}

	if (!receiptUrl) return null;

	return (
		<div className="flex justify-center pt-2">
			<Button
				render={
					// eslint-disable-next-line jsx-a11y/anchor-has-content -- prop `render` Base UI : le contenu accessible est porté par les enfants du Button
					<a href={receiptUrl} target="_blank" rel="noopener noreferrer" />
				}
				variant="outline"
				size="sm"
			>
				<ReceiptIcon className="size-4" aria-hidden="true" />
				Télécharger mon reçu
				<ArrowSquareOutIcon className="size-3" aria-hidden="true" />
				<span className="sr-only">(ouvre dans un nouvel onglet)</span>
			</Button>
		</div>
	);
}
