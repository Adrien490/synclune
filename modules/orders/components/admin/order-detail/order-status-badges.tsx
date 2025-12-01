import { ViewTransition } from "react";
import { Badge } from "@/shared/components/ui/badge";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
	FULFILLMENT_STATUS_LABELS,
	FULFILLMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import type { OrderStatusBadgesProps } from "./types";

export function OrderStatusBadges({ order }: OrderStatusBadgesProps) {
	return (
		<div className="flex flex-wrap gap-2" role="group" aria-label="Statuts de la commande">
			<ViewTransition name={`admin-order-${order.id}-status`}>
				<Badge variant={ORDER_STATUS_VARIANTS[order.status]} className="text-sm">
					<span className="sr-only">Statut : </span>
					{ORDER_STATUS_LABELS[order.status]}
				</Badge>
			</ViewTransition>
			<ViewTransition name={`admin-order-${order.id}-payment`}>
				<Badge variant={PAYMENT_STATUS_VARIANTS[order.paymentStatus]} className="text-sm">
					<span className="sr-only">Paiement : </span>
					{PAYMENT_STATUS_LABELS[order.paymentStatus]}
				</Badge>
			</ViewTransition>
			<ViewTransition name={`admin-order-${order.id}-fulfillment`}>
				<Badge variant={FULFILLMENT_STATUS_VARIANTS[order.fulfillmentStatus]} className="text-sm">
					<span className="sr-only">Traitement : </span>
					{FULFILLMENT_STATUS_LABELS[order.fulfillmentStatus]}
				</Badge>
			</ViewTransition>
		</div>
	);
}
