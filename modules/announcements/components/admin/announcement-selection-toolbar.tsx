"use client";

import { EllipsisVertical, Trash2 } from "lucide-react";
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
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";

import { BULK_DELETE_ANNOUNCEMENTS_DIALOG_ID } from "./bulk-delete-announcements-alert-dialog";

interface AnnouncementSelectionToolbarProps {
	announcementIds: string[];
}

export function AnnouncementSelectionToolbar({
	announcementIds,
}: AnnouncementSelectionToolbarProps) {
	const { selectedItems } = useSelectionContext();
	const bulkDeleteDialog = useAlertDialog(BULK_DELETE_ANNOUNCEMENTS_DIALOG_ID);
	const haptic = useHaptic();

	const handleDelete = () => {
		if (selectedItems.length === 0) {
			toast.error("Veuillez sélectionner au moins une annonce.");
			return;
		}
		bulkDeleteDialog.open({ announcementIds: selectedItems });
	};

	if (selectedItems.length === 0) return null;

	const sections: ActionMenuSection[] = [
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					icon: Trash2,
					variant: "destructive",
					onSelect: handleDelete,
				},
			],
		},
	];

	const label = `${selectedItems.length} annonce${selectedItems.length > 1 ? "s" : ""} sélectionnée${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<SelectionToolbar pageItemIds={announcementIds}>
			<span
				className="text-muted-foreground text-sm"
				role="status"
				aria-live="polite"
				aria-atomic="true"
			>
				{label}
			</span>
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-11 w-11 p-0"
						aria-label="Actions de la sélection"
						onPointerDown={() => haptic("selection")}
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
