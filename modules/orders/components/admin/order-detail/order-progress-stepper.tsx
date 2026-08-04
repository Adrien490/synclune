"use client";

import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/browser";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/utils/cn";
import {
	CheckCircleIcon,
	ClockIcon,
	PackageIcon,
	TruckIcon,
	XCircleIcon,
} from "@phosphor-icons/react/ssr";

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
	icon: typeof ClockIcon;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STEPS: Step[] = [
	{ key: OrderStatus.PENDING, label: "En attente", icon: ClockIcon },
	{ key: OrderStatus.PROCESSING, label: "Préparation", icon: PackageIcon },
	{ key: OrderStatus.SHIPPED, label: "Expédiée", icon: TruckIcon },
	{ key: OrderStatus.DELIVERED, label: "Livrée", icon: CheckCircleIcon },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
	[OrderStatus.PENDING]: 0,
	[OrderStatus.PROCESSING]: 1,
	[OrderStatus.SHIPPED]: 2,
	[OrderStatus.DELIVERED]: 3,
	// Hors du parcours nominal, comme CANCELLED : le stepper décrit l'acheminement
	// (attente → préparation → expédition → livraison). Un retour survient APRÈS
	// livraison et n'est pas une 5ᵉ étape — il est signalé par `OrderAlerts`.
	[OrderStatus.RETURNED]: -1,
	[OrderStatus.CANCELLED]: -1,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function OrderProgressStepper({ status, paymentStatus }: OrderProgressStepperProps) {
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
						const isWaitingPayment = step.key === OrderStatus.PENDING && isUnpaid && isCurrent;

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
											isCompleted || isCurrent ? "bg-primary" : "bg-border",
										)}
										aria-hidden="true"
									/>
								)}

								{/* Étape */}
								<div className="flex flex-col items-center gap-2">
									<div
										className={cn(
											"relative flex size-10 items-center justify-center rounded-full border-2 transition-all",
											isCompleted && "border-primary bg-primary text-primary-foreground",
											isCurrent && !isWaitingPayment && "border-primary bg-primary/10 text-primary",
											isWaitingPayment && "border-warning bg-warning/10 text-warning",
											isPending && "border-muted-foreground/30 bg-muted text-muted-foreground",
											isCurrent && "ring-primary/20 ring-4",
										)}
									>
										<Icon className="size-5" aria-hidden="true" />
										{isCurrent && (
											<span
												className="bg-primary/30 absolute inset-0 rounded-full motion-safe:animate-ping"
												aria-hidden="true"
											/>
										)}
									</div>
									<span
										className={cn(
											"hidden text-xs font-medium transition-colors min-[400px]:block",
											isCompleted && "text-primary",
											isCurrent && "text-foreground",
											isPending && "text-muted-foreground",
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
											isCompleted ? "bg-primary" : "bg-border",
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
						<XCircleIcon className="size-3.5" aria-hidden="true" />
						Commande annulée
					</Badge>
				</div>
			)}
		</div>
	);
}
