import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderStatus } from "@/app/generated/prisma/client";

import { UpdateTrackingForm } from "@/modules/orders/components/admin/update-tracking-form";
import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import type { Carrier } from "@/modules/orders/utils/carrier.utils";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

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
	await assertAdminPage();

	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		notFound();
	}

	// Garde miroir de `updateTracking` (la Server Action) : les 3 sous-routes d'édition
	// sœurs (client, adresse-livraison, adresse-facturation) gatent déjà, celle-ci non —
	// le deep-link mobile émis par `order-shipping-card` rendait donc un formulaire de
	// suivi complet sur une commande PENDING, que l'action refusait ensuite.
	//
	// ⚠️ On ne gate PAS sur `permissions.canUpdateTracking` : celui-ci exige en plus
	// `hasTrackingNumber` (il pilote le bouton « Modifier » d'un suivi EXISTANT), alors
	// que l'action accepte volontairement d'AJOUTER un suivi manquant à une commande
	// expédiée. Gater dessus fermerait ce cas légitime. La fenêtre de verrouillage
	// 30 jours après livraison reste portée par l'action, qui renvoie un message précis.
	const canReachTrackingForm =
		order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED;

	if (!canReachTrackingForm) {
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
