import { getOrderById } from "@/modules/orders/data/get-order-by-id";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { AlertDialogSkeleton, AdminDialogSkeleton } from "@/shared/components/skeletons/lazy-loading";
import { OrderDetailPage as OrderDetail } from "@/modules/orders/components/admin/order-detail";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

// Lazy loading - dialogs charges uniquement a l'ouverture
const CancelOrderAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/cancel-order-alert-dialog").then((mod) => mod.CancelOrderAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const MarkAsPaidAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-paid-alert-dialog").then((mod) => mod.MarkAsPaidAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const MarkAsShippedDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-shipped-dialog").then((mod) => mod.MarkAsShippedDialog),
	{ loading: () => <AdminDialogSkeleton /> }
);
const MarkAsDeliveredAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-delivered-alert-dialog").then((mod) => mod.MarkAsDeliveredAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const UpdateTrackingDialog = dynamic(
	() => import("@/modules/orders/components/admin/update-tracking-dialog").then((mod) => mod.UpdateTrackingDialog),
	{ loading: () => <AdminDialogSkeleton /> }
);
const MarkAsProcessingAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-processing-alert-dialog").then((mod) => mod.MarkAsProcessingAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const RevertToProcessingDialog = dynamic(
	() => import("@/modules/orders/components/admin/revert-to-processing-dialog").then((mod) => mod.RevertToProcessingDialog),
	{ loading: () => <AdminDialogSkeleton /> }
);
const MarkAsReturnedAlertDialog = dynamic(
	() => import("@/modules/orders/components/admin/mark-as-returned-alert-dialog").then((mod) => mod.MarkAsReturnedAlertDialog),
	{ loading: () => <AlertDialogSkeleton /> }
);
const OrderNotesDialog = dynamic(
	() => import("@/modules/orders/components/admin/order-notes-dialog").then((mod) => mod.OrderNotesDialog),
	{ loading: () => <AdminDialogSkeleton /> }
);
const ResendEmailDialog = dynamic(
	() => import("@/modules/orders/components/admin/resend-email-dialog").then((mod) => mod.ResendEmailDialog),
	{ loading: () => <AdminDialogSkeleton /> }
);
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
				className="md:hidden flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<ChevronLeft className="h-4 w-4" aria-hidden="true" />
				Retour aux commandes
			</Link>

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
