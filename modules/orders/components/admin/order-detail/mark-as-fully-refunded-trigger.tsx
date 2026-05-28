"use client";

import { Banknote } from "lucide-react";
import type { InvoiceStatus } from "@/app/generated/prisma/browser";

import { MARK_AS_FULLY_REFUNDED_DIALOG_ID } from "@/modules/orders/components/admin/mark-as-fully-refunded-alert-dialog";
import { Button } from "@/shared/components/ui/button";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

interface MarkAsFullyRefundedTriggerProps {
	orderId: string;
	orderNumber: string;
	invoiceStatus: InvoiceStatus | null;
	invoiceNumber: string | null;
}

export function MarkAsFullyRefundedTrigger({
	orderId,
	orderNumber,
	invoiceStatus,
	invoiceNumber,
}: MarkAsFullyRefundedTriggerProps) {
	const dialog = useAlertDialog(MARK_AS_FULLY_REFUNDED_DIALOG_ID);

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={() =>
				dialog.open({
					orderId,
					orderNumber,
					invoiceStatus,
					invoiceNumber,
				})
			}
		>
			<Banknote className="size-4" aria-hidden="true" />
			Marquer remboursée
		</Button>
	);
}
