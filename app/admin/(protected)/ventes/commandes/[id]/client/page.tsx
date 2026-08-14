import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditCustomerInfoForm } from "@/modules/orders/components/admin/edit-customer-info-form";
import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

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
	await assertAdminPage();

	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		notFound();
	}

	// invoiceNumber et non invoiceStatus : VOIDED garde son numéro, l'identité
	// client reste verrouillée après void (Art. 272-I / L102 B).
	if (order.invoiceNumber !== null) {
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
				redirectOnSuccess
				successPath={`/admin/ventes/commandes/${order.id}`}
				className="max-w-2xl"
			/>
		</div>
	);
}
