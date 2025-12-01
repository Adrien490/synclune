import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { OrderDetailPage as OrderDetail } from "@/modules/orders/components/admin/order-detail";
import { OrderDetailSkeleton } from "@/modules/orders/components/admin/order-detail/order-detail-skeleton";
import { CancelOrderAlertDialog } from "@/modules/orders/components/admin/cancel-order-alert-dialog";
import { MarkAsPaidAlertDialog } from "@/modules/orders/components/admin/mark-as-paid-alert-dialog";
import { MarkAsShippedDialog } from "@/modules/orders/components/admin/mark-as-shipped-dialog";
import { MarkAsDeliveredAlertDialog } from "@/modules/orders/components/admin/mark-as-delivered-alert-dialog";
import { UpdateTrackingDialog } from "@/modules/orders/components/admin/update-tracking-dialog";
import { MarkAsProcessingAlertDialog } from "@/modules/orders/components/admin/mark-as-processing-alert-dialog";
import { RevertToProcessingDialog } from "@/modules/orders/components/admin/revert-to-processing-dialog";
import { MarkAsReturnedAlertDialog } from "@/modules/orders/components/admin/mark-as-returned-alert-dialog";
import { OrderNotesDialog } from "@/modules/orders/components/admin/order-notes-dialog";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";

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

export default async function OrderDetailPage({
	params,
}: {
	params: OrderDetailPageParams;
}) {
	const { id } = await params;
	const order = await getOrderById({ id });

	if (!order) {
		notFound();
	}

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Breadcrumb>
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
			<MarkAsPaidAlertDialog />
			<MarkAsShippedDialog />
			<MarkAsDeliveredAlertDialog />
			<UpdateTrackingDialog />
			<MarkAsProcessingAlertDialog />
			<RevertToProcessingDialog />
			<MarkAsReturnedAlertDialog />
			<OrderNotesDialog />
		</div>
	);
}
