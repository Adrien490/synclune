"use client";

import {
	ArrowArcLeftIcon,
	ArrowSquareOutIcon,
	ArrowUUpLeftIcon,
	CheckCircleIcon,
	CreditCardIcon,
	EyeIcon,
	MoneyIcon,
	PackageIcon,
	ShoppingBagIcon,
	TrashIcon,
	TruckIcon,
	XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { OrderStatus, PaymentStatus, type InvoiceStatus } from "@/app/generated/prisma/browser";
import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { useResendOrderEmail } from "./use-resend-order-email";

import { CANCEL_ORDER_DIALOG_ID } from "../components/admin/cancel-order-alert-dialog";
import { DELETE_ORDER_DIALOG_ID } from "../components/admin/delete-order-alert-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "../components/admin/mark-as-delivered-alert-dialog";
import { MARK_AS_FULLY_REFUNDED_DIALOG_ID } from "../components/admin/mark-as-fully-refunded-alert-dialog";
import { MARK_AS_PAID_DIALOG_ID } from "../components/admin/mark-as-paid-alert-dialog";
import { MARK_AS_PROCESSING_DIALOG_ID } from "../components/admin/mark-as-processing-alert-dialog";
import { MARK_AS_RETURNED_DIALOG_ID } from "../components/admin/mark-as-returned-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "../components/admin/mark-as-shipped-dialog";
import { REVERT_TO_PROCESSING_DIALOG_ID } from "../components/admin/revert-to-processing-dialog";
import { UNDO_RETURN_DIALOG_ID } from "../components/admin/undo-return-alert-dialog";
import { getOrderPermissions } from "../services/order-status-validation.service";
import type { OrderStateInput } from "../types/order.types";

interface UseOrderActionsParams {
	order: {
		id: string;
		orderNumber: string;
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		trackingNumber?: string | null;
		trackingUrl?: string | null;
		invoiceNumber?: string | null;
		invoiceStatus?: InvoiceStatus | null;
	};
}

export function useOrderActions({ order }: UseOrderActionsParams): {
	sections: ActionMenuSection[];
} {
	const cancelDialog = useAlertDialog(CANCEL_ORDER_DIALOG_ID);
	const deleteDialog = useAlertDialog(DELETE_ORDER_DIALOG_ID);
	const markAsPaidDialog = useAlertDialog(MARK_AS_PAID_DIALOG_ID);
	const markAsShippedDialog = useAlertDialog(MARK_AS_SHIPPED_DIALOG_ID);
	const markAsDeliveredDialog = useAlertDialog(MARK_AS_DELIVERED_DIALOG_ID);
	const markAsProcessingDialog = useAlertDialog(MARK_AS_PROCESSING_DIALOG_ID);
	const revertToProcessingDialog = useAlertDialog(REVERT_TO_PROCESSING_DIALOG_ID);
	const markAsReturnedDialog = useAlertDialog(MARK_AS_RETURNED_DIALOG_ID);
	const undoReturnDialog = useAlertDialog(UNDO_RETURN_DIALOG_ID);
	const markAsFullyRefundedDialog = useAlertDialog(MARK_AS_FULLY_REFUNDED_DIALOG_ID);

	const { resend: resendEmail, isPending: isResendingEmail } = useResendOrderEmail();

	const permissions = getOrderPermissions(order as unknown as OrderStateInput);
	const isShipped = order.status === OrderStatus.SHIPPED;
	const isDelivered = order.status === OrderStatus.DELIVERED;

	const {
		canMarkAsPaid,
		canCancel,
		canMarkAsShipped,
		canMarkAsDelivered,
		canMarkAsProcessing,
		canRevertToProcessing,
		canMarkAsReturned,
		canUndoReturn,
		canMarkAsFullyRefunded,
		canDelete,
	} = permissions;

	const canTrack = (isShipped || isDelivered) && order.trackingUrl;

	const open = (data: object) => ({ orderId: order.id, orderNumber: order.orderNumber, ...data });

	const sections: ActionMenuSection[] = [
		{
			key: "info",
			items: [
				{
					key: "view",
					label: "Voir les détails",
					icon: EyeIcon,
					href: `/admin/ventes/commandes/${order.id}`,
				},
			],
		},
		{
			key: "emails",
			label: "Renvoyer un email",
			items: [
				{
					key: "email-confirmation",
					label: "Confirmation de commande",
					icon: ShoppingBagIcon,
					disabled: isResendingEmail,
					onSelect: () => resendEmail(order.id, "confirmation"),
				},
				{
					key: "email-shipping",
					label: "Expédition",
					icon: TruckIcon,
					disabled: isResendingEmail,
					hidden: !((isShipped || isDelivered) && order.trackingNumber),
					onSelect: () => resendEmail(order.id, "shipping"),
				},
			],
		},
		{
			key: "fulfillment",
			label: "Fulfillment",
			items: [
				{
					key: "mark-paid",
					label: "Marquer comme payée",
					icon: CreditCardIcon,
					hidden: !canMarkAsPaid,
					closesMenu: false,
					onSelect: () => markAsPaidDialog.open(open({})),
				},
				{
					key: "mark-processing",
					label: "Passer en préparation",
					icon: PackageIcon,
					hidden: !canMarkAsProcessing,
					closesMenu: false,
					onSelect: () => markAsProcessingDialog.open(open({})),
				},
				{
					key: "mark-shipped",
					label: "Marquer comme expédiée",
					icon: TruckIcon,
					hidden: !canMarkAsShipped,
					closesMenu: false,
					onSelect: () => markAsShippedDialog.open(open({})),
				},
				{
					key: "tracking",
					label: "Suivre le colis",
					icon: ArrowSquareOutIcon,
					hidden: !canTrack,
					href: order.trackingUrl ?? "#",
					external: true,
				},
				{
					key: "mark-delivered",
					label: "Marquer comme livrée",
					icon: CheckCircleIcon,
					hidden: !canMarkAsDelivered,
					closesMenu: false,
					onSelect: () => markAsDeliveredDialog.open(open({})),
				},
				{
					key: "revert-processing",
					label: "Annuler l'expédition",
					icon: ArrowUUpLeftIcon,
					hidden: !canRevertToProcessing,
					closesMenu: false,
					onSelect: () =>
						revertToProcessingDialog.open(open({ trackingNumber: order.trackingNumber })),
				},
				{
					key: "mark-returned",
					label: "Marquer comme retourné",
					icon: ArrowArcLeftIcon,
					hidden: !canMarkAsReturned,
					closesMenu: false,
					onSelect: () => markAsReturnedDialog.open(open({})),
				},
				{
					key: "undo-return",
					label: "Annuler le retour",
					icon: ArrowUUpLeftIcon,
					hidden: !canUndoReturn,
					closesMenu: false,
					onSelect: () => undoReturnDialog.open(open({})),
				},
			],
		},
		// Plus d'entrée « Créer un remboursement » : le remboursement se fait dans
		// le dashboard Stripe (Lot 2 S3.3) — l'affordance vit sur OrderRefundsCard,
		// qui porte le lien externe vers le PaymentIntent.
		{
			key: "danger",
			items: [
				{
					// Section `danger` et non `refund` : contrairement à « Créer un
					// remboursement » (réversible, passe par Stripe), marquer une commande
					// facturée comme remboursée hors Stripe ANNULE la facture et émet un
					// avoir gap-free — irréversible, conséquence comptable (Art. 272-I CGI).
					// Était en plus dupliqué en bouton `outline` dans le header de
					// `OrderRefundsCard`, au même niveau visuel qu'un « Modifier ».
					key: "mark-fully-refunded",
					label: "Marquer comme remboursée (hors Stripe)",
					icon: MoneyIcon,
					variant: "destructive",
					hidden: !canMarkAsFullyRefunded,
					closesMenu: false,
					onSelect: () =>
						markAsFullyRefundedDialog.open(
							open({
								invoiceStatus: order.invoiceStatus ?? null,
								invoiceNumber: order.invoiceNumber ?? null,
							}),
						),
				},
				{
					key: "cancel",
					label: "Annuler la commande",
					icon: XCircleIcon,
					variant: "destructive",
					hidden: !canCancel,
					closesMenu: false,
					onSelect: () =>
						cancelDialog.open({
							orderId: order.id,
							orderNumber: order.orderNumber,
							isPaid: order.paymentStatus === PaymentStatus.PAID,
							invoiceStatus: order.invoiceStatus ?? null,
							invoiceNumber: order.invoiceNumber ?? null,
						}),
				},
				{
					key: "delete",
					label: "Supprimer",
					icon: TrashIcon,
					variant: "destructive",
					hidden: !canDelete,
					closesMenu: false,
					onSelect: () => deleteDialog.open(open({})),
				},
			],
		},
	];

	return { sections };
}
