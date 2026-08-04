import { WarningIcon } from "@phosphor-icons/react/ssr";

import { getOrderRefunds } from "@/modules/orders/data/get-order-refunds";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { getOrderPermissions } from "@/modules/orders/services/order-status-validation.service";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";

import { OrderHeader } from "./order-header";
import { OrderProgressStepper } from "./order-progress-stepper";
import { OrderAlerts } from "./order-alerts";
import { OrderStatusBadges } from "./order-status-badges";
import { OrderItemsCard } from "./order-items-card";
import { OrderShippingCard } from "./order-shipping-card";
import { OrderCustomerCard } from "./order-customer-card";
import { OrderRefundsCard } from "./order-refunds-card";
import { OrderAddressCard } from "./order-address-card";
import { OrderPaymentCard } from "./order-payment-card";
import { OrderInvoiceCard } from "./order-invoice-card";
import { OrderHistoryTimeline } from "./order-history-timeline";

interface OrderDetailPageProps {
	order: GetOrderReturn;
}

export async function OrderDetailPage({ order }: OrderDetailPageProps) {
	const refundsResult = await getOrderRefunds(order.id);

	const refundsError = "error" in refundsResult ? refundsResult.error : null;
	const refunds = "refunds" in refundsResult ? refundsResult.refunds : [];

	// Permissions calculées via state machine centralisée
	const permissions = getOrderPermissions(order);
	const { canRefund, canUpdateTracking } = permissions;

	return (
		<div className="space-y-4 md:space-y-6">
			<OrderHeader order={order} />

			<OrderProgressStepper status={order.status} paymentStatus={order.paymentStatus} />

			{refundsError && (
				<Alert variant="destructive" role="alert">
					<WarningIcon className="size-4" />
					<AlertTitle>Chargement partiel</AlertTitle>
					<AlertDescription>
						Impossible de charger les remboursements de cette commande. La liste peut être
						incomplète — rafraîchir la page avant de créer un nouveau remboursement.
					</AlertDescription>
				</Alert>
			)}

			<OrderAlerts status={order.status} paymentStatus={order.paymentStatus} />

			<OrderStatusBadges order={order} />

			<div className="grid gap-0 md:gap-6 lg:grid-cols-3">
				{/* Left column - 2/3 */}
				<div className="-mx-[var(--admin-main-x,1.5rem)] space-y-0 divide-y md:mx-0 md:space-y-6 md:divide-y-0 lg:col-span-2">
					<OrderItemsCard
						items={order.items}
						subtotal={order.subtotal}
						discountAmount={order.discountAmount}
						shippingCost={order.shippingCost}
						total={order.total}
					/>

					{(order.trackingNumber ?? order.shippedAt) && (
						<OrderShippingCard order={order} canUpdateTracking={canUpdateTracking} />
					)}
				</div>

				{/* Right column - 1/3 */}
				<div className="-mx-[var(--admin-main-x,1.5rem)] space-y-0 divide-y md:mx-0 md:space-y-6 md:divide-y-0">
					<OrderCustomerCard order={order} />

					<OrderRefundsCard
						refunds={refunds}
						canRefund={canRefund}
						stripePaymentIntentId={order.stripePaymentIntentId}
					/>

					<OrderAddressCard order={order} />

					<OrderPaymentCard order={order} />

					<OrderInvoiceCard order={order} />

					<OrderHistoryTimeline history={order.history} />
				</div>
			</div>
		</div>
	);
}
