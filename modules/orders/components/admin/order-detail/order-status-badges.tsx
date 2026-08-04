import { Badge } from "@/shared/components/ui/badge";
import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
	INVOICE_STATUS_LABELS,
	INVOICE_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import type { OrderStatusBadgesProps } from "./types";

export function OrderStatusBadges({ order }: OrderStatusBadgesProps) {
	const orderStatusLabel = ORDER_STATUS_LABELS[order.status];
	const paymentStatusLabel = PAYMENT_STATUS_LABELS[order.paymentStatus];
	const invoiceStatusLabel = order.invoiceStatus
		? INVOICE_STATUS_LABELS[order.invoiceStatus]
		: null;

	return (
		<div className="flex flex-wrap gap-2" role="group" aria-label="Statuts de la commande">
			<Badge
				variant={ORDER_STATUS_VARIANTS[order.status]}
				className="text-sm"
				role="status"
				aria-label={`Statut de la commande : ${orderStatusLabel}`}
				style={{ viewTransitionName: `order-status-${order.id}` }}
			>
				{orderStatusLabel}
			</Badge>
			<Badge
				variant={PAYMENT_STATUS_VARIANTS[order.paymentStatus]}
				className="text-sm"
				role="status"
				aria-label={`Statut du paiement : ${paymentStatusLabel}`}
				style={{ viewTransitionName: `order-payment-${order.id}` }}
			>
				{paymentStatusLabel}
			</Badge>
			{order.invoiceStatus && invoiceStatusLabel && (
				<Badge
					variant={INVOICE_STATUS_VARIANTS[order.invoiceStatus]}
					className="text-sm"
					role="status"
					aria-label={`Statut de la facture : ${invoiceStatusLabel}`}
				>
					{invoiceStatusLabel}
				</Badge>
			)}
		</div>
	);
}
