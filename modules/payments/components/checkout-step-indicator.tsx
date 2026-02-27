"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/utils/cn";

interface CheckoutStepIndicatorProps {
	currentStep: 1 | 2;
}

export function CheckoutStepIndicator({ currentStep }: CheckoutStepIndicatorProps) {
	return (
		<nav aria-label="Progression de la commande" className="mx-auto mb-6 w-full max-w-xs sm:mb-8">
			<ol className="flex w-full items-center">
				{/* Step 1 */}
				<li
					className="flex flex-col items-center gap-1.5"
					aria-current={currentStep === 1 ? "step" : undefined}
				>
					<div
						className={cn(
							"flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
							"bg-primary text-primary-foreground",
						)}
					>
						{currentStep > 1 ? (
							<Check className="h-4 w-4" aria-hidden="true" />
						) : (
							<span aria-hidden="true">1</span>
						)}
						<span className="sr-only">
							Étape 1{currentStep > 1 ? " (complétée)" : " (en cours)"}
						</span>
					</div>
					<span className="text-muted-foreground text-xs" aria-hidden="true">
						Livraison
					</span>
				</li>

				{/* Connecting line */}
				<li className="mx-3 mt-4 flex-1 self-start" role="presentation" aria-hidden="true">
					<div className="bg-muted relative h-0.5 overflow-hidden">
						<div
							className={cn(
								"bg-primary absolute inset-y-0 left-0 transition-all duration-300",
								currentStep >= 2 ? "w-full" : "w-0",
							)}
						/>
					</div>
				</li>

				{/* Step 2 */}
				<li
					className="flex flex-col items-center gap-1.5"
					aria-current={currentStep === 2 ? "step" : undefined}
				>
					<div
						className={cn(
							"flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
							currentStep >= 2
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground",
						)}
					>
						<span aria-hidden="true">2</span>
						<span className="sr-only">
							Étape 2{currentStep >= 2 ? " (en cours)" : " (à venir)"}
						</span>
					</div>
					<span className="text-muted-foreground text-xs" aria-hidden="true">
						Paiement
					</span>
				</li>
			</ol>
		</nav>
	);
}
