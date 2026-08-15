"use client";

import { CurrencyEurIcon, PackageIcon, ProhibitIcon } from "@phosphor-icons/react/ssr";
import type { RetractationStatus } from "@/app/generated/prisma/client";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/overlay-store-provider";
import {
	MARK_RETURN_RECEIVED_DIALOG_ID,
	REFUND_RETRACTATION_DIALOG_ID,
	REJECT_RETRACTATION_DIALOG_ID,
} from "../../constants/retractation.constants";
import type { RetractationDialogData } from "./retractation-dialogs";

interface RetractationDetailActionsProps {
	retractationId: string;
	orderLabel: string;
	amountTotalCents: number;
	status: RetractationStatus;
}

/**
 * Actions du workflow, alignées sur la machine monotone :
 * RECEIVED/ACKNOWLEDGED → « Colis reçu » ; AWAITING_RETURN → « Rembourser » ;
 * « Rejeter » possible tant que non remboursée. Rien sur une demande close.
 */
export function RetractationDetailActions({
	retractationId,
	orderLabel,
	amountTotalCents,
	status,
}: RetractationDetailActionsProps) {
	const receivedDialog = useAlertDialog<RetractationDialogData>(MARK_RETURN_RECEIVED_DIALOG_ID);
	const refundDialog = useAlertDialog<RetractationDialogData>(REFUND_RETRACTATION_DIALOG_ID);
	const rejectDialog = useAlertDialog<RetractationDialogData>(REJECT_RETRACTATION_DIALOG_ID);

	if (status === "REFUNDED" || status === "REJECTED") return null;

	const data: RetractationDialogData = { retractationId, orderLabel, amountTotalCents };

	return (
		<div className="flex flex-wrap items-center gap-2">
			{(status === "RECEIVED" || status === "ACKNOWLEDGED") && (
				<Button variant="outline" onClick={() => receivedDialog.open(data)}>
					<PackageIcon aria-hidden="true" />
					Colis reçu
				</Button>
			)}
			{status === "AWAITING_RETURN" && (
				<Button onClick={() => refundDialog.open(data)}>
					<CurrencyEurIcon aria-hidden="true" />
					Rembourser
				</Button>
			)}
			<Button
				variant="outline"
				className="text-destructive"
				onClick={() => rejectDialog.open(data)}
			>
				<ProhibitIcon aria-hidden="true" />
				Rejeter
			</Button>
		</div>
	);
}
