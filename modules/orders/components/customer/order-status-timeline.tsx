import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { Badge } from "@/shared/components/ui/badge";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	CheckCircle2,
	Clock,
	CreditCard,
	Package,
	Truck,
	XCircle,
} from "lucide-react";

interface OrderStatusTimelineProps {
	order: {
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus: FulfillmentStatus;
		createdAt: Date;
		paidAt: Date | null;
		shippedAt: Date | null;
		actualDelivery: Date | null;
	};
}

export function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
	const steps = [
		{
			label: "Commande passée",
			date: order.createdAt,
			icon: Clock,
			completed: true,
		},
		{
			label: "Paiement reçu",
			date: order.paidAt,
			icon: CreditCard,
			completed: order.paymentStatus === "PAID",
			failed: order.paymentStatus === "FAILED" || order.paymentStatus === "EXPIRED",
		},
		{
			label: "En préparation",
			date: order.paidAt,
			icon: Package,
			completed:
				order.fulfillmentStatus === "PROCESSING" ||
				order.fulfillmentStatus === "SHIPPED" ||
				order.fulfillmentStatus === "DELIVERED",
			active: order.fulfillmentStatus === "PROCESSING",
		},
		{
			label: "Expédiée",
			date: order.shippedAt,
			icon: Truck,
			completed:
				order.fulfillmentStatus === "SHIPPED" ||
				order.fulfillmentStatus === "DELIVERED",
		},
		{
			label: "Livrée",
			date: order.actualDelivery,
			icon: CheckCircle2,
			completed: order.fulfillmentStatus === "DELIVERED",
		},
	];

	const isCancelled = order.status === "CANCELLED";

	return (
		<section className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-base font-semibold flex items-center gap-2">
					<Clock className="size-4 text-muted-foreground" />
					Suivi de commande
				</h2>
				<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
					{ORDER_STATUS_LABELS[order.status]}
				</Badge>
			</div>
			<div className="border-t border-border/60 pt-4">
				{isCancelled ? (
					<div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
						<XCircle className="h-6 w-6 text-destructive" />
						<div>
							<p className="font-medium text-destructive">Commande annulée</p>
							<p className="text-sm text-muted-foreground">
								Cette commande a été annulée.
							</p>
						</div>
					</div>
				) : (
					<div className="relative">
						{/* Timeline line */}
						<div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border" />

						<div className="space-y-6">
							{steps.map((step, index) => {
								const Icon = step.icon;
								const isCompleted = step.completed;
								const isActive = step.active;
								const isFailed = step.failed;

								return (
									<div key={index} className="relative flex gap-4">
										{/* Icon */}
										<div
											className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
												isFailed
													? "border-destructive bg-destructive/10 text-destructive"
													: isCompleted
														? "border-primary bg-primary text-primary-foreground"
														: isActive
															? "border-primary bg-background text-primary"
															: "border-border bg-muted text-muted-foreground"
											}`}
										>
											<Icon className="h-4 w-4" aria-hidden="true" />
										</div>

										{/* Content */}
										<div className="flex-1 pt-1">
											<p
												className={`text-sm font-medium ${
													isCompleted || isActive
														? "text-foreground"
														: "text-muted-foreground"
												}`}
											>
												{step.label}
											</p>
											{step.date && isCompleted && (
												<p className="text-xs text-muted-foreground">
													{format(step.date, "d MMMM yyyy 'à' HH:mm", {
														locale: fr,
													})}
												</p>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
