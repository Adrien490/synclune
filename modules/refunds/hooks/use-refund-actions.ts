"use client";

import { Check, CircleX, CreditCard, Eye, RotateCcw, Trash2 } from "lucide-react";

import { RefundStatus } from "@/app/generated/prisma/browser";
import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { APPROVE_REFUND_DIALOG_ID } from "../components/admin/approve-refund-alert-dialog";
import { CANCEL_REFUND_DIALOG_ID } from "../components/admin/cancel-refund-alert-dialog";
import { PROCESS_REFUND_DIALOG_ID } from "../components/admin/process-refund-alert-dialog";
import { REJECT_REFUND_DIALOG_ID } from "../components/admin/reject-refund-alert-dialog";
import { RETRY_REFUND_DIALOG_ID } from "../components/admin/retry-refund-alert-dialog";

interface UseRefundActionsParams {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		orderId: string;
		orderNumber: string;
		/** Affiché dans le dialog de relance d'un refund FAILED. */
		failureReason?: string | null;
	};
}

export function useRefundActions({ refund }: UseRefundActionsParams): {
	sections: ActionMenuSection[];
} {
	const approveDialog = useAlertDialog(APPROVE_REFUND_DIALOG_ID);
	const processDialog = useAlertDialog(PROCESS_REFUND_DIALOG_ID);
	const rejectDialog = useAlertDialog(REJECT_REFUND_DIALOG_ID);
	const cancelDialog = useAlertDialog(CANCEL_REFUND_DIALOG_ID);
	const retryDialog = useAlertDialog(RETRY_REFUND_DIALOG_ID);

	const canApprove = refund.status === RefundStatus.PENDING;
	const canProcess = refund.status === RefundStatus.APPROVED;
	const canReject = refund.status === RefundStatus.PENDING;
	const canCancel =
		refund.status === RefundStatus.PENDING || refund.status === RefundStatus.APPROVED;
	// P2 (audit 2026-08-01) : retryFailedRefund existait (FAILED → APPROVED +
	// rotation attemptCount + adoption IDEM-REFUND-001) mais n'avait AUCUN point
	// d'entrée UI — l'admin recréait un refund complet, second Refund orphelin.
	const canRetry = refund.status === RefundStatus.FAILED;

	const payload = {
		refundId: refund.id,
		amount: refund.amount,
		orderNumber: refund.orderNumber,
	};

	const sections: ActionMenuSection[] = [
		{
			key: "navigate",
			items: [
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
				{
					key: "retry",
					label: "Relancer le remboursement",
					icon: RotateCcw,
					hidden: !canRetry,
					closesMenu: false,
					onSelect: () => retryDialog.open({ ...payload, failureReason: refund.failureReason }),
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
