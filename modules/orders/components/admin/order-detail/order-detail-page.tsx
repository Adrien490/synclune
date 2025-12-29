import { getOrderNotes } from "@/modules/orders/data/get-order-notes";
import { getOrderRefunds } from "@/modules/orders/data/get-order-refunds";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { getOrderPermissions } from "@/modules/orders/services/order-status-validation.service";

import { OrderHeader } from "./order-header";
import { OrderProgressStepper } from "../order-progress-stepper";
import { OrderAlerts } from "./order-alerts";
import { OrderStatusBadges } from "./order-status-badges";
import { OrderItemsCard } from "./order-items-card";
import { OrderShippingCard } from "./order-shipping-card";
import { OrderCustomerCard } from "./order-customer-card";
import { OrderRefundsCard } from "./order-refunds-card";
import { OrderAddressCard } from "./order-address-card";
import { OrderPaymentCard } from "./order-payment-card";
import { OrderHistoryTimeline } from "../order-history-timeline";

interface OrderDetailPageProps {
	order: GetOrderReturn;
}

export async function OrderDetailPage({ order }: OrderDetailPageProps) {
	// Fetch données complémentaires côté serveur en parallèle
	const [notesResult, refundsResult] = await Promise.all([
		getOrderNotes(order.id),
		getOrderRefunds(order.id),
	]);

	const notesCount = "notes" in notesResult ? notesResult.notes.length : 0;
	const refunds = "refunds" in refundsResult ? refundsResult.refunds : [];

	// Permissions calculées via state machine centralisée
	const permissions = getOrderPermissions(order);
	const { canRefund, canUpdateTracking } = permissions;

	return (
		<div className="space-y-6">
			<OrderHeader order={order} notesCount={notesCount} />

			<OrderProgressStepper
				status={order.status}
				paymentStatus={order.paymentStatus}
			/>

			<OrderAlerts
				status={order.status}
				paymentStatus={order.paymentStatus}
				fulfillmentStatus={order.fulfillmentStatus}
			/>

			<OrderStatusBadges order={order} />

			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column - 2/3 */}
				<div className="lg:col-span-2 space-y-6">
					<OrderItemsCard
						items={order.items}
						subtotal={order.subtotal}
						discountAmount={order.discountAmount}
						shippingCost={order.shippingCost}
						taxAmount={order.taxAmount}
						total={order.total}
					/>

					{(order.trackingNumber || order.shippedAt) && (
						<OrderShippingCard
							order={order}
							canUpdateTracking={canUpdateTracking}
						/>
					)}
				</div>

				{/* Right column - 1/3 */}
				<div className="space-y-6">
					<OrderCustomerCard order={order} />

					<OrderRefundsCard
						refunds={refunds}
						orderId={order.id}
						canRefund={canRefund}
					/>

					<OrderAddressCard order={order} />

					<OrderPaymentCard order={order} />

					<OrderHistoryTimeline history={order.history || []} />
				</div>
			</div>
		</div>
	);
}
