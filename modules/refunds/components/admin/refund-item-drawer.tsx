"use client";

import { RefundStatus, type RefundReason } from "@/app/generated/prisma/enums";
import { Check, CircleX, CreditCard, Eye, Trash2 } from "lucide-react";
import Link from "next/link";

import { AdminItemDrawer } from "@/shared/components/admin-item-drawer";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { formatDateShort } from "@/shared/utils/dates";
import { formatEuro } from "@/shared/utils/format-euro";

import {
	REFUND_REASON_LABELS,
	REFUND_STATUS_LABELS,
	REFUND_STATUS_VARIANTS,
} from "@/modules/refunds/constants/refund.constants";

import { APPROVE_REFUND_DIALOG_ID } from "./approve-refund-alert-dialog";
import { CANCEL_REFUND_DIALOG_ID } from "./cancel-refund-alert-dialog";
import { PROCESS_REFUND_DIALOG_ID } from "./process-refund-alert-dialog";
import { REJECT_REFUND_DIALOG_ID } from "./reject-refund-alert-dialog";

export const REFUND_ITEM_DRAWER_ID = "refund-item-drawer";

export interface RefundItemDrawerData {
	refund: {
		id: string;
		status: RefundStatus;
		amount: number;
		reason: RefundReason;
		createdAt: Date;
		order: {
			id: string;
			orderNumber: string;
			customerName: string | null;
			customerEmail: string;
		};
	};
	[key: string]: unknown;
}

export function RefundItemDrawer() {
	const drawer = useDialog<RefundItemDrawerData>(REFUND_ITEM_DRAWER_ID);
	const approveAlert = useAlertDialog(APPROVE_REFUND_DIALOG_ID);
	const processAlert = useAlertDialog(PROCESS_REFUND_DIALOG_ID);
	const rejectAlert = useAlertDialog(REJECT_REFUND_DIALOG_ID);
	const cancelAlert = useAlertDialog(CANCEL_REFUND_DIALOG_ID);

	const refund = drawer.data?.refund;

	if (!refund) {
		return (
			<AdminItemDrawer open={drawer.isOpen} onOpenChange={(o) => !o && drawer.close()} title="">
				{null}
			</AdminItemDrawer>
		);
	}

	const canApprove = refund.status === RefundStatus.PENDING;
	const canProcess = refund.status === RefundStatus.APPROVED;
	const canReject = refund.status === RefundStatus.PENDING;
	const canCancel =
		refund.status === RefundStatus.PENDING || refund.status === RefundStatus.APPROVED;

	const openAlert = (alert: ReturnType<typeof useAlertDialog> | typeof approveAlert) => () => {
		drawer.close();
		alert.open({
			refundId: refund.id,
			amount: refund.amount,
			orderNumber: refund.order.orderNumber,
		});
	};

	return (
		<AdminItemDrawer
			open={drawer.isOpen}
			onOpenChange={(o) => !o && drawer.close()}
			title={`Remboursement ${refund.order.orderNumber}`}
			description={`${formatEuro(refund.amount)} · ${REFUND_STATUS_LABELS[refund.status]}`}
		>
			<dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
				<dt className="text-muted-foreground">Commande</dt>
				<dd>{refund.order.orderNumber}</dd>
				<dt className="text-muted-foreground">Client</dt>
				<dd className="truncate">{refund.order.customerName ?? refund.order.customerEmail}</dd>
				<dt className="text-muted-foreground">Motif</dt>
				<dd>{REFUND_REASON_LABELS[refund.reason]}</dd>
				<dt className="text-muted-foreground">Montant</dt>
				<dd className="font-medium">{formatEuro(refund.amount)}</dd>
				<dt className="text-muted-foreground">Statut</dt>
				<dd>
					<Badge variant={REFUND_STATUS_VARIANTS[refund.status]}>
						{REFUND_STATUS_LABELS[refund.status]}
					</Badge>
				</dd>
				<dt className="text-muted-foreground">Créé le</dt>
				<dd>{formatDateShort(refund.createdAt)}</dd>
			</dl>

			<div role="group" aria-label="Actions" className="flex flex-col gap-2">
				<Button asChild variant="outline" size="lg" className="h-12 justify-start gap-3">
					<Link href={`/admin/ventes/commandes/${refund.order.id}`} onClick={() => drawer.close()}>
						<Eye className="size-4" aria-hidden="true" />
						Voir la commande
					</Link>
				</Button>
				{canApprove ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={openAlert(approveAlert)}
					>
						<Check className="size-4" aria-hidden="true" />
						Approuver
					</Button>
				) : null}
				{canProcess ? (
					<Button
						variant="outline"
						size="lg"
						className="h-12 justify-start gap-3"
						onClick={openAlert(processAlert)}
					>
						<CreditCard className="size-4" aria-hidden="true" />
						Traiter le remboursement
					</Button>
				) : null}
				{canReject ? (
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:text-destructive h-12 justify-start gap-3"
						onClick={openAlert(rejectAlert)}
					>
						<CircleX className="size-4" aria-hidden="true" />
						Refuser
					</Button>
				) : null}
				{canCancel ? (
					<Button
						variant="outline"
						size="lg"
						className="text-destructive hover:text-destructive h-12 justify-start gap-3"
						onClick={openAlert(cancelAlert)}
					>
						<Trash2 className="size-4" aria-hidden="true" />
						Annuler la demande
					</Button>
				) : null}
			</div>
		</AdminItemDrawer>
	);
}
