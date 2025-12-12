import { Button } from "@/shared/components/ui/button";
import { PageHeader } from "@/shared/components/page-header";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";
import { OrderStatusTimeline } from "@/modules/orders/components/customer/order-status-timeline";
import { OrderItemsList } from "@/modules/orders/components/customer/order-items-list";
import { OrderTracking } from "@/modules/orders/components/customer/order-tracking";
import { OrderSummaryCard } from "@/modules/orders/components/customer/order-summary-card";
import { OrderAddressesCard } from "@/modules/orders/components/customer/order-addresses-card";
// TODO: Implémenter DownloadInvoiceButton
// import { DownloadInvoiceButton } from "@/modules/orders/components/customer/download-invoice-button";
import { getOrder } from "@/modules/orders/data/get-order";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type OrderDetailPageProps = {
	params: Promise<{ orderNumber: string }>;
};

export async function generateMetadata({
	params,
}: OrderDetailPageProps): Promise<Metadata> {
	const { orderNumber } = await params;

	return {
		title: `Commande ${orderNumber} - Synclune`,
		description: `Détails de votre commande ${orderNumber}`,
		robots: {
			index: false,
			follow: true,
		},
	};
}

export default async function OrderDetailPage({
	params,
}: OrderDetailPageProps) {
	const { orderNumber } = await params;

	const order = await getOrder({ orderNumber });

	if (!order) {
		notFound();
	}

	return (
		<div className="min-h-screen">
			<PageHeader
				title={`Commande ${order.orderNumber}`}
				description="Détails et suivi de votre commande"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Commandes", href: "/commandes" },
					{ label: order.orderNumber, href: `/commandes/${order.orderNumber}` },
				]}
				action={
					<Button variant="outline" asChild>
						<Link href="/commandes">
							<ArrowLeft className="h-4 w-4 mr-2" />
							Retour
						</Link>
					</Button>
				}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid lg:grid-cols-3 gap-6">
						{/* Main content - 2/3 */}
						<div className="lg:col-span-2 space-y-6">
							<OrderStatusTimeline
								order={{
									status: order.status,
									paymentStatus: order.paymentStatus,
									fulfillmentStatus: order.fulfillmentStatus,
									createdAt: order.createdAt,
									paidAt: order.paidAt,
									shippedAt: order.shippedAt,
									actualDelivery: order.actualDelivery,
								}}
							/>

							<OrderItemsList items={order.items} />

							{order.trackingNumber && (
								<OrderTracking
									order={{
										trackingNumber: order.trackingNumber,
										trackingUrl: order.trackingUrl,
										shippingCarrier: order.shippingCarrier,
										shippedAt: order.shippedAt,
										estimatedDelivery: order.estimatedDelivery,
										actualDelivery: order.actualDelivery,
									}}
								/>
							)}
						</div>

						{/* Sidebar - 1/3 */}
						<div className="space-y-6">
							<OrderSummaryCard
								order={{
									orderNumber: order.orderNumber,
									createdAt: order.createdAt,
									subtotal: order.subtotal,
									discountAmount: order.discountAmount,
									shippingCost: order.shippingCost,
									total: order.total,
									currency: order.currency,
								}}
							/>

							<OrderAddressesCard
								order={{
									shippingFirstName: order.shippingFirstName,
									shippingLastName: order.shippingLastName,
									shippingAddress1: order.shippingAddress1,
									shippingAddress2: order.shippingAddress2,
									shippingPostalCode: order.shippingPostalCode,
									shippingCity: order.shippingCity,
									shippingCountry: order.shippingCountry,
									shippingPhone: order.shippingPhone,
								}}
							/>

							{/* TODO: Implémenter DownloadInvoiceButton */}
							{/* {order.invoiceNumber && (
								<DownloadInvoiceButton
									orderId={order.id}
									invoiceNumber={order.invoiceNumber}
								/>
							)} */}
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
