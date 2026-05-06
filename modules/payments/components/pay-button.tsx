"use client";

import { useState } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { formatEuro } from "@/shared/utils/format-euro";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { confirmCheckout } from "../actions/confirm-checkout";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";

interface PayButtonProps {
	total: number;
	disabled: boolean;
	shippingUnavailable: boolean;
	email?: string;
	billingName?: string;
	getFormData: () => Promise<ConfirmCheckoutData | null>;
	/** Called just before the Stripe redirect so beforeunload doesn't fire. */
	allowNavigation?: () => void;
}

type Phase = "idle" | "validating" | "creating-order" | "awaiting-3ds";

/**
 * Payment button inside <Elements>.
 * Orchestrates: validate form -> confirmCheckout server action -> stripe.confirmPayment.
 *
 * Phases surface distinct messages so users understand latency (esp. 3DS challenge).
 */
export function PayButton({
	total,
	disabled,
	shippingUnavailable,
	email,
	billingName,
	getFormData,
	allowNavigation,
}: PayButtonProps) {
	const stripe = useStripe();
	const elements = useElements();
	const haptic = useHaptic();
	const [phase, setPhase] = useState<Phase>("idle");
	const [error, setError] = useState<string | null>(null);

	const isProcessing = phase !== "idle";
	const isAwaiting3ds = phase === "awaiting-3ds";

	function showError(message: string) {
		setError(message);
		haptic("error");
	}

	async function handleClick() {
		if (!stripe || !elements) return;

		haptic("medium");
		setPhase("validating");
		setError(null);

		try {
			// 1. Get form data from parent (may validate unapplied discount code)
			const formData = await getFormData();
			if (!formData) {
				setPhase("idle");
				return;
			}

			// 2. Submit Elements to Stripe first (validates payment details)
			const { error: submitError } = await elements.submit();
			if (submitError) {
				showError(submitError.message ?? "Erreur de validation du paiement.");
				setPhase("idle");
				return;
			}

			setPhase("creating-order");

			// 3. Server action: create order + update PI with order metadata
			const result = await confirmCheckout(formData);
			if (!result.success) {
				showError(result.error);
				setPhase("idle");
				return;
			}

			setPhase("awaiting-3ds");

			// Disable beforeunload guard before Stripe takes over the page (3DS / redirect).
			allowNavigation?.();

			// 4. Confirm payment with Stripe (triggers 3DS if needed)
			const { error: confirmError } = await stripe.confirmPayment({
				elements,
				confirmParams: {
					return_url: `${window.location.origin}/paiement/retour?order_id=${result.orderId}`,
					payment_method_data: {
						billing_details: {
							...(billingName && { name: billingName }),
							...(email && { email }),
						},
					},
				},
			});

			// If confirmPayment returns, it means there was an error
			// (successful payments redirect to return_url)
			const userMessage =
				confirmError.type === "card_error" || confirmError.type === "validation_error"
					? (confirmError.message ?? "Erreur de paiement.")
					: "Une erreur est survenue lors du paiement.";
			showError(userMessage);
		} catch {
			showError("Une erreur inattendue est survenue. Veuillez réessayer.");
		} finally {
			setPhase((prev) => (prev === "awaiting-3ds" || prev === "creating-order" ? "idle" : prev));
		}
	}

	const phaseMessage =
		phase === "validating"
			? "Validation..."
			: phase === "creating-order"
				? "Création de la commande..."
				: phase === "awaiting-3ds"
					? "Vérification 3D Secure..."
					: "";

	return (
		<div className="border-primary/10 bg-background/95 fixed inset-x-0 bottom-0 z-30 space-y-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgb(0_0_0_/_0.08)] backdrop-blur-md md:static md:space-y-3 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
			<span role="status" aria-live="polite" className="sr-only">
				{phaseMessage}
			</span>

			{isAwaiting3ds && (
				<Alert role="status" aria-live="polite">
					<ShieldCheck className="size-4" />
					<AlertDescription>
						Vérification 3D Secure en cours — une fenêtre de votre banque va s&apos;ouvrir.
					</AlertDescription>
				</Alert>
			)}

			{error && (
				<Alert variant="destructive" role="alert" aria-live="assertive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Button
				type="button"
				size="lg"
				className="min-h-11 w-full text-base shadow-md transition-shadow hover:shadow-lg"
				disabled={disabled || !stripe || !elements || isProcessing || shippingUnavailable}
				aria-busy={isProcessing}
				onClick={handleClick}
				style={{ viewTransitionName: "checkout-pay-cta" }}
			>
				{isProcessing ? (
					<>
						<LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						<span>{phaseMessage || "Traitement..."}</span>
					</>
				) : (
					<>
						<Lock className="size-4" aria-hidden="true" />
						<span>Commander et payer {formatEuro(total)}</span>
					</>
				)}
			</Button>

			{shippingUnavailable ? (
				<p className="text-destructive text-center text-sm" role="alert">
					Cette zone n&apos;est pas livrable.
				</p>
			) : disabled && !isProcessing ? (
				<p className="text-muted-foreground text-center text-xs md:text-sm">
					Veuillez remplir tous les champs obligatoires pour continuer.
				</p>
			) : null}
		</div>
	);
}
