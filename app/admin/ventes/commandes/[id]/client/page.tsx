import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditCustomerInfoForm } from "@/modules/orders/components/admin/edit-customer-info-form";
import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import { InvoiceStatus } from "@/app/generated/prisma/browser";

type CustomerPageParams = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: CustomerPageParams;
}): Promise<Metadata> {
	const { id } = await params;
	const order = await getOrderById({ id });
	if (!order) {
		return { title: "Commande introuvable" };
	}
	return {
		title: `Client — ${order.orderNumber} - Administration`,
		description: `Modifier les informations client de la commande ${order.orderNumber}`,
	};
}

export default async function OrderCustomerPage({ params }: { params: CustomerPageParams }) {
	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		notFound();
	}

	if (order.invoiceStatus === InvoiceStatus.GENERATED) {
		notFound();
	}

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Modifier les informations client</h1>
			<EditCustomerInfoForm
				orderId={order.id}
				orderNumber={order.orderNumber}
				customerEmail={order.customerEmail}
				customerName={order.customerName}
				customerPhone={order.customerPhone}
				redirectOnSuccess
				successPath={`/admin/ventes/commandes/${order.id}`}
				className="max-w-2xl"
			/>
		</div>
	);
}
