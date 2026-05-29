"use client";

import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { REFUND_ORDER_PICKER_DIALOG_ID } from "./refund-order-picker-dialog";

/**
 * Bouton « Créer un remboursement » du header de la liste remboursements
 * (desktop). Ouvre le sélecteur de commande `RefundOrderPickerDialog` — un
 * remboursement étant toujours rattaché à une commande payée. Sur mobile, le
 * même dialog est déclenché depuis l'item « Rembourser » du `StickyActionBar`
 * (cf. `RefundsBottomBar`).
 */
export function CreateRefundButton() {
	const { open } = useDialog(REFUND_ORDER_PICKER_DIALOG_ID);

	return (
		<Button onClick={() => open()}>
			<Plus className="size-4" aria-hidden="true" />
			Créer un remboursement
		</Button>
	);
}
