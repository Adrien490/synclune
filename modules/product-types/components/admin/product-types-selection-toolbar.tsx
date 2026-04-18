"use client";

import { CircleCheck, CircleX, EllipsisVertical, Trash2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";

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
import { useBulkActivateProductTypes } from "@/modules/product-types/hooks/use-bulk-activate-product-types";
import { useBulkDeactivateProductTypes } from "@/modules/product-types/hooks/use-bulk-deactivate-product-types";

import { BULK_DELETE_PRODUCT_TYPES_DIALOG_ID } from "./bulk-delete-product-types-alert-dialog";

interface ProductTypesSelectionToolbarProps {
	pageItemIds?: string[];
}

export function ProductTypesSelectionToolbar({
	pageItemIds,
}: ProductTypesSelectionToolbarProps = {}) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_PRODUCT_TYPES_DIALOG_ID);

	const { activateProductTypes, isPending: isActivating } = useBulkActivateProductTypes({
		onSuccess: () => clearSelection(),
	});

	const { deactivateProductTypes, isPending: isDeactivating } = useBulkDeactivateProductTypes({
		onSuccess: () => clearSelection(),
	});

	const requireSelection = (action: () => void) => () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins un type de bijou.");
			return;
		}
		action();
	};

	if (selectedItems.length === 0) return null;

	const sections: ActionMenuSection[] = [
		{
			key: "toggle",
			items: [
				{
					key: "activate",
					label: "Activer",
					icon: CircleCheck,
					disabled: isActivating,
					onSelect: requireSelection(() => activateProductTypes(selectedItems)),
				},
				{
					key: "deactivate",
					label: "Désactiver",
					icon: CircleX,
					disabled: isDeactivating,
					onSelect: requireSelection(() => deactivateProductTypes(selectedItems)),
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
					onSelect: requireSelection(() =>
						bulkDeleteDialog.open({ productTypeIds: selectedItems }),
					),
				},
			],
		},
	];

	const label = `${selectedItems.length} type${selectedItems.length > 1 ? "s" : ""} sélectionné${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<SelectionToolbar pageItemIds={pageItemIds}>
			<span className="text-muted-foreground text-sm">{label}</span>
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0"
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
