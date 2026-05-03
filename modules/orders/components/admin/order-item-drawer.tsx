"use client";

import { OrderStatus, PaymentStatus, type FulfillmentStatus } from "@/app/generated/prisma/browser";
import {
	CircleCheck,
	CircleX,
	CreditCard,
	ExternalLink,
	Eye,
	Mail,
	Package,
	PackageCheck,
	PackageX,
	RotateCcw,
	ShoppingBag,
	StickyNote,
	Trash2,
	Truck,
	Undo2,
} from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import {
	ORDER_STATUS_LABELS,
	ORDER_STATUS_VARIANTS,
	PAYMENT_STATUS_LABELS,
	PAYMENT_STATUS_VARIANTS,
} from "@/modules/orders/constants/status-display";
import { useResendOrderEmail } from "@/modules/orders/hooks/use-resend-order-email";
import { getOrderPermissions } from "@/modules/orders/services/order-status-validation.service";
import type { OrderStateInput } from "@/modules/orders/types/order.types";

import { CancelOrderAlertDialog, CANCEL_ORDER_DIALOG_ID } from "./cancel-order-alert-dialog";
import { DeleteOrderAlertDialog, DELETE_ORDER_DIALOG_ID } from "./delete-order-alert-dialog";
import {
	MarkAsDeliveredAlertDialog,
	MARK_AS_DELIVERED_DIALOG_ID,
} from "./mark-as-delivered-alert-dialog";
import { MarkAsPaidAlertDialog, MARK_AS_PAID_DIALOG_ID } from "./mark-as-paid-alert-dialog";
import {
	MarkAsProcessingAlertDialog,
	MARK_AS_PROCESSING_DIALOG_ID,
} from "./mark-as-processing-alert-dialog";
import {
	MarkAsReturnedAlertDialog,
	MARK_AS_RETURNED_DIALOG_ID,
} from "./mark-as-returned-alert-dialog";
import { MarkAsShippedDialog, MARK_AS_SHIPPED_DIALOG_ID } from "./mark-as-shipped-dialog";
import { OrderNotesDialog, ORDER_NOTES_DIALOG_ID } from "./order-notes-dialog";
import {
	RevertToProcessingDialog,
	REVERT_TO_PROCESSING_DIALOG_ID,
} from "./revert-to-processing-dialog";

export const ORDER_ITEM_DRAWER_ID = "order-item-drawer";

const ORDER_DIALOGS = (
	<>
		<CancelOrderAlertDialog />
		<DeleteOrderAlertDialog />
		<MarkAsPaidAlertDialog />
		<MarkAsShippedDialog />
		<MarkAsDeliveredAlertDialog />
		<MarkAsProcessingAlertDialog />
		<RevertToProcessingDialog />
		<MarkAsReturnedAlertDialog />
		<OrderNotesDialog />
	</>
);

export interface OrderItemDrawerData {
	order: {
		id: string;
		orderNumber: string;
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus: FulfillmentStatus | null;
		trackingNumber: string | null;
		trackingUrl: string | null;
		invoiceNumber: string | null;
		total: number;
		customerName: string | null;
		customerEmail: string;
		itemsCount: number;
		createdAt: Date;
	};
	[key: string]: unknown;
}

