"use client";

import { Check, CircleX, CreditCard, EllipsisVertical, Eye, Trash2 } from "lucide-react";

import { RefundStatus } from "@/app/generated/prisma/browser";
import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { APPROVE_REFUND_DIALOG_ID } from "./approve-refund-alert-dialog";
import { CANCEL_REFUND_DIALOG_ID } from "./cancel-refund-alert-dialog";
import { PROCESS_REFUND_DIALOG_ID } from "./process-refund-alert-dialog";
import { REJECT_REFUND_DIALOG_ID } from "./reject-refund-alert-dialog";

interface RefundRowActionsProps {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		orderId: string;
		orderNumber: string;
	};
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	hideTrigger?: boolean;
}

export function RefundRowActions({
	refund,
	open,
	onOpenChange,
	hideTrigger,
}: RefundRowActionsProps) {
	const approveDialog = useAlertDialog(APPROVE_REFUND_DIALOG_ID);
	const processDialog = useAlertDialog(PROCESS_REFUND_DIALOG_ID);
	const rejectDialog = useAlertDialog(REJECT_REFUND_DIALOG_ID);
	const cancelDialog = useAlertDialog(CANCEL_REFUND_DIALOG_ID);

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
					onSelect: () => approveDialog.open(payload),
				},
				{
					key: "process",
					label: "Traiter le remboursement",
					icon: CreditCard,
					hidden: !canProcess,
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
					onSelect: () => rejectDialog.open(payload),
				},
				{
					key: "cancel",
					label: "Annuler la demande",
					icon: Trash2,
					variant: "destructive",
					hidden: !canCancel,
					onSelect: () => cancelDialog.open(payload),
				},
			],
		},
	];

	return (
		<ResponsiveActionMenu open={open} onOpenChange={onOpenChange}>
			{!hideTrigger && (
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0 transition-transform active:scale-95"
						aria-label="Actions"
					>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
			)}
			<ResponsiveActionMenuContent
				title="Actions remboursement"
				description={refund.orderNumber}
				sections={sections}
			/>
		</ResponsiveActionMenu>
	);
}
