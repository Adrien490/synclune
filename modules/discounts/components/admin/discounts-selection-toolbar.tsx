"use client";

import { EllipsisVertical, Power, PowerOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { Button } from "@/shared/components/ui/button";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useBulkToggleDiscountStatus } from "@/modules/discounts/hooks/use-bulk-toggle-discount-status";

import { BULK_DELETE_DISCOUNTS_DIALOG_ID } from "./bulk-delete-discounts-alert-dialog";

interface DiscountsSelectionToolbarProps {
	discountIds: string[];
	discounts: Array<{
		id: string;
		code: string;
		usageCount: number;
	}>;
}

export function DiscountsSelectionToolbar({
	discountIds,
	discounts,
}: DiscountsSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_DISCOUNTS_DIALOG_ID);

	const { toggle, isPending } = useBulkToggleDiscountStatus({
		onSuccess: clearSelection,
	});

	const requireSelection = (action: () => void) => () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un code promo.");
			return;
		}
		action();
	};

	const handleDelete = requireSelection(() => {
		const selectedDiscounts = discounts.filter((d) => selectedItems.includes(d.id));
		const totalUsageCount = selectedDiscounts.reduce((sum, d) => sum + d.usageCount, 0);
		bulkDeleteDialog.open({ discountIds: selectedItems, totalUsageCount });
	});

	const handleBulkToggle = (activate: boolean) =>
		requireSelection(() => toggle(selectedItems, activate))();

	if (selectedItems.length === 0) return null;

	const sections: ActionMenuSection[] = [
		{
			key: "toggle",
			items: [
				{
					key: "activate",
					label: "Activer",
					icon: Power,
					disabled: isPending,
					onSelect: () => handleBulkToggle(true),
				},
				{
					key: "deactivate",
					label: "Désactiver",
					icon: PowerOff,
					disabled: isPending,
					onSelect: () => handleBulkToggle(false),
				},
			],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					disabled: isPending,
					onSelect: handleDelete,
				},
			],
		},
	];

	const label = `${selectedItems.length} code${selectedItems.length > 1 ? "s" : ""} promo sélectionné${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<SelectionToolbar pageItemIds={discountIds}>
			<span className="text-muted-foreground text-sm">{label}</span>
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0"
						disabled={isPending}
						aria-label="Actions de la sélection"
					>
						<span className="sr-only">Ouvrir le menu</span>
						<EllipsisVertical className="h-4 w-4" />
					</Button>
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions groupées"
					description={label}
					sections={sections}
				/>
			</ResponsiveActionMenu>
		</SelectionToolbar>
	);
}
