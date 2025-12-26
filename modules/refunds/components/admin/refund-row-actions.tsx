"use client";

import { RefundStatus } from "@/app/generated/prisma/browser";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import {
	Check,
	CreditCard,
	Eye,
	MoreVertical,
	XCircle,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { APPROVE_REFUND_DIALOG_ID } from "./approve-refund-alert-dialog";
import { PROCESS_REFUND_DIALOG_ID } from "./process-refund-alert-dialog";
import { REJECT_REFUND_DIALOG_ID } from "./reject-refund-alert-dialog";
import { CANCEL_REFUND_DIALOG_ID } from "./cancel-refund-alert-dialog";

interface RefundRowActionsProps {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		orderId: string;
		orderNumber: string;
	};
}

export function RefundRowActions({ refund }: RefundRowActionsProps) {
	const approveDialog = useAlertDialog(APPROVE_REFUND_DIALOG_ID);
	const processDialog = useAlertDialog(PROCESS_REFUND_DIALOG_ID);
	const rejectDialog = useAlertDialog(REJECT_REFUND_DIALOG_ID);
	const cancelDialog = useAlertDialog(CANCEL_REFUND_DIALOG_ID);

	const canApprove = refund.status === RefundStatus.PENDING;
	const canProcess = refund.status === RefundStatus.APPROVED;
	const canReject = refund.status === RefundStatus.PENDING;
	const canCancel =
		refund.status === RefundStatus.PENDING ||
		refund.status === RefundStatus.APPROVED;

	const handleApprove = () => {
		approveDialog.open({
			refundId: refund.id,
			amount: refund.amount,
			orderNumber: refund.orderNumber,
		});
	};

	const handleProcess = () => {
		processDialog.open({
			refundId: refund.id,
			amount: refund.amount,
			orderNumber: refund.orderNumber,
		});
	};

	const handleReject = () => {
		rejectDialog.open({
			refundId: refund.id,
			amount: refund.amount,
			orderNumber: refund.orderNumber,
		});
	};

	const handleCancel = () => {
		cancelDialog.open({
			refundId: refund.id,
			amount: refund.amount,
			orderNumber: refund.orderNumber,
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-11 w-11 p-0 active:scale-95 transition-transform" aria-label="Actions">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{/* Voir la commande associée */}
				<DropdownMenuItem asChild>
					<Link href={`/admin/ventes/commandes/${refund.orderId}`}>
						<Eye className="h-4 w-4" />
						Voir la commande
					</Link>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				{canApprove && (
					<DropdownMenuItem onClick={handleApprove}>
						<Check className="h-4 w-4" />
						Approuver
					</DropdownMenuItem>
				)}

				{canProcess && (
					<DropdownMenuItem onClick={handleProcess}>
						<CreditCard className="h-4 w-4" />
						Traiter le remboursement
					</DropdownMenuItem>
				)}

				{canReject && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleReject} className="text-destructive">
							<XCircle className="h-4 w-4" />
							Refuser
						</DropdownMenuItem>
					</>
				)}

				{canCancel && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleCancel} className="text-destructive">
							<Trash2 className="h-4 w-4" />
							Annuler la demande
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
