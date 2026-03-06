"use client";

import dynamic from "next/dynamic";
import { Lock } from "lucide-react";
import { m } from "motion/react";
import { VisaIcon, MastercardIcon, CBIcon } from "@/shared/components/icons/payment-icons";
import { StripeWordmark } from "./stripe-wordmark";
import { AddressSummary, type SubmittedAddress } from "./address-summary";
import { CheckoutStepIndicator } from "./checkout-step-indicator";
import { ErrorBoundary } from "@/shared/components/error-boundary";

const EmbeddedCheckoutWrapper = dynamic(
	() => import("./embedded-checkout").then((mod) => mod.EmbeddedCheckoutWrapper),
	{
		loading: () => (
			<div className="animate-pulse space-y-6 p-6">
				<div className="space-y-2">
					<div className="bg-muted h-4 w-24 rounded" />
					<div className="bg-muted h-10 w-full rounded" />
				</div>
				<div className="space-y-2">
					<div className="bg-muted h-4 w-40 rounded" />
					<div className="bg-muted h-10 w-full rounded" />
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<div className="bg-muted h-4 w-20 rounded" />
						<div className="bg-muted h-10 w-full rounded" />
					</div>
					<div className="space-y-2">
						<div className="bg-muted h-4 w-12 rounded" />
						<div className="bg-muted h-10 w-full rounded" />
					</div>
				</div>
				<div className="bg-muted h-12 w-full rounded" />
			</div>
		),
	},
);

interface PaymentStepProps {
	submittedAddress: SubmittedAddress;
	onEdit: () => void;
	clientSecret: string;
	orderNumber: string | null;
	fadeSlide: Record<string, unknown>;
}

export function PaymentStep({
	submittedAddress,
	onEdit,
	clientSecret,
	orderNumber,
	fadeSlide,
}: PaymentStepProps) {
	return (
		<m.div key="payment" className="space-y-6" {...fadeSlide}>
			<CheckoutStepIndicator currentStep={2} />

			<AddressSummary address={submittedAddress} onEdit={onEdit} />

			<h2 className="font-display text-lg font-medium tracking-wide sm:text-xl">
				Paiement sécurisé
			</h2>

			<div className="bg-card border-primary/10 overflow-hidden rounded-2xl border shadow-sm">
				<ErrorBoundary
					errorMessage="Impossible de charger le formulaire de paiement"
					className="bg-muted/50 rounded-lg border p-8"
				>
					<EmbeddedCheckoutWrapper clientSecret={clientSecret} />
				</ErrorBoundary>
			</div>

			<div className="border-primary/5 bg-primary/2 rounded-xl border p-4">
				<div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
					<span className="inline-flex items-center gap-1">
						<Lock className="h-3 w-3" />
						Paiement sécurisé
					</span>
					<span aria-hidden="true" className="text-border hidden sm:inline">
						|
					</span>
					<span className="inline-flex items-center gap-1.5">
						<VisaIcon className="h-4 w-auto" />
						<MastercardIcon className="h-4 w-auto" />
						<CBIcon className="h-4 w-auto" />
					</span>
					<span aria-hidden="true" className="text-border hidden sm:inline">
						|
					</span>
					<span className="inline-flex items-center gap-1">
						Propulsé par <StripeWordmark className="h-4 w-auto opacity-50" />
					</span>
				</div>
			</div>

			{orderNumber && (
				<p className="text-muted-foreground text-center text-xs">Commande n°{orderNumber}</p>
			)}
		</m.div>
	);
}
