import { notFound } from "next/navigation";

import { getOrder } from "@/modules/orders/data/get-order";
import { OrderItemsList } from "@/modules/orders/components/customer/order-items-list";
import { OrderRefundsCard } from "@/modules/orders/components/customer/order-refunds-card";
import { OrderStatusTimeline } from "@/modules/orders/components/customer/order-status-timeline";
import { OrderTracking } from "@/modules/orders/components/customer/order-tracking";
import { OrderSummaryCard } from "@/modules/orders/components/customer/order-summary-card";
import { OrderAddressesCard } from "@/modules/orders/components/customer/order-addresses-card";
import { DownloadInvoiceButton } from "@/modules/orders/components/customer/download-invoice-button";
import { RequestReturnButton } from "@/modules/refunds/components/customer/request-return-button";
import { CancelOrderButton } from "@/modules/orders/components/customer/cancel-order-button";
import {
	isReturnEligible,
	getReturnDaysRemaining,
} from "@/modules/refunds/services/return-eligibility.service";

interface OrderDetailContentProps {
	orderNumber: string;
}

export async function OrderDetailContent({ orderNumber }: OrderDetailContentProps) {
	const order = await getOrder({ orderNumber });

	if (!order) {
		notFound();
	}

	const canRequestReturn = isReturnEligible(order);
	const daysRemaining = getReturnDaysRemaining(order.actualDelivery);

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
			<div className="space-y-6 md:col-span-2">
				<OrderItemsList items={order.items} />
				{order.refunds.length > 0 && <OrderRefundsCard refunds={order.refunds} />}
				<OrderStatusTimeline order={order} />
				<OrderTracking order={order} />
			</div>

			<div className="space-y-6 md:col-span-1">
				<OrderSummaryCard order={order} />
				<OrderAddressesCard order={order} />
				{order.paymentStatus === "PAID" && order.invoiceStatus === "GENERATED" && (
					<DownloadInvoiceButton orderNumber={order.orderNumber} />
				)}
				{canRequestReturn && (
					<RequestReturnButton orderId={order.id} daysRemaining={daysRemaining} />
				)}
				{order.status === "PENDING" && <CancelOrderButton orderId={order.id} />}
			</div>
		</div>
	);
}