export function OrderItemDrawer() {
	const drawer = useDialog<OrderItemDrawerData>(ORDER_ITEM_DRAWER_ID);
	const cancelAlert = useAlertDialog(CANCEL_ORDER_DIALOG_ID);
	const deleteAlert = useAlertDialog(DELETE_ORDER_DIALOG_ID);
	const markAsPaidAlert = useAlertDialog(MARK_AS_PAID_DIALOG_ID);
	const markAsShippedAlert = useAlertDialog(MARK_AS_SHIPPED_DIALOG_ID);
	const markAsDeliveredAlert = useAlertDialog(MARK_AS_DELIVERED_DIALOG_ID);
	const markAsProcessingAlert = useAlertDialog(MARK_AS_PROCESSING_DIALOG_ID);
	const revertToProcessingAlert = useAlertDialog(REVERT_TO_PROCESSING_DIALOG_ID);
	const markAsReturnedAlert = useAlertDialog(MARK_AS_RETURNED_DIALOG_ID);
	const notesDialog = useDialog(ORDER_NOTES_DIALOG_ID);
	const { resend, isPending: isResending } = useResendOrderEmail();

	const order = drawer.data?.order;

	if (!order) {
		return (
			<AdminItemDrawer
				open={drawer.isOpen}
				onOpenChange={(o) => !o && drawer.close()}
				title=""
				dialogs={ORDER_DIALOGS}
			>
				{null}
			</AdminItemDrawer>
		);
	}

	const permissions = getOrderPermissions(order as unknown as OrderStateInput);
	const isShipped = order.status === OrderStatus.SHIPPED;
	const isDelivered = order.status === OrderStatus.DELIVERED;
	const {
		canMarkAsPaid,
		canCancel,
		canMarkAsShipped,
		canMarkAsDelivered,
		canRefund,
		canMarkAsProcessing,
		canRevertToProcessing,
		canMarkAsReturned,
	} = permissions;
	const canTrack = isShipped && order.trackingUrl;
	const canDelete =
		!order.invoiceNumber &&
		order.paymentStatus !== PaymentStatus.PAID &&
		order.paymentStatus !== PaymentStatus.REFUNDED;

	const handleMarkAsPaid = () =>
		markAsPaidAlert.open({ orderId: order.id, orderNumber: order.orderNumber });
	const handleMarkAsShipped = () =>
		markAsShippedAlert.open({ orderId: order.id, orderNumber: order.orderNumber });
	const handleMarkAsDelivered = () =>
		markAsDeliveredAlert.open({ orderId: order.id, orderNumber: order.orderNumber });
	const handleMarkAsProcessing = () =>
		markAsProcessingAlert.open({ orderId: order.id, orderNumber: order.orderNumber });
	const handleRevertToProcessing = () =>
		revertToProcessingAlert.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			trackingNumber: order.trackingNumber,
		});
	const handleMarkAsReturned = () =>
		markAsReturnedAlert.open({ orderId: order.id, orderNumber: order.orderNumber });
	const handleCancel = () =>
		cancelAlert.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			isPaid: order.paymentStatus === PaymentStatus.PAID,
		});
	const handleDelete = () =>
		deleteAlert.open({ orderId: order.id, orderNumber: order.orderNumber });
	const handleOpenNotes = () =>
		notesDialog.open({ orderId: order.id, orderNumber: order.orderNumber });

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={order.orderNumber}
			description={`${order.customerName ?? order.customerEmail}`}
			dialogs={ORDER_DIALOGS}
		>
			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Client</dt>
				<dd className="truncate">{order.customerName ?? order.customerEmail}</dd>
				<dt className="text-muted-foreground">Total</dt>
				<dd className="font-medium">
					{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
						order.total / 100,
					)}
				</dd>
				<dt className="text-muted-foreground">Articles</dt>
				<dd>{order.itemsCount}</dd>
				<dt className="text-muted-foreground">Statut</dt>
				<dd className="flex flex-wrap gap-1.5">
					<Badge variant={ORDER_STATUS_VARIANTS[order.status]}>
						{ORDER_STATUS_LABELS[order.status]}
					</Badge>
					<Badge variant={PAYMENT_STATUS_VARIANTS[order.paymentStatus]}>
						{PAYMENT_STATUS_LABELS[order.paymentStatus]}
					</Badge>
				</dd>
				{order.trackingNumber ? (
					<>
						<dt className="text-muted-foreground">Suivi</dt>
						<dd className="truncate font-mono text-xs">{order.trackingNumber}</dd>
					</>
				) : null}
				{order.invoiceNumber ? (
					<>
						<dt className="text-muted-foreground">Facture</dt>
						<dd className="font-mono text-xs">{order.invoiceNumber}</dd>
					</>
				) : null}
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/ventes/commandes/${order.id}`} onClick={() => drawer.close()}>
						<Eye className="size-4" aria-hidden="true" />
						Voir les détails
					</Link>
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={handleOpenNotes}
				>
					<StickyNote className="size-4" aria-hidden="true" />
					Notes internes
				</Button>
				<Button
					variant="outline"
					size="lg"
					className="h-12 justify-start gap-3"
					onClick={() => resend(order.id, "confirmation")}
					disabled={isResending}
				>
					<ShoppingBag className="size-4" aria-hidden="true" />
					Renvoyer confirmation
				</Button>
				{(isShipped || isDelivered) && order.trackingNumber ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={() => resend(order.id, "shipping")}
						disabled={isResending}
					>
						<Mail className="size-4" aria-hidden="true" />
						Renvoyer email expédition
					</Button>
				) : null}
				{isDelivered ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={() => resend(order.id, "delivery")}
						disabled={isResending}
					>
						<PackageCheck className="size-4" aria-hidden="true" />
						Renvoyer email livraison
					</Button>
				) : null}
				{canMarkAsPaid ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleMarkAsPaid}
					>
						<CreditCard className="size-4" aria-hidden="true" />
						Marquer comme payée
					</Button>
				) : null}
				{canMarkAsProcessing ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleMarkAsProcessing}
					>
						<Package className="size-4" aria-hidden="true" />
						Passer en préparation
					</Button>
				) : null}
				{canMarkAsShipped ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleMarkAsShipped}
					>
						<Truck className="size-4" aria-hidden="true" />
						Marquer comme expédiée
					</Button>
				) : null}
				{canTrack ? (
					<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
						<a href={order.trackingUrl!} target="_blank" rel="noopener noreferrer">
							<ExternalLink className="size-4" aria-hidden="true" />
							Suivre le colis
						</a>
					</Button>
				) : null}
				{canMarkAsDelivered ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleMarkAsDelivered}
					>
						<CircleCheck className="size-4" aria-hidden="true" />
						Marquer comme livrée
					</Button>
				) : null}
				{canRevertToProcessing ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleRevertToProcessing}
					>
						<Undo2 className="size-4" aria-hidden="true" />
						Annuler l&apos;expédition
					</Button>
				) : null}
				{canMarkAsReturned ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={handleMarkAsReturned}
					>
						<PackageX className="size-4" aria-hidden="true" />
						Marquer comme retourné
					</Button>
				) : null}
				{canRefund ? (
					<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
						<Link
							href={`/admin/ventes/remboursements/nouveau?orderId=${order.id}`}
							onClick={() => drawer.close()}
						>
							<RotateCcw className="size-4" aria-hidden="true" />
							Créer un remboursement
						</Link>
					</Button>
				) : null}
				{canCancel ? (
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:text-destructive h-12 justify-start gap-3"
						onClick={handleCancel}
					>
						<CircleX className="size-4" aria-hidden="true" />
						Annuler la commande
					</Button>
				) : null}
				{canDelete ? (
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:text-destructive h-12 justify-start gap-3"
						onClick={handleDelete}
					>
						<Trash2 className="size-4" aria-hidden="true" />
						Supprimer
					</Button>
				) : null}
			</div>
		</AdminItemDrawer>
	);
}
