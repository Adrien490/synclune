import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditShippingAddressForm } from "@/modules/orders/components/admin/edit-shipping-address-form";
import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import { OrderStatus } from "@/app/generated/prisma/browser";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

type ShippingAddressPageParams = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: ShippingAddressPageParams;
}): Promise<Metadata> {
	const { id } = await params;
	const order = await getOrderById({ id });
	if (!order) {
		return { title: "Commande introuvable" };
	}
	return {
		title: `Adresse de livraison — ${order.orderNumber} - Administration`,
		description: `Modifier l'adresse de livraison de la commande ${order.orderNumber}`,
	};
}

export default async function ShippingAddressPage({
	params,
}: {
	params: ShippingAddressPageParams;
}) {
	await assertAdminPage();

	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		notFound();
	}

	// Miroir EXACT de la garde de `update-order-shipping-address.ts` — lue sur
	// `status` depuis le Lot 4, mêmes trois valeurs.
	const canEditShipping =
		order.status !== OrderStatus.SHIPPED &&
		order.status !== OrderStatus.DELIVERED &&
		order.status !== OrderStatus.RETURNED;

	if (!canEditShipping) {
		notFound();
	}

	return (
		<div className="space-y-4">
			<h1 className="hidden text-2xl font-semibold md:block">Modifier l'adresse de livraison</h1>
			<EditShippingAddressForm
				orderId={order.id}
				orderNumber={order.orderNumber}
				shippingFirstName={order.shippingFirstName}
				shippingLastName={order.shippingLastName}
				shippingAddress1={order.shippingAddress1}
				shippingAddress2={order.shippingAddress2}
				shippingPostalCode={order.shippingPostalCode}
				shippingCity={order.shippingCity}
				shippingCountry={order.shippingCountry}
				shippingPhone={order.shippingPhone}
				redirectOnSuccess
				successPath={`/admin/ventes/commandes/${order.id}`}
				className="max-w-2xl"
			/>
		</div>
	);
}
