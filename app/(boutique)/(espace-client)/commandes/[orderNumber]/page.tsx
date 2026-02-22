import { notFound } from "next/navigation";

import { getOrder } from "@/modules/orders/data/get-order";
import { OrderItemsList } from "@/modules/orders/components/customer/order-items-list";
import { OrderStatusTimeline } from "@/modules/orders/components/customer/order-status-timeline";
import { OrderTracking } from "@/modules/orders/components/customer/order-tracking";
import { OrderSummaryCard } from "@/modules/orders/components/customer/order-summary-card";
import { OrderAddressesCard } from "@/modules/orders/components/customer/order-addresses-card";
import { DownloadInvoiceButton } from "@/modules/orders/components/customer/download-invoice-button";
import { PageHeader } from "@/shared/components/page-header";

interface OrderPageProps {
	params: Promise<{ orderNumber: string }>;
}

export async function generateMetadata({ params }: OrderPageProps) {
	const { orderNumber } = await params;
	return { title: `Commande ${orderNumber}` };
}

export default async function OrderPage({ params }: OrderPageProps) {
	const { orderNumber } = await params;
	const order = await getOrder({ orderNumber });

	if (!order) {
		notFound();
	}

	return (
		<>
			<PageHeader
				variant="compact"
				title={`Commande ${orderNumber}`}
				breadcrumbs={[{ label: "Commandes", href: "/commandes" }]}
			/>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<OrderItemsList items={order.items} />
					<OrderStatusTimeline order={order} />
					<OrderTracking order={order} />
				</div>

				<div className="lg:col-span-1 space-y-6">
					<OrderSummaryCard order={order} />
					<OrderAddressesCard order={order} />
					{order.paymentStatus === "PAID" &&
						order.invoiceStatus === "GENERATED" && (
							<DownloadInvoiceButton
								orderNumber={order.orderNumber}
							/>
						)}
				</div>
			</div>
		</>
	);
}
