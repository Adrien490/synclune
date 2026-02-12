"use client"

import { Check } from "lucide-react"
import { cn } from "@/shared/utils/cn"

interface CheckoutStepIndicatorProps {
	currentStep: 1 | 2
}

export function CheckoutStepIndicator({ currentStep }: CheckoutStepIndicatorProps) {
	return (
		<div className="flex items-center w-full max-w-xs mx-auto mb-6 sm:mb-8"
			role="group" aria-label="Progression de la commande">
			{/* Step 1 */}
			<div className="flex flex-col items-center gap-1.5">
				<div className={cn(
					"flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
					"bg-primary text-primary-foreground"
				)} aria-current={currentStep === 1 ? "step" : undefined}>
					{currentStep > 1 ? <Check className="w-4 h-4" /> : "1"}
				</div>
				<span className="text-xs text-muted-foreground">Livraison</span>
			</div>

			{/* Connecting line */}
			<div className="flex-1 h-0.5 bg-muted mx-3 relative overflow-hidden self-start mt-4">
				<div className={cn(
					"absolute inset-y-0 left-0 bg-primary transition-all duration-300",
					currentStep >= 2 ? "w-full" : "w-0"
				)} />
			</div>

			{/* Step 2 */}
			<div className="flex flex-col items-center gap-1.5">
				<div className={cn(
					"flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors",
					currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
				)} aria-current={currentStep === 2 ? "step" : undefined}>
					2
				</div>
				<span className="text-xs text-muted-foreground">Paiement</span>
			</div>
		</div>
	)
}
