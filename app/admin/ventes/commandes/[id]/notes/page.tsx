import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderNotesPanel } from "@/modules/orders/components/admin/order-notes-panel";
import { getOrderById } from "@/modules/orders/data/get-order-by-id";

type OrderNotesPageParams = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: OrderNotesPageParams;
}): Promise<Metadata> {
	const { id } = await params;
	const order = await getOrderById({ id });
	if (!order) {
		return { title: "Commande introuvable" };
	}
	return {
		title: `Notes — ${order.orderNumber} - Administration`,
		description: `Notes internes de la commande ${order.orderNumber}`,
	};
}

export default async function OrderNotesPage({ params }: { params: OrderNotesPageParams }) {
	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		notFound();
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-4">
			<div className="hidden md:block">
				<h1 className="text-2xl font-semibold">Notes internes</h1>
				<p className="text-muted-foreground text-sm">
					Commande{" "}
					<span className="text-foreground font-semibold tabular-nums">{order.orderNumber}</span>
				</p>
			</div>
			<OrderNotesPanel orderId={order.id} className="max-w-2xl" />
		</div>
	);
}
