"use client";

import { Check, CircleX, CreditCard, Eye, Trash2 } from "lucide-react";

import { RefundStatus } from "@/app/generated/prisma/browser";
import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useBulkSelectionActionItem } from "@/shared/hooks/use-bulk-selection-action-item";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { APPROVE_REFUND_DIALOG_ID } from "../components/admin/approve-refund-alert-dialog";
import { CANCEL_REFUND_DIALOG_ID } from "../components/admin/cancel-refund-alert-dialog";
import { PROCESS_REFUND_DIALOG_ID } from "../components/admin/process-refund-alert-dialog";
import { REJECT_REFUND_DIALOG_ID } from "../components/admin/reject-refund-alert-dialog";

interface UseRefundActionsParams {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		orderId: string;
		orderNumber: string;
	};
}

export function useRefundActions({ refund }: UseRefundActionsParams): {
	sections: ActionMenuSection[];
} {
	const approveDialog = useAlertDialog(APPROVE_REFUND_DIALOG_ID);
	const processDialog = useAlertDialog(PROCESS_REFUND_DIALOG_ID);
	const rejectDialog = useAlertDialog(REJECT_REFUND_DIALOG_ID);
	const cancelDialog = useAlertDialog(CANCEL_REFUND_DIALOG_ID);
	const selectActionItem = useBulkSelectionActionItem(refund.id);

	const canApprove = refund.status === RefundStatus.PENDING;
	const canProcess = refund.status === RefundStatus.APPROVED;
	const canReject = refund.status === RefundStatus.PENDING;
	const canCancel =
		refund.status === RefundStatus.PENDING || refund.status === RefundStatus.APPROVED;

	const payload = {
		refundId: refund.id,
		amount: refund.amount,
		orderNumber: refund.orderNumber,
	};

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
				...(selectActionItem ? [selectActionItem] : []),
				{
					key: "detail",
					label: "Voir le détail",
					icon: Eye,
					href: `/admin/ventes/remboursements/${refund.id}`,
				},
				{
					key: "order",
					label: "Voir la commande",
					icon: Eye,
					href: `/admin/ventes/commandes/${refund.orderId}`,
				},
			],
		},
		{
			key: "decision",
			items: [
				{
					key: "approve",
					label: "Approuver",
					icon: Check,
					hidden: !canApprove,
					closesMenu: false,
					onSelect: () => approveDialog.open(payload),
				},
				{
					key: "process",
					label: "Traiter le remboursement",
					icon: CreditCard,
					hidden: !canProcess,
					closesMenu: false,
					onSelect: () => processDialog.open(payload),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "reject",
					label: "Refuser",
					icon: CircleX,
					variant: "destructive",
					hidden: !canReject,
					closesMenu: false,
					onSelect: () => rejectDialog.open(payload),
				},
				{
					key: "cancel",
					label: "Annuler la demande",
					icon: Trash2,
					variant: "destructive",
					hidden: !canCancel,
					closesMenu: false,
					onSelect: () => cancelDialog.open(payload),
				},
			],
		},
	];

	return { sections };
}
