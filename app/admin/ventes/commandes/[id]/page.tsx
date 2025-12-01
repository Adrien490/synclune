import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { OrderDetailPage as OrderDetail } from "@/modules/orders/components/admin/order-detail";
import { CancelOrderAlertDialog } from "@/modules/orders/components/admin/cancel-order-alert-dialog";
import { MarkAsPaidAlertDialog } from "@/modules/orders/components/admin/mark-as-paid-alert-dialog";
import { MarkAsShippedDialog } from "@/modules/orders/components/admin/mark-as-shipped-dialog";
import { MarkAsDeliveredAlertDialog } from "@/modules/orders/components/admin/mark-as-delivered-alert-dialog";
import { UpdateTrackingDialog } from "@/modules/orders/components/admin/update-tracking-dialog";
import { MarkAsProcessingAlertDialog } from "@/modules/orders/components/admin/mark-as-processing-alert-dialog";
import { RevertToProcessingDialog } from "@/modules/orders/components/admin/revert-to-processing-dialog";
import { MarkAsReturnedAlertDialog } from "@/modules/orders/components/admin/mark-as-returned-alert-dialog";
import { OrderNotesDialog } from "@/modules/orders/components/admin/order-notes-dialog";
import { ResendEmailDialog } from "@/modules/orders/components/admin/resend-email-dialog";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
			{/* Bouton retour mobile */}
			<Link
				href="/admin/ventes/commandes"
				className="sm:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="h-4 w-4" aria-hidden="true" />
				Retour aux commandes
			</Link>

			{/* Breadcrumb (caché sur mobile) */}
			<Breadcrumb className="hidden sm:flex">
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
			<ResendEmailDialog />
		</div>
	);
}
