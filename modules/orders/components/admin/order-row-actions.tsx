"use client";

import { OrderStatus, PaymentStatus, FulfillmentStatus } from "@/app/generated/prisma/browser";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import {
	CheckCircle,
	CreditCard,
	Eye,
	ExternalLink,
	Mail,
	MoreVertical,
	Package,
	PackageCheck,
	PackageX,
	RotateCcw,
	ShoppingBag,
	StickyNote,
	Trash2,
	Truck,
	Undo2,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useResendOrderEmail } from "@/modules/orders/hooks/use-resend-order-email";
import { CANCEL_ORDER_DIALOG_ID } from "./cancel-order-alert-dialog";
import { DELETE_ORDER_DIALOG_ID } from "./delete-order-alert-dialog";
import { MARK_AS_PAID_DIALOG_ID } from "./mark-as-paid-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "./mark-as-shipped-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "./mark-as-delivered-alert-dialog";
import { MARK_AS_PROCESSING_DIALOG_ID } from "./mark-as-processing-alert-dialog";
import { REVERT_TO_PROCESSING_DIALOG_ID } from "./revert-to-processing-dialog";
import { MARK_AS_RETURNED_DIALOG_ID } from "./mark-as-returned-alert-dialog";
import { ORDER_NOTES_DIALOG_ID } from "./order-notes-dialog";

interface OrderRowActionsProps {
	order: {
		id: string;
		orderNumber: string;
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus?: FulfillmentStatus | null;
		trackingNumber?: string | null;
		trackingUrl?: string | null;
	};
}

