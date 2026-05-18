"use client";

import { useEffect, useRef, useState } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { formatEuro } from "@/shared/utils/format-euro";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useCheckoutSubmit } from "../hooks/use-checkout-submit";
import type { ConfirmCheckoutData } from "../schemas/checkout.schema";

interface PayButtonProps {
	total: number;
	disabled: boolean;
	shippingUnavailable: boolean;
	isOnline: boolean;
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
	isOnline,
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
	const errorRef = useRef<HTMLDivElement>(null);

	const submit = useCheckoutSubmit({
		getFormData,
		allowNavigation,
		onPhase: setPhase,
	});

	// Bring error into view on mobile where the sticky CTA may otherwise hide it.
	useEffect(() => {
		if (error && errorRef.current) {
			errorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
			errorRef.current.focus({ preventScroll: true });
		}
	}, [error]);

	const isProcessing = phase !== "idle";
	const isAwaiting3ds = phase === "awaiting-3ds";

	function showError(message: string) {
		setError(message);
		haptic("error");
	}

	async function handleClick() {
		if (!stripe || !elements) return;

		haptic("medium");
		setError(null);

		try {
			const result = await submit({
				returnUrlSuffix: "",
				paymentMethodData: {
					billing_details: {
						...(billingName && { name: billingName }),
						...(email && { email }),
					},
				},
			});

			switch (result.status) {
				case "form-invalid":
				case "submit-error":
				case "checkout-error":
				case "stripe-error":
					if (result.status !== "form-invalid") showError(result.message);
					setPhase("idle");
					return;
				case "redirecting":
					// Successful path — Stripe will redirect the page, nothing else to do.
					return;
			}
		} catch {
			showError("Une erreur inattendue est survenue. Réessaye.");
			setPhase("idle");
		}
	}

	const phaseMessage =
		phase === "validating"
			? "Validation…"
			: phase === "creating-order"
				? "Création de la commande…"
				: phase === "awaiting-3ds"
					? "Vérification 3D Secure…"
					: "";

	return (
		<div className="border-primary/10 bg-background/95 fixed inset-x-0 bottom-0 z-30 space-y-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_-8px_rgb(0_0_0_/_0.08)] backdrop-blur-md md:static md:space-y-3 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
			{isAwaiting3ds && (
				<Alert role="status" aria-live="polite">
					<ShieldCheck className="size-4" />
					<AlertDescription>
						Vérification 3D Secure en cours, une fenêtre de ta banque va s&apos;ouvrir.
					</AlertDescription>
				</Alert>
			)}

			{error && (
				<Alert
					ref={errorRef}
					tabIndex={-1}
					variant="destructive"
					role="alert"
					aria-live="assertive"
					className="focus-visible:outline-none"
				>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Button
				type="button"
				size="lg"
				className="min-h-11 w-full touch-manipulation text-base shadow-md hover:shadow-lg motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 motion-safe:active:scale-[0.98]"
				disabled={
					disabled || !stripe || !elements || isProcessing || shippingUnavailable || !isOnline
				}
				aria-busy={isProcessing}
				onClick={handleClick}
				style={{ viewTransitionName: "checkout-pay-cta" }}
			>
				{isProcessing ? (
					<>
						<LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden="true" />
						<span>{phaseMessage || "Traitement…"}</span>
					</>
				) : (
					<>
						<Lock className="size-4" aria-hidden="true" />
						<span>Commander et payer {formatEuro(total)}</span>
					</>
				)}
			</Button>

			{!isOnline ? (
				<p className="text-destructive text-center text-sm" role="alert">
					Vérifie ta connexion internet pour continuer.
				</p>
			) : shippingUnavailable ? (
				<p className="text-destructive text-center text-sm" role="alert">
					Cette zone n&apos;est pas livrable.
				</p>
			) : disabled && !isProcessing ? (
				<p className="text-muted-foreground text-center text-xs md:text-sm">
					Remplis tous les champs obligatoires pour continuer.
				</p>
			) : null}
		</div>
	);
}
