"use client";

import { useState } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Lock } from "lucide-react";
import { formatEuro } from "@/shared/utils/format-euro";
import { confirmCheckout } from "../actions/confirm-checkout";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";

interface PayButtonProps {
	total: number;
	disabled: boolean;
	shippingUnavailable: boolean;
	getFormData: () => Promise<ConfirmCheckoutData | null>;
}

/**
 * Payment button inside <Elements>.
 * Orchestrates: validate form → confirmCheckout server action → stripe.confirmPayment.
 */
export function PayButton({ total, disabled, shippingUnavailable, getFormData }: PayButtonProps) {
	const stripe = useStripe();
	const elements = useElements();
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleClick() {
		if (!stripe || !elements) return;

		setIsProcessing(true);
		setError(null);

		try {
			// 1. Get form data from parent (may validate unapplied discount code)
			const formData = await getFormData();
			if (!formData) {
				setIsProcessing(false);
				return;
			}

			// 2. Submit Elements to Stripe first (validates payment details)
			const { error: submitError } = await elements.submit();
			if (submitError) {
				setError(submitError.message ?? "Erreur de validation du paiement.");
				setIsProcessing(false);
				return;
			}

			// 3. Server action: create order + update PI with order metadata
			const result = await confirmCheckout(formData);
			if (!result.success) {
				setError(result.error);
				setIsProcessing(false);
				return;
			}

			// 4. Confirm payment with Stripe (triggers 3DS if needed)
			const { error: confirmError } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/paiement/retour?order_id=${result.orderId}`,
				},
			});

			// If confirmPayment returns, it means there was an error
			// (successful payments redirect to return_url)

			setError(
				confirmError.type === "card_error" || confirmError.type === "validation_error"
					? (confirmError.message ?? "Erreur de paiement.")
					: "Une erreur est survenue lors du paiement.",
			);
		} catch {
			setError("Une erreur inattendue est survenue. Veuillez réessayer.");
		} finally {
			setIsProcessing(false);
		}
	}

	return (
		<div className="space-y-3">
			{error && (
				<Alert variant="destructive" role="alert" aria-live="assertive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Button
				type="button"
				size="lg"
				className="w-full text-base shadow-md transition-shadow hover:shadow-lg"
				disabled={disabled || !stripe || !elements || isProcessing || shippingUnavailable}
				aria-busy={isProcessing}
				onClick={handleClick}
			>
				{isProcessing ? (
					<>
						<Loader2 className="size-4 animate-spin" aria-hidden="true" />
						<span>Traitement...</span>
					</>
				) : (
					<>
						<Lock className="size-4" aria-hidden="true" />
						<span>Payer {formatEuro(total)}</span>
					</>
				)}
			</Button>

			{shippingUnavailable ? (
				<p className="text-destructive text-center text-sm" role="alert">
					Nous ne livrons pas encore dans cette zone. Contactez-nous pour trouver une solution.
				</p>
			) : disabled && !isProcessing ? (
				<p className="text-muted-foreground text-center text-sm">
					Veuillez remplir tous les champs obligatoires pour continuer.
				</p>
			) : null}
		</div>
	);
}
