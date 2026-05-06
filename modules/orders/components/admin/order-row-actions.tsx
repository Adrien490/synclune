"use client";

import {
	CircleCheck,
	CircleX,
	CreditCard,
	EllipsisVertical,
	ExternalLink,
	Eye,
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

import { OrderStatus, PaymentStatus, type FulfillmentStatus } from "@/app/generated/prisma/browser";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useResendOrderEmail } from "@/modules/orders/hooks/use-resend-order-email";
import { getOrderPermissions } from "@/modules/orders/services/order-status-validation.service";
import type { OrderStateInput } from "@/modules/orders/types/order.types";

import { CANCEL_ORDER_DIALOG_ID } from "./cancel-order-alert-dialog";
import { DELETE_ORDER_DIALOG_ID } from "./delete-order-alert-dialog";
import { MARK_AS_DELIVERED_DIALOG_ID } from "./mark-as-delivered-alert-dialog";
import { MARK_AS_PAID_DIALOG_ID } from "./mark-as-paid-alert-dialog";
import { MARK_AS_PROCESSING_DIALOG_ID } from "./mark-as-processing-alert-dialog";
import { MARK_AS_RETURNED_DIALOG_ID } from "./mark-as-returned-alert-dialog";
import { MARK_AS_SHIPPED_DIALOG_ID } from "./mark-as-shipped-dialog";
import { ORDER_NOTES_DIALOG_ID } from "./order-notes-dialog";
import { REVERT_TO_PROCESSING_DIALOG_ID } from "./revert-to-processing-dialog";

interface OrderRowActionsProps {
	order: {
		id: string;
		orderNumber: string;
		status: OrderStatus;
		paymentStatus: PaymentStatus;
		fulfillmentStatus?: FulfillmentStatus | null;
		trackingNumber?: string | null;
		trackingUrl?: string | null;
		invoiceNumber?: string | null;
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
	} = permissions;

	const canTrack = isShipped && order.trackingUrl;
	const canDelete =
		!order.invoiceNumber &&
		order.paymentStatus !== PaymentStatus.PAID &&
		order.paymentStatus !== PaymentStatus.REFUNDED;

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
					onSelect: () => notesDialog.open(open({})),
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
				{
					key: "email-delivery",
					label: "Livraison",
					icon: PackageCheck,
					disabled: isResendingEmail,
					hidden: !isDelivered,
					onSelect: () => resendEmail(order.id, "delivery"),
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
					onSelect: () => markAsPaidDialog.open(open({})),
				},
				{
					key: "mark-processing",
					label: "Passer en préparation",
					icon: Package,
					hidden: !canMarkAsProcessing,
					onSelect: () => markAsProcessingDialog.open(open({})),
				},
				{
					key: "mark-shipped",
					label: "Marquer comme expédiée",
					icon: Truck,
					hidden: !canMarkAsShipped,
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
					onSelect: () => markAsDeliveredDialog.open(open({})),
				},
				{
					key: "revert-processing",
					label: "Annuler l'expédition",
					icon: Undo2,
					hidden: !canRevertToProcessing,
					onSelect: () =>
						revertToProcessingDialog.open(open({ trackingNumber: order.trackingNumber })),
				},
				{
					key: "mark-returned",
					label: "Marquer comme retourné",
					icon: PackageX,
					hidden: !canMarkAsReturned,
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
					key: "cancel",
					label: "Annuler la commande",
					icon: CircleX,
					variant: "destructive",
					hidden: !canCancel,
					onSelect: () =>
						cancelDialog.open({
							orderId: order.id,
							orderNumber: order.orderNumber,
							isPaid: order.paymentStatus === PaymentStatus.PAID,
						}),
				},
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					hidden: !canDelete,
					onSelect: () => deleteDialog.open(open({})),
				},
			],
		},
	];

	return (
		<ResponsiveActionMenu>
			<ResponsiveActionMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-11 w-11 p-0 transition-transform active:scale-95"
					aria-label={`Actions pour la commande ${order.orderNumber}`}
				>
					<EllipsisVertical className="h-4 w-4" />
				</Button>
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent
				title="Actions"
				description={`Commande ${order.orderNumber}`}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
