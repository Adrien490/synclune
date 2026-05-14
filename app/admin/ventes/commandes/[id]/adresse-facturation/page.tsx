import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditBillingAddressForm } from "@/modules/orders/components/admin/edit-billing-address-form";
import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import { InvoiceStatus } from "@/app/generated/prisma/browser";

type BillingAddressPageParams = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: BillingAddressPageParams;
}): Promise<Metadata> {
	const { id } = await params;
	const order = await getOrderById({ id });
	if (!order) {
		return { title: "Commande introuvable" };
	}
	return {
		title: `Adresse de facturation — ${order.orderNumber} - Administration`,
		description: `Modifier l'adresse de facturation de la commande ${order.orderNumber}`,
	};
}

export default async function BillingAddressPage({ params }: { params: BillingAddressPageParams }) {
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
			<h1 className="hidden text-2xl font-semibold md:block">Modifier l'adresse de facturation</h1>
			<EditBillingAddressForm
				orderId={order.id}
				orderNumber={order.orderNumber}
				billingSameAsShipping={order.billingSameAsShipping}
				billingFirstName={order.billingFirstName}
				billingLastName={order.billingLastName}
				billingAddress1={order.billingAddress1}
				billingAddress2={order.billingAddress2}
				billingPostalCode={order.billingPostalCode}
				billingCity={order.billingCity}
				billingCountry={order.billingCountry}
				billingPhone={order.billingPhone}
				redirectOnSuccess
				successPath={`/admin/ventes/commandes/${order.id}`}
				className="max-w-2xl"
			/>
		</div>
	);
}
