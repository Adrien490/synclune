import { type Metadata } from "next";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";

import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";
import { getOrderById } from "@/modules/orders/data/get-order";
import { OrderDetail } from "@/modules/orders/components/admin/order-detail";
import { orderDisplayLabel } from "@/modules/orders/components/admin/orders-data-table";
import { PageHeader } from "@/shared/components/page-header";

const MarkOrderAsShippedDialog = dynamic(() =>
	import("@/modules/orders/components/admin/mark-order-as-shipped-dialog").then(
		(mod) => mod.MarkOrderAsShippedDialog,
	),
);
const CancelOrderAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/cancel-order-alert-dialog").then(
		(mod) => mod.CancelOrderAlertDialog,
	),
);

export const metadata: Metadata = {
	title: "Détail commande - Administration",
};

export default async function AdminOrderDetailPage({
	params,
}: {
	params: Promise<{ orderId: string }>;
}) {
	await assertAdminPage();

	const { orderId } = await params;
	const order = await getOrderById(orderId);
	if (!order) notFound();

	return (
		<>
			<MarkOrderAsShippedDialog />
			<CancelOrderAlertDialog />

			<PageHeader variant="compact" title={`Commande ${orderDisplayLabel(order)}`} />
			<OrderDetail order={order} />
		</>
	);
}
