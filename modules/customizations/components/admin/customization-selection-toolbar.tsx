"use client";

import {
	CheckCircle,
	Clock,
	Loader2,
	MoreVertical,
	XCircle,
} from "lucide-react";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import type { CustomizationRequestStatus } from "../../types/customization.types";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { useSelectionContext } from "@/shared/contexts/selection-context";

import { useBulkUpdateCustomizationStatus } from "../../hooks/use-bulk-update-customization-status";
import { CUSTOMIZATION_STATUS_LABELS } from "../../constants/status.constants";

export function CustomizationSelectionToolbar() {
	const { selectedItems, clearSelection } = useSelectionContext();
	const statusDialog = useDialog<{ targetStatus: CustomizationRequestStatus }>("bulk-customization-status");

	const { action, isPending } = useBulkUpdateCustomizationStatus({
		onSuccess: () => {
			statusDialog.close();
			clearSelection();
		},
	});

	if (selectedItems.length === 0) return null;

	const handleOpenDialog = (status: CustomizationRequestStatus) => {
		statusDialog.open({ targetStatus: status });
	};

	const targetStatus = statusDialog.data?.targetStatus ?? null;

	const handleSubmit = (formData: FormData) => {
		if (!targetStatus) return;

		// Add all selected IDs to form data
		selectedItems.forEach((id) => {
			formData.append("requestIds", id);
		});
		formData.set("status", targetStatus);

		action(formData);
	};

	return (
		<>
			<SelectionToolbar>
				<span className="text-sm text-muted-foreground">
					{selectedItems.length} demande{selectedItems.length > 1 ? "s" : ""}{" "}
					sélectionnée{selectedItems.length > 1 ? "s" : ""}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<span className="sr-only">Ouvrir le menu</span>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-50">
						<DropdownMenuItem onClick={() => handleOpenDialog("IN_PROGRESS")}>
							<Loader2 className="h-4 w-4" />
							Marquer en cours
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleOpenDialog("COMPLETED")}>
							<CheckCircle className="h-4 w-4" />
							Marquer terminées
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => handleOpenDialog("PENDING")}>
							<Clock className="h-4 w-4" />
							Remettre en attente
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => handleOpenDialog("CANCELLED")}
							className="text-destructive focus:text-destructive"
						>
							<XCircle className="h-4 w-4" />
							Annuler
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SelectionToolbar>

			{/* Confirmation Dialog */}
			<AlertDialog open={statusDialog.isOpen} onOpenChange={(open) => open ? statusDialog.open() : statusDialog.close()}>
				<AlertDialogContent>
					<form action={handleSubmit}>
						<AlertDialogHeader>
							<AlertDialogTitle>Confirmer le changement de statut</AlertDialogTitle>
							<AlertDialogDescription>
								Changer le statut de{" "}
								<span className="font-semibold">
									{selectedItems.length} demande
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								en{" "}
								<span className="font-semibold">
									{targetStatus
										? CUSTOMIZATION_STATUS_LABELS[targetStatus]
										: ""}
								</span>{" "}
								?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending} aria-busy={isPending}>
								{isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Mise à jour...
									</>
								) : (
									"Confirmer"
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
