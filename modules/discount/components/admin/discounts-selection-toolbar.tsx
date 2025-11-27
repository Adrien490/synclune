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
import { useTransition } from "react";
import { BULK_DELETE_DISCOUNTS_DIALOG_ID } from "./bulk-delete-discounts-alert-dialog";
import { bulkToggleDiscountStatus } from "@/modules/discount/actions/bulk-toggle-discount-status";
import { ActionStatus } from "@/shared/types/server-action";

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
	const [isPending, startTransition] = useTransition();

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

		startTransition(async () => {
			const formData = new FormData();
			selectedItems.forEach((id) => formData.append("ids", id));
			formData.append("isActive", activate.toString());

			const result = await bulkToggleDiscountStatus(undefined, formData);
			if (result.status === ActionStatus.SUCCESS) {
				toast.success(
					activate
						? `${selectedItems.length} code(s) promo activé(s)`
						: `${selectedItems.length} code(s) promo désactivé(s)`
				);
				clearSelection();
			} else {
				toast.error(result.message || "Une erreur est survenue");
			}
		});
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
				<DropdownMenuContent align="end" className="w-[200px]">
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
