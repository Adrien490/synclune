"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { OrderNotesPanel } from "./order-notes-panel";

export const ORDER_NOTES_DIALOG_ID = "order-notes";

type OrderNotesDialogData = {
	orderId: string;
	orderNumber: string;
	[key: string]: unknown;
};

export function OrderNotesDialog() {
	const { isOpen, data, close } = useDialog<OrderNotesDialogData>(ORDER_NOTES_DIALOG_ID);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="flex max-h-[80vh] flex-col sm:max-w-150">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>Notes internes</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Commande : <span className="font-semibold tabular-nums">{data?.orderNumber}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{isOpen && data?.orderId ? (
					<OrderNotesPanel key={data.orderId} orderId={data.orderId} onClose={close} />
				) : (
					<div className="flex shrink-0 justify-end pt-4">
						<Button variant="outline" onClick={close}>
							Fermer
						</Button>
					</div>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
