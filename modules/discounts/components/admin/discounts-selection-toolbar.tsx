"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { MoreVertical, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { BULK_DELETE_DISCOUNTS_DIALOG_ID } from "./bulk-delete-discounts-alert-dialog";
import { useBulkToggleDiscountStatus } from "@/modules/discounts/hooks/use-bulk-toggle-discount-status";

interface DiscountsSelectionToolbarProps {
	discountIds: string[];
	discounts: Array<{
		id: string;
		code: string;
		usageCount: number;
	}>;
}

export function DiscountsSelectionToolbar({
	discounts,
}: DiscountsSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_DISCOUNTS_DIALOG_ID);

	const { toggle, isPending } = useBulkToggleDiscountStatus({
		onSuccess: clearSelection,
	});

	const handleDelete = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un code promo.");
			return;
		}

		const selectedDiscounts = discounts.filter((d) =>
			selectedItems.includes(d.id)
		);
		const totalUsageCount = selectedDiscounts.reduce(
			(sum, d) => sum + d.usageCount,
			0
		);

		bulkDeleteDialog.open({
			discountIds: selectedItems,
			totalUsageCount,
		});
	};

	const handleBulkToggle = (activate: boolean) => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un code promo.");
			return;
		}

		toggle(selectedItems, activate);
	};

	if (selectedItems.length === 0) return null;

	return (
		<SelectionToolbar>
			<span className="text-sm text-muted-foreground">
				{selectedItems.length} code{selectedItems.length > 1 ? "s" : ""} promo
				sélectionné{selectedItems.length > 1 ? "s" : ""}
			</span>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isPending}>
						<span className="sr-only">Ouvrir le menu</span>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-50">
					<DropdownMenuItem onClick={() => handleBulkToggle(true)} disabled={isPending}>
						<Power className="h-4 w-4" />
						Activer
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => handleBulkToggle(false)} disabled={isPending}>
						<PowerOff className="h-4 w-4" />
						Désactiver
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={handleDelete} variant="destructive" disabled={isPending}>
						<Trash2 className="h-4 w-4" />
						Supprimer
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SelectionToolbar>
	);
}
