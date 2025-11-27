"use client";

import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/browser";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import {
	CheckCircle,
	CreditCard,
	Eye,
	ExternalLink,
	MoreVertical,
	Package,
	RotateCcw,
	Trash2,
	Truck,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { CANCEL_ORDER_DIALOG_ID } from "./cancel-order-alert-dialog";
import { DELETE_ORDER_DIALOG_ID } from "./delete-order-alert-dialog";
import { MARK_AS_PAID_DIALOG_ID } from "./mark-as-paid-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "./mark-as-shipped-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "./mark-as-delivered-alert-dialog";

interface OrderRowActionsProps {
	order: {
		id: string;
		orderNumber: string;
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		invoiceNumber: string | null;
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
	// - Pas de facture émise
	// - Jamais payée (ni PAID ni REFUNDED)
	const canDelete =
		order.invoiceNumber === null &&
		order.paymentStatus !== PaymentStatus.PAID &&
		order.paymentStatus !== PaymentStatus.REFUNDED;

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

	// =========================================================================
	// RENDER
	// =========================================================================

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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

				{/* PENDING : Marquer comme payée */}
				{canMarkAsPaid && (
					<DropdownMenuItem onClick={handleMarkAsPaid}>
						<CreditCard className="h-4 w-4" />
						Marquer comme payée
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
