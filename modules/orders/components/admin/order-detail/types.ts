import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import type { OrderRefundItem } from "@/modules/orders/data/get-order-refunds";
import type {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/browser";

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface OrderDetailProps {
	order: GetOrderReturn;
}

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

export interface OrderProgressStepperProps {
	status: OrderStatus;
	paymentStatus: PaymentStatus;
}

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
	canRefund: boolean;
}

export interface OrderAddressCardProps {
	order: GetOrderReturn;
}

export interface OrderPaymentCardProps {
	order: GetOrderReturn;
}
