"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { Button } from "@/shared/components/ui/button";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkExportPayments } from "@/modules/payments/hooks/use-bulk-export-payments";
import { Download, Loader2 } from "lucide-react";

interface StripePaymentsSelectionToolbarProps {
	paymentIds: string[];
}

export function StripePaymentsSelectionToolbar({}: StripePaymentsSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();

	const { action, isPending } = useBulkExportPayments({
		onSuccess: () => {
			clearSelection();
		},
	});

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar>
			<span className="text-sm text-muted-foreground">
				{selectedItems.length} paiement{selectedItems.length > 1 ? "s" : ""}{" "}
				sélectionné
				{selectedItems.length > 1 ? "s" : ""}
			</span>
			<form action={action}>
				<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
				<Button
					type="submit"
					variant="outline"
					size="sm"
					disabled={isPending}
					className="h-8"
				>
					{isPending ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Export...
						</>
					) : (
						<>
							<Download className="mr-2 h-4 w-4" />
							Exporter CSV
						</>
					)}
				</Button>
			</form>
		</SelectionToolbar>
	);
}
