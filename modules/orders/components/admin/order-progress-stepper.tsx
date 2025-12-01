"use client";

import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/browser";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import { Clock, Package, Truck, CheckCircle, XCircle } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface OrderProgressStepperProps {
	status: OrderStatus;
	paymentStatus: PaymentStatus;
}

interface Step {
	key: OrderStatus;
	label: string;
	icon: typeof Clock;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: Step[] = [
	{ key: OrderStatus.PENDING, label: "En attente", icon: Clock },
	{ key: OrderStatus.PROCESSING, label: "Préparation", icon: Package },
	{ key: OrderStatus.SHIPPED, label: "Expédiée", icon: Truck },
	{ key: OrderStatus.DELIVERED, label: "Livrée", icon: CheckCircle },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
	[OrderStatus.PENDING]: 0,
	[OrderStatus.PROCESSING]: 1,
	[OrderStatus.SHIPPED]: 2,
	[OrderStatus.DELIVERED]: 3,
	[OrderStatus.CANCELLED]: -1,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderProgressStepper({
	status,
	paymentStatus,
}: OrderProgressStepperProps) {
	const isCancelled = status === OrderStatus.CANCELLED;
	const currentStepIndex = STATUS_ORDER[status];
	const isUnpaid = paymentStatus === PaymentStatus.PENDING;

	return (
		<div className="w-full">
			{/* Stepper horizontal */}
			<nav aria-label="Progression de la commande">
				<ol className="flex items-center justify-between">
					{STEPS.map((step, index) => {
						const Icon = step.icon;
						const isCompleted = !isCancelled && currentStepIndex > index;
						const isCurrent = !isCancelled && currentStepIndex === index;
						const isPending = isCancelled || currentStepIndex < index;

						// État spécial : En attente + non payé
						const isWaitingPayment =
							step.key === OrderStatus.PENDING && isUnpaid && isCurrent;

						return (
							<li
								key={step.key}
								className="flex flex-1 items-center"
								aria-current={isCurrent ? "step" : undefined}
							>
								{/* Ligne de connexion (avant) */}
								{index > 0 && (
									<div
										className={cn(
											"h-0.5 flex-1 transition-colors",
											isCompleted || isCurrent
												? "bg-primary"
												: "bg-border"
										)}
										aria-hidden="true"
									/>
								)}

								{/* Étape */}
								<div className="flex flex-col items-center gap-2">
									<div
										className={cn(
											"relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
											isCompleted && "border-primary bg-primary text-primary-foreground",
											isCurrent && !isWaitingPayment && "border-primary bg-primary/10 text-primary",
											isWaitingPayment && "border-amber-500 bg-amber-500/10 text-amber-600",
											isPending && "border-muted-foreground/30 bg-muted text-muted-foreground",
											isCurrent && "ring-4 ring-primary/20"
										)}
									>
										<Icon className="h-5 w-5" aria-hidden="true" />
										{isCurrent && !isCancelled && (
											<span
												className="absolute inset-0 animate-ping rounded-full bg-primary/30"
												aria-hidden="true"
											/>
										)}
									</div>
									<span
										className={cn(
											"text-xs font-medium transition-colors",
											isCompleted && "text-primary",
											isCurrent && "text-foreground",
											isPending && "text-muted-foreground"
										)}
									>
										{step.label}
									</span>
								</div>

								{/* Ligne de connexion (après) */}
								{index < STEPS.length - 1 && (
									<div
										className={cn(
											"h-0.5 flex-1 transition-colors",
											isCompleted ? "bg-primary" : "bg-border"
										)}
										aria-hidden="true"
									/>
								)}
							</li>
						);
					})}
				</ol>
			</nav>

			{/* Badge annulée si applicable */}
			{isCancelled && (
				<div className="mt-4 flex justify-center">
					<Badge variant="destructive" className="gap-1">
						<XCircle className="h-3.5 w-3.5" aria-hidden="true" />
						Commande annulée
					</Badge>
				</div>
			)}
		</div>
	);
}
