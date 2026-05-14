import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UpdateTrackingForm } from "@/modules/orders/components/admin/update-tracking-form";
import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import type { Carrier } from "@/modules/orders/utils/carrier.utils";

type OrderTrackingPageParams = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: OrderTrackingPageParams;
}): Promise<Metadata> {
	const { id } = await params;
	const order = await getOrderById({ id });
	if (!order) {
		return { title: "Commande introuvable" };
	}
	return {
		title: `Suivi — ${order.orderNumber} - Administration`,
		description: `Modifier le suivi de la commande ${order.orderNumber}`,
	};
}

export default async function OrderTrackingPage({ params }: { params: OrderTrackingPageParams }) {
	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		notFound();
	}

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Modifier le suivi</h1>
			<UpdateTrackingForm
				orderId={order.id}
				orderNumber={order.orderNumber}
				initialTrackingNumber={order.trackingNumber ?? undefined}
				initialTrackingUrl={order.trackingUrl ?? undefined}
				initialCarrier={order.shippingCarrier as Carrier | undefined}
				redirectOnSuccess
				successPath={`/admin/ventes/commandes/${order.id}`}
				className="max-w-2xl"
			/>
		</div>
	);
}