export function OrderRowActions({ order }: OrderRowActionsProps) {
	const cancelDialog = useAlertDialog(CANCEL_ORDER_DIALOG_ID);
	const deleteDialog = useAlertDialog(DELETE_ORDER_DIALOG_ID);
	const markAsPaidDialog = useAlertDialog(MARK_AS_PAID_DIALOG_ID);
	const markAsShippedDialog = useAlertDialog(MARK_AS_SHIPPED_DIALOG_ID);
	const markAsDeliveredDialog = useAlertDialog(MARK_AS_DELIVERED_DIALOG_ID);
	const markAsProcessingDialog = useAlertDialog(MARK_AS_PROCESSING_DIALOG_ID);
	const revertToProcessingDialog = useAlertDialog(REVERT_TO_PROCESSING_DIALOG_ID);
	const markAsReturnedDialog = useAlertDialog(MARK_AS_RETURNED_DIALOG_ID);
	const notesDialog = useDialog(ORDER_NOTES_DIALOG_ID);

	// Hook pour renvoyer les emails
	const { resend: resendEmail, isPending: isResendingEmail } = useResendOrderEmail();

	// =========================================================================
	// STATE MACHINE CONDITIONS
	// =========================================================================

	const isPending = order.status === OrderStatus.PENDING;
	const isProcessing = order.status === OrderStatus.PROCESSING;
	const isShipped = order.status === OrderStatus.SHIPPED;
	const isDelivered = order.status === OrderStatus.DELIVERED;
	const isCancelled = order.status === OrderStatus.CANCELLED;

	const isPaid = order.paymentStatus === PaymentStatus.PAID;
	const isUnpaid = order.paymentStatus === PaymentStatus.PENDING;

	// Actions disponibles par statut
	const canMarkAsPaid = isPending && isUnpaid;
	const canCancel = !isCancelled && !isDelivered;
	const canMarkAsShipped = isProcessing && isPaid;
	const canMarkAsDelivered = isShipped;
	const canTrack = isShipped && order.trackingUrl;
	const canRefund = (isProcessing || isShipped || isDelivered) && isPaid;

	// Une commande peut être supprimée si :
	// - Jamais payée (ni PAID ni REFUNDED)
	const canDelete =
		order.paymentStatus !== PaymentStatus.PAID &&
		order.paymentStatus !== PaymentStatus.REFUNDED;

	// Nouvelles actions
	const canMarkAsProcessing = isPending && isPaid;
	const canRevertToProcessing = isShipped;
	const canMarkAsReturned =
		isDelivered && order.fulfillmentStatus !== FulfillmentStatus.RETURNED;

	// =========================================================================
	// HANDLERS
	// =========================================================================

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

	const handleDelete = () => {
		deleteDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleMarkAsProcessing = () => {
		markAsProcessingDialog.open({
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

	const handleMarkAsReturned = () => {
		markAsReturnedDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	const handleOpenNotes = () => {
		notesDialog.open({
			orderId: order.id,
			orderNumber: order.orderNumber,
		});
	};

	// =========================================================================
	// RENDER
	// =========================================================================

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0 active:scale-95 transition-transform" aria-label="Actions">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
					{order.orderNumber}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{/* Toujours visible : Voir */}
				<DropdownMenuItem asChild>
					<Link href={`/admin/ventes/commandes/${order.id}`}>
						<Eye className="h-4 w-4" />
						Voir les détails
					</Link>
				</DropdownMenuItem>

				{/* Notes internes */}
				<DropdownMenuItem onClick={handleOpenNotes}>
					<StickyNote className="h-4 w-4" />
					Notes internes
				</DropdownMenuItem>

				{/* Renvoyer un email */}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger disabled={isResendingEmail}>
						<Mail className="h-4 w-4" />
						Renvoyer un email
					</DropdownMenuSubTrigger>
					<DropdownMenuPortal>
						<DropdownMenuSubContent>
							<DropdownMenuItem
								onClick={() => resendEmail(order.id, "confirmation")}
								disabled={isResendingEmail}
							>
								<ShoppingBag className="h-4 w-4" />
								Confirmation de commande
							</DropdownMenuItem>
							{(isShipped || isDelivered) && order.trackingNumber && (
								<DropdownMenuItem
									onClick={() => resendEmail(order.id, "shipping")}
									disabled={isResendingEmail}
								>
									<Truck className="h-4 w-4" />
									Expédition
								</DropdownMenuItem>
							)}
							{isDelivered && (
								<DropdownMenuItem
									onClick={() => resendEmail(order.id, "delivery")}
									disabled={isResendingEmail}
								>
									<PackageCheck className="h-4 w-4" />
									Livraison
								</DropdownMenuItem>
							)}
						</DropdownMenuSubContent>
					</DropdownMenuPortal>
				</DropdownMenuSub>

				{/* PENDING : Marquer comme payée */}
				{canMarkAsPaid && (
					<DropdownMenuItem onClick={handleMarkAsPaid}>
						<CreditCard className="h-4 w-4" />
						Marquer comme payée
					</DropdownMenuItem>
				)}

				{/* PENDING + PAID : Passer en préparation */}
				{canMarkAsProcessing && (
					<DropdownMenuItem onClick={handleMarkAsProcessing}>
						<Package className="h-4 w-4" />
						Passer en préparation
					</DropdownMenuItem>
				)}

				{/* PROCESSING : Marquer comme expédiée */}
				{canMarkAsShipped && (
					<DropdownMenuItem onClick={handleMarkAsShipped}>
						<Truck className="h-4 w-4" />
						Marquer comme expédiée
					</DropdownMenuItem>
				)}

				{/* SHIPPED : Suivre le colis */}
				{canTrack && (
					<DropdownMenuItem asChild>
						<a
							href={order.trackingUrl!}
							target="_blank"
							rel="noopener noreferrer"
						>
							<ExternalLink className="h-4 w-4" />
							Suivre le colis
						</a>
					</DropdownMenuItem>
				)}

				{/* SHIPPED : Marquer comme livrée */}
				{canMarkAsDelivered && (
					<DropdownMenuItem onClick={handleMarkAsDelivered}>
						<CheckCircle className="h-4 w-4" />
						Marquer comme livrée
					</DropdownMenuItem>
				)}

				{/* SHIPPED : Annuler l'expédition */}
				{canRevertToProcessing && (
					<DropdownMenuItem onClick={handleRevertToProcessing}>
						<Undo2 className="h-4 w-4" />
						Annuler l'expédition
					</DropdownMenuItem>
				)}

				{/* DELIVERED : Marquer comme retourné */}
				{canMarkAsReturned && (
					<DropdownMenuItem onClick={handleMarkAsReturned}>
						<PackageX className="h-4 w-4" />
						Marquer comme retourné
					</DropdownMenuItem>
				)}

				{/* PROCESSING/SHIPPED/DELIVERED : Remboursement */}
				{canRefund && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link href={`/admin/ventes/remboursements/nouveau?orderId=${order.id}`}>
								<RotateCcw className="h-4 w-4" />
								Créer un remboursement
							</Link>
						</DropdownMenuItem>
					</>
				)}

				{/* Annulation */}
				{canCancel && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleCancel}
							className="text-destructive focus:text-destructive"
						>
							<XCircle className="h-4 w-4" />
							Annuler la commande
						</DropdownMenuItem>
					</>
				)}

				{/* Suppression (seulement si aucune facture et jamais payée) */}
				{canDelete && (
					<DropdownMenuItem
						onClick={handleDelete}
						className="text-destructive focus:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				)}

				{/* CANCELLED : Actions limitées */}
				{isCancelled && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link href={`/admin/ventes/commandes/${order.id}`}>
								<Package className="h-4 w-4" />
								Voir les détails
							</Link>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
