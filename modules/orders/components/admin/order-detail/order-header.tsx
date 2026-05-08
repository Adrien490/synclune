"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { PaymentStatus } from "@/app/generated/prisma/browser";
import {
	CircleCheck,
	CreditCard,
	Download,
	Edit,
	Mail,
	Ellipsis,
	PackageX,
	RotateCcw,
	StickyNote,
	Truck,
	Undo2,
	CircleX,
} from "lucide-react";
import { useActionState } from "react";
import { exportSingleOrder } from "@/modules/orders/actions/export-single-order";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
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
import { getOrderPermissions } from "@/modules/orders/services/order-status-validation.service";
import type { Carrier } from "@/modules/orders/utils/carrier.utils";
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

	const permissions = getOrderPermissions(order);
	const { canMarkAsReturned } = permissions;

	const [, exportAction, isExporting] = useActionState(
		withCallbacks(
			exportSingleOrder,
			createToastCallbacks({
				loadingMessage: "Mise à jour de la commande…",
				onSuccess: (state) => {
					if (!state.csv || !state.filename) return;
					const blob = new Blob([state.csv], { type: "text/csv;charset=utf-8" });
					const url = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = url;
					link.download = state.filename;
					link.click();
					URL.revokeObjectURL(url);
				},
			}),
		),
		undefined,
	);

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
			trackingNumber: order.trackingNumber ?? undefined,
			trackingUrl: order.trackingUrl ?? undefined,
			carrier: order.shippingCarrier as Carrier,
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
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div className="hidden md:block">
				<h1 className="text-2xl font-semibold tracking-tight">Commande {order.orderNumber}</h1>
				<p className="text-muted-foreground text-sm">
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

			{/* Actions : sticky bottom au-dessus de la bottom-bar admin sur mobile,
			 * inline à droite du titre sur desktop. */}
			<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] flex items-center gap-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
				{/* Action primaire contextuelle — full-width mobile, naturelle desktop */}
				{permissions.canMarkAsPaid && (
					<Button size="sm" onClick={handleMarkAsPaid} className="flex-1 md:flex-none">
						<CreditCard className="size-4" aria-hidden="true" />
						Marquer payée
					</Button>
				)}
				{permissions.canMarkAsShipped && (
					<Button size="sm" onClick={handleMarkAsShipped} className="flex-1 md:flex-none">
						<Truck className="size-4" aria-hidden="true" />
						Marquer expédiée
					</Button>
				)}
				{permissions.canMarkAsDelivered && (
					<Button size="sm" onClick={handleMarkAsDelivered} className="flex-1 md:flex-none">
						<CircleCheck className="size-4" aria-hidden="true" />
						Marquer livrée
					</Button>
				)}

				{/* Menu d'actions secondaires */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<Ellipsis className="size-4" aria-hidden="true" />
							<span className="sr-only">Plus d'actions</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-52">
						<DropdownMenuItem onClick={handleOpenNotes}>
							<StickyNote className="size-4" aria-hidden="true" />
							Notes {notesCount > 0 && `(${notesCount})`}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleResendEmail}>
							<Mail className="size-4" aria-hidden="true" />
							Renvoyer un email
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<form action={exportAction}>
								<input type="hidden" name="id" value={order.id} />
								<button
									type="submit"
									disabled={isExporting}
									className="flex w-full items-center gap-2 px-2 py-1.5 text-sm"
								>
									<Download className="size-4" aria-hidden="true" />
									{isExporting ? "Export…" : "Exporter en CSV"}
								</button>
							</form>
						</DropdownMenuItem>
						{permissions.canUpdateTracking && (
							<DropdownMenuItem onClick={handleUpdateTracking}>
								<Edit className="size-4" aria-hidden="true" />
								Modifier le suivi
							</DropdownMenuItem>
						)}
						{permissions.canRefund && (
							<DropdownMenuItem asChild>
								<Link href={`/admin/ventes/remboursements/nouveau?orderId=${order.id}`}>
									<RotateCcw className="size-4" aria-hidden="true" />
									Créer un remboursement
								</Link>
							</DropdownMenuItem>
						)}
						{canMarkAsReturned && (
							<DropdownMenuItem onClick={handleMarkAsReturned}>
								<PackageX className="size-4" aria-hidden="true" />
								Marquer retournée
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						{permissions.canRevertToProcessing && (
							<DropdownMenuItem
								onClick={handleRevertToProcessing}
								className="text-destructive focus:text-destructive"
							>
								<Undo2 className="size-4" aria-hidden="true" />
								Annuler l'expédition
							</DropdownMenuItem>
						)}
						{permissions.canCancel && (
							<DropdownMenuItem
								onClick={handleCancel}
								className="text-destructive focus:text-destructive"
							>
								<CircleX className="size-4" aria-hidden="true" />
								Annuler la commande
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}
