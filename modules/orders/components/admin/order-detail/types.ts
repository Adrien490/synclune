import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import type { OrderRefundItem } from "@/modules/orders/data/get-order-refunds";
import type { OrderStatus, PaymentStatus } from "@/app/generated/prisma/browser";

// ============================================================================
// HEADER (Client Component)
// ============================================================================

export interface OrderHeaderProps {
	order: GetOrderReturn;
}

// ============================================================================
// STEPPER & ALERTS (Server Components)
// ============================================================================

export interface OrderAlertsProps {
	status: OrderStatus;
	paymentStatus: PaymentStatus;
}

export interface OrderStatusBadgesProps {
	order: GetOrderReturn;
}

// ============================================================================
// CARDS (Server Components)
// ============================================================================

export interface OrderItemsCardProps {
	items: GetOrderReturn["items"];
	subtotal: number;
	discountAmount: number;
	shippingCost: number;
	total: number;
}

export interface OrderShippingCardProps {
	order: GetOrderReturn;
	canUpdateTracking: boolean;
}

export interface OrderCustomerCardProps {
	order: GetOrderReturn;
}

export interface OrderRefundsCardProps {
	refunds: OrderRefundItem[];
	canRefund: boolean;
	/** PaymentIntent de la commande — porte le lien « Rembourser dans Stripe » (Lot 2 S3.3). */
	stripePaymentIntentId: string | null;
}

export interface OrderAddressCardProps {
	order: GetOrderReturn;
}

export interface OrderPaymentCardProps {
	order: GetOrderReturn;
}
