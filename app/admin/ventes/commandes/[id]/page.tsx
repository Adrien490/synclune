import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { OrderDetailPage as OrderDetail } from "@/modules/orders/components/admin/order-detail";

// Lazy loading - dialogs charges uniquement a l'ouverture
const CancelOrderAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/cancel-order-alert-dialog").then(
		(mod) => mod.CancelOrderAlertDialog,
	),
);
// `useOrderActions` expose l'item « Supprimer » aussi depuis le détail (il n'est pas
// dans DETAIL_HIDDEN_KEYS) : sans ce montage, le clic était un no-op silencieux.
const DeleteOrderAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/delete-order-alert-dialog").then(
		(mod) => mod.DeleteOrderAlertDialog,
	),
);
const MarkAsPaidAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/mark-as-paid-alert-dialog").then(
		(mod) => mod.MarkAsPaidAlertDialog,
	),
);
const MarkAsShippedDialog = dynamic(() =>
	import("@/modules/orders/components/admin/mark-as-shipped-dialog").then(
		(mod) => mod.MarkAsShippedDialog,
	),
);
const MarkAsDeliveredAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/mark-as-delivered-alert-dialog").then(
		(mod) => mod.MarkAsDeliveredAlertDialog,
	),
);
const UpdateTrackingDialog = dynamic(() =>
	import("@/modules/orders/components/admin/update-tracking-dialog").then(
		(mod) => mod.UpdateTrackingDialog,
	),
);
const MarkAsProcessingAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/mark-as-processing-alert-dialog").then(
		(mod) => mod.MarkAsProcessingAlertDialog,
	),
);
const RevertToProcessingDialog = dynamic(() =>
	import("@/modules/orders/components/admin/revert-to-processing-dialog").then(
		(mod) => mod.RevertToProcessingDialog,
	),
);
const MarkAsReturnedAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/mark-as-returned-alert-dialog").then(
		(mod) => mod.MarkAsReturnedAlertDialog,
	),
);
const UndoReturnAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/undo-return-alert-dialog").then(
		(mod) => mod.UndoReturnAlertDialog,
	),
);
const MarkAsFullyRefundedAlertDialog = dynamic(() =>
	import("@/modules/orders/components/admin/mark-as-fully-refunded-alert-dialog").then(
		(mod) => mod.MarkAsFullyRefundedAlertDialog,
	),
);
const OrderNotesDialog = dynamic(() =>
	import("@/modules/orders/components/admin/order-notes-dialog").then(
		(mod) => mod.OrderNotesDialog,
	),
);
const EditCustomerInfoDialog = dynamic(() =>
	import("@/modules/orders/components/admin/edit-customer-info-dialog").then(
		(mod) => mod.EditCustomerInfoDialog,
	),
);
const EditShippingAddressDialog = dynamic(() =>
	import("@/modules/orders/components/admin/edit-shipping-address-dialog").then(
		(mod) => mod.EditShippingAddressDialog,
	),
);
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

type OrderDetailPageParams = Promise<{ id: string }>;

export async function generateMetadata({
	params,
}: {
	params: OrderDetailPageParams;
}): Promise<Metadata> {
	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		return {
			title: "Commande introuvable",
		};
	}

	return {
		title: `Commande ${order.orderNumber} - Administration`,
		description: `Détails de la commande ${order.orderNumber}`,
	};
}

export default async function OrderDetailPage({ params }: { params: OrderDetailPageParams }) {
	await assertAdminPage();

	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		notFound();
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb (caché sur mobile) */}
			<Breadcrumb className="hidden md:flex">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/ventes/commandes">Commandes</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{order.orderNumber}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<OrderDetail order={order} />

			{/* Dialogs */}
			<CancelOrderAlertDialog />
			<DeleteOrderAlertDialog successPath="/admin/ventes/commandes" />
			<MarkAsPaidAlertDialog />
			<MarkAsShippedDialog />
			<MarkAsDeliveredAlertDialog />
			<UpdateTrackingDialog />
			<MarkAsProcessingAlertDialog />
			<RevertToProcessingDialog />
			<MarkAsReturnedAlertDialog />
			<UndoReturnAlertDialog />
			<MarkAsFullyRefundedAlertDialog />
			<OrderNotesDialog />
			<EditCustomerInfoDialog />
			<EditShippingAddressDialog />
		</div>
	);
}
