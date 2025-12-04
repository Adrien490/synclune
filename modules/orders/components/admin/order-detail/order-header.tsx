"use client";

import { ViewTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/browser";
import {
	CheckCircle,
	CreditCard,
	Edit,
	Mail,
	MoreHorizontal,
	PackageX,
	RotateCcw,
	StickyNote,
	Truck,
	Undo2,
	XCircle,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { CANCEL_ORDER_DIALOG_ID } from "../cancel-order-alert-dialog";
import { MARK_AS_PAID_DIALOG_ID } from "../mark-as-paid-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "../mark-as-shipped-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "../mark-as-delivered-alert-dialog";
import { UPDATE_TRACKING_DIALOG_ID } from "../update-tracking-dialog";
import { ORDER_NOTES_DIALOG_ID } from "../order-notes-dialog";
import { RESEND_EMAIL_DIALOG_ID } from "../resend-email-dialog";
import { MARK_AS_RETURNED_DIALOG_ID } from "../mark-as-returned-alert-dialog";
import { REVERT_TO_PROCESSING_DIALOG_ID } from "../revert-to-processing-dialog";
import type { Carrier } from "@/modules/orders/utils/carrier-detection";
import type { OrderHeaderProps } from "./types";

export function OrderHeader({ order, notesCount }: OrderHeaderProps) {
	const cancelDialog = useAlertDialog(CANCEL_ORDER_DIALOG_ID);
	const markAsPaidDialog = useAlertDialog(MARK_AS_PAID_DIALOG_ID);
	const markAsShippedDialog = useAlertDialog(MARK_AS_SHIPPED_DIALOG_ID);
	const markAsDeliveredDialog = useAlertDialog(MARK_AS_DELIVERED_DIALOG_ID);
	const updateTrackingDialog = useAlertDialog(UPDATE_TRACKING_DIALOG_ID);
	const notesDialog = useDialog(ORDER_NOTES_DIALOG_ID);
	const resendEmailDialog = useDialog(RESEND_EMAIL_DIALOG_ID);
	const markAsReturnedDialog = useAlertDialog(MARK_AS_RETURNED_DIALOG_ID);
	const revertToProcessingDialog = useAlertDialog(REVERT_TO_PROCESSING_DIALOG_ID);

	// State machine conditions
	const isPending = order.status === OrderStatus.PENDING;
	const isProcessing = order.status === OrderStatus.PROCESSING;
	const isShipped = order.status === OrderStatus.SHIPPED;
	const isDelivered = order.status === OrderStatus.DELIVERED;
	const isCancelled = order.status === OrderStatus.CANCELLED;

	const isPaid = order.paymentStatus === PaymentStatus.PAID;
	const isUnpaid = order.paymentStatus === PaymentStatus.PENDING;

	const canMarkAsPaid = isPending && isUnpaid;
	const canCancel = !isCancelled && !isDelivered;
	const canMarkAsShipped = isProcessing && isPaid;
	const canMarkAsDelivered = isShipped;
	const canRefund = (isProcessing || isShipped || isDelivered) && isPaid;
	const canUpdateTracking = (isShipped || isDelivered) && order.trackingNumber;
	const canMarkAsReturned = isDelivered && order.fulfillmentStatus !== FulfillmentStatus.RETURNED;
	const canRevertToProcessing = isShipped;

	// Handlers
	const handleMarkAsPaid = () => {
		markAsPaidDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleMarkAsShipped = () => {
		markAsShippedDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleMarkAsDelivered = () => {
		markAsDeliveredDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleCancel = () => {
		cancelDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			isPaid: order.paymentStatus === PaymentStatus.PAID,
		});
	};

	const handleUpdateTracking = () => {
		updateTrackingDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			trackingNumber: order.trackingNumber || undefined,
			trackingUrl: order.trackingUrl || undefined,
			carrier: (order.shippingCarrier as Carrier) || undefined,
			estimatedDelivery: order.estimatedDelivery || undefined,
		});
	};

	const handleOpenNotes = () => {
		notesDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleResendEmail = () => {
		resendEmailDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			orderStatus: order.status,
			fulfillmentStatus: order.fulfillmentStatus,
		});
	};

	const handleMarkAsReturned = () => {
		markAsReturnedDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleRevertToProcessing = () => {
		revertToProcessingDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
			trackingNumber: order.trackingNumber,
		});
	};

	return (
		<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
			<div>
				<ViewTransition name={`admin-order-${order.id}`} default="vt-title">
					<h1 className="text-2xl font-semibold tracking-tight">
						Commande {order.orderNumber}
					</h1>
				</ViewTransition>
				<p className="text-sm text-muted-foreground">
					Créée le{" "}
					{format(order.createdAt, "d MMMM yyyy 'à' HH'h'mm", {
						locale: fr,
					})}
					<span className="text-muted-foreground/70">
						{" "}
						({formatDistanceToNow(order.createdAt, { addSuffix: true, locale: fr })})
					</span>
				</p>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2">
				{/* Action primaire contextuelle */}
				{canMarkAsPaid && (
					<Button size="sm" onClick={handleMarkAsPaid}>
						<CreditCard className="h-4 w-4" aria-hidden="true" />
						Marquer payée
					</Button>
				)}
				{canMarkAsShipped && (
					<Button size="sm" onClick={handleMarkAsShipped}>
						<Truck className="h-4 w-4" aria-hidden="true" />
						Marquer expédiée
					</Button>
				)}
				{canMarkAsDelivered && (
					<Button size="sm" onClick={handleMarkAsDelivered}>
						<CheckCircle className="h-4 w-4" aria-hidden="true" />
						Marquer livrée
					</Button>
				)}

				{/* Menu d'actions secondaires */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<MoreHorizontal className="h-4 w-4" aria-hidden="true" />
							<span className="sr-only">Plus d'actions</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-52">
						<DropdownMenuItem onClick={handleOpenNotes}>
							<StickyNote className="h-4 w-4" aria-hidden="true" />
							Notes {notesCount > 0 && `(${notesCount})`}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleResendEmail}>
							<Mail className="h-4 w-4" aria-hidden="true" />
							Renvoyer un email
						</DropdownMenuItem>
						{canUpdateTracking && (
							<DropdownMenuItem onClick={handleUpdateTracking}>
								<Edit className="h-4 w-4" aria-hidden="true" />
								Modifier le suivi
							</DropdownMenuItem>
						)}
						{canRefund && (
							<DropdownMenuItem asChild>
								<Link href={`/admin/ventes/remboursements/nouveau?orderId=${order.id}`}>
									<RotateCcw className="h-4 w-4" aria-hidden="true" />
									Créer un remboursement
								</Link>
							</DropdownMenuItem>
						)}
						{canMarkAsReturned && (
							<DropdownMenuItem onClick={handleMarkAsReturned}>
								<PackageX className="h-4 w-4" aria-hidden="true" />
								Marquer retournée
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						{canRevertToProcessing && (
							<DropdownMenuItem
								onClick={handleRevertToProcessing}
								className="text-destructive focus:text-destructive"
							>
								<Undo2 className="h-4 w-4" aria-hidden="true" />
								Annuler l'expédition
							</DropdownMenuItem>
						)}
						{canCancel && (
							<DropdownMenuItem
								onClick={handleCancel}
								className="text-destructive focus:text-destructive"
							>
								<XCircle className="h-4 w-4" aria-hidden="true" />
								Annuler la commande
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
