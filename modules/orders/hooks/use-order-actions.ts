"use client";

import {
	Banknote,
	CircleCheck,
	CircleX,
	CreditCard,
	ExternalLink,
	Eye,
	Package,
	PackageX,
	RotateCcw,
	ShoppingBag,
	StickyNote,
	Trash2,
	Truck,
	Undo2,
} from "lucide-react";

import { useRouter } from "next/navigation";

import {
	OrderStatus,
	PaymentStatus,
	type FulfillmentStatus,
	type InvoiceStatus,
} from "@/app/generated/prisma/browser";
import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { useResendOrderEmail } from "./use-resend-order-email";

import { CANCEL_ORDER_DIALOG_ID } from "../components/admin/cancel-order-alert-dialog";
import { DELETE_ORDER_DIALOG_ID } from "../components/admin/delete-order-alert-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "../components/admin/mark-as-delivered-alert-dialog";
import { MARK_AS_FULLY_REFUNDED_DIALOG_ID } from "../components/admin/mark-as-fully-refunded-alert-dialog";
import { MARK_AS_PAID_DIALOG_ID } from "../components/admin/mark-as-paid-alert-dialog";
import { MARK_AS_PROCESSING_DIALOG_ID } from "../components/admin/mark-as-processing-alert-dialog";
import { MARK_AS_RETURNED_DIALOG_ID } from "../components/admin/mark-as-returned-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "../components/admin/mark-as-shipped-dialog";
import { ORDER_NOTES_DIALOG_ID } from "../components/admin/order-notes-dialog";
import { REVERT_TO_PROCESSING_DIALOG_ID } from "../components/admin/revert-to-processing-dialog";
import { getOrderPermissions } from "../services/order-status-validation.service";
import type { OrderStateInput } from "../types/order.types";

interface UseOrderActionsParams {
	order: {
		id: string;
		orderNumber: string;
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus?: FulfillmentStatus | null;
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
	const markAsFullyRefundedDialog = useAlertDialog(MARK_AS_FULLY_REFUNDED_DIALOG_ID);
	const notesDialog = useDialog(ORDER_NOTES_DIALOG_ID);
	const router = useRouter();
	const isMobile = useIsMobile();

	const openNotes = () => {
		if (isMobile) {
			router.push(`/admin/ventes/commandes/${order.id}/notes`);
		} else {
			notesDialog.open({ orderId: order.id, orderNumber: order.orderNumber });
		}
	};

	const { resend: resendEmail, isPending: isResendingEmail } = useResendOrderEmail();

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
					icon: Eye,
					href: `/admin/ventes/commandes/${order.id}`,
				},
				{
					key: "notes",
					label: "Notes internes",
					icon: StickyNote,
					closesMenu: false,
					onSelect: openNotes,
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
					icon: ShoppingBag,
					disabled: isResendingEmail,
					onSelect: () => resendEmail(order.id, "confirmation"),
				},
				{
					key: "email-shipping",
					label: "Expédition",
					icon: Truck,
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
					icon: CreditCard,
					hidden: !canMarkAsPaid,
					closesMenu: false,
					onSelect: () => markAsPaidDialog.open(open({})),
				},
				{
					key: "mark-processing",
					label: "Passer en préparation",
					icon: Package,
					hidden: !canMarkAsProcessing,
					closesMenu: false,
					onSelect: () => markAsProcessingDialog.open(open({})),
				},
				{
					key: "mark-shipped",
					label: "Marquer comme expédiée",
					icon: Truck,
					hidden: !canMarkAsShipped,
					closesMenu: false,
					onSelect: () => markAsShippedDialog.open(open({})),
				},
				{
					key: "tracking",
					label: "Suivre le colis",
					icon: ExternalLink,
					hidden: !canTrack,
					href: order.trackingUrl ?? "#",
					external: true,
				},
				{
					key: "mark-delivered",
					label: "Marquer comme livrée",
					icon: CircleCheck,
					hidden: !canMarkAsDelivered,
					closesMenu: false,
					onSelect: () => markAsDeliveredDialog.open(open({})),
				},
				{
					key: "revert-processing",
					label: "Annuler l'expédition",
					icon: Undo2,
					hidden: !canRevertToProcessing,
					closesMenu: false,
					onSelect: () =>
						revertToProcessingDialog.open(open({ trackingNumber: order.trackingNumber })),
				},
				{
					key: "mark-returned",
					label: "Marquer comme retourné",
					icon: PackageX,
					hidden: !canMarkAsReturned,
					closesMenu: false,
					onSelect: () => markAsReturnedDialog.open(open({})),
				},
			],
		},
		{
			key: "refund",
			items: [
				{
					key: "refund",
					label: "Créer un remboursement",
					icon: RotateCcw,
					hidden: !canRefund,
					href: `/admin/ventes/remboursements/nouveau?orderId=${order.id}`,
				},
			],
		},
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
					icon: Banknote,
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
					icon: CircleX,
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
					icon: Trash2,
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
