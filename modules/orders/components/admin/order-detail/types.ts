import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import type { OrderRefundItem } from "@/modules/orders/data/get-order-refunds";
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/browser";

// ============================================================================
// HEADER (Client Component)
// ============================================================================

export interface OrderHeaderProps {
	order: GetOrderReturn;
	notesCount: number;
}

// ============================================================================
// STEPPER & ALERTS (Server Components)
// ============================================================================

export interface OrderAlertsProps {
	status: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
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
	taxAmount: number;
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
	orderId: string;
	orderNumber: string;
	canRefund: boolean;
	canMarkAsFullyRefunded: boolean;
	invoiceStatus: GetOrderReturn["invoiceStatus"];
	invoiceNumber: string | null;
}

export interface OrderAddressCardProps {
	order: GetOrderReturn;
}

export interface OrderPaymentCardProps {
	order: GetOrderReturn;
}
