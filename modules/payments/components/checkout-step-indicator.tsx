"use client";

import { Check, CreditCard, MapPin } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { cn } from "@/shared/utils/cn";

interface CheckoutStepIndicatorProps {
	currentStep: 1 | 2;
}

export function CheckoutStepIndicator({ currentStep }: CheckoutStepIndicatorProps) {
	const shouldReduceMotion = useReducedMotion();

	return (
		<nav aria-label="Progression de la commande" className="mx-auto mb-6 w-full max-w-sm sm:mb-8">
			<ol className="flex w-full items-center">
				{/* Step 1 */}
				<li
					className="flex items-center gap-2"
					aria-current={currentStep === 1 ? "step" : undefined}
				>
					<m.div
						className={cn(
							"flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-colors",
							"bg-primary text-primary-foreground",
						)}
						{...(shouldReduceMotion
							? {}
							: {
									initial: { scale: 0.8 },
									animate: { scale: 1 },
									transition: MOTION_CONFIG.spring.gentle,
								})}
					>
						{currentStep > 1 ? (
							<Check className="h-4 w-4" aria-hidden="true" />
						) : (
							<MapPin className="h-4 w-4" aria-hidden="true" />
						)}
						<span className="sr-only">
							Étape 1{currentStep > 1 ? " (complétée)" : " (en cours)"}
						</span>
					</m.div>
					<span
						className={cn(
							"text-sm font-medium",
							currentStep === 1 ? "text-foreground" : "text-muted-foreground",
						)}
						aria-hidden="true"
					>
						Livraison
					</span>
				</li>

				{/* Connecting line */}
				<li className="mx-3 flex-1" role="presentation" aria-hidden="true">
					<div className="bg-muted relative h-0.5 overflow-hidden rounded-full">
						<m.div
							className="bg-primary absolute inset-y-0 left-0"
							{...(shouldReduceMotion
								? { style: { width: currentStep >= 2 ? "100%" : "0%" } }
								: {
										initial: { width: "0%" },
										animate: { width: currentStep >= 2 ? "100%" : "0%" },
										transition: {
											duration: MOTION_CONFIG.duration.medium,
											ease: MOTION_CONFIG.easing.easeOut,
										},
									})}
						/>
					</div>
				</li>

				{/* Step 2 */}
				<li
					className="flex items-center gap-2"
					aria-current={currentStep === 2 ? "step" : undefined}
				>
					<m.div
						className={cn(
							"flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-colors",
							currentStep >= 2
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground",
						)}
						{...(shouldReduceMotion
							? {}
							: currentStep >= 2
								? {
										initial: { scale: 0.8 },
										animate: { scale: 1 },
										transition: MOTION_CONFIG.spring.gentle,
									}
								: {})}
					>
						<CreditCard className="h-4 w-4" aria-hidden="true" />
						<span className="sr-only">
							Étape 2{currentStep >= 2 ? " (en cours)" : " (à venir)"}
						</span>
					</m.div>
					<span
						className={cn(
							"text-sm font-medium",
							currentStep >= 2 ? "text-foreground" : "text-muted-foreground",
						)}
						aria-hidden="true"
					>
						Paiement
					</span>
				</li>
			</ol>
		</nav>
	);
}
