"use client";

import { CircleCheck, Clock, LoaderCircle, EllipsisVertical, CircleX, Trash2 } from "lucide-react";
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
import { useBulkDeleteCustomizationRequests } from "../../hooks/use-bulk-delete-customization-requests";
import { CUSTOMIZATION_STATUS_LABELS } from "../../constants/status.constants";

export function CustomizationSelectionToolbar() {
	const { selectedItems, clearSelection } = useSelectionContext();
	const statusDialog = useDialog<{ targetStatus: CustomizationRequestStatus }>(
		"bulk-customization-status",
	);
	const deleteDialog = useDialog("bulk-customization-delete");

	const { action, isPending } = useBulkUpdateCustomizationStatus({
		onSuccess: () => {
			statusDialog.close();
			clearSelection();
		},
	});

	const { action: deleteAction, isPending: isDeletePending } = useBulkDeleteCustomizationRequests({
		onSuccess: () => {
			deleteDialog.close();
			clearSelection();
		},
	});

	if (selectedItems.length === 0) return null;

	const handleOpenDialog = (status: CustomizationRequestStatus) => {
		statusDialog.open({ targetStatus: status });
	};

	const targetStatus = statusDialog.data?.targetStatus ?? null;

	const handleBulkDelete = (formData: FormData) => {
		selectedItems.forEach((id) => {
			formData.append("requestIds", id);
		});
		deleteAction(formData);
	};

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
				<span className="text-muted-foreground text-sm">
					{selectedItems.length} demande{selectedItems.length > 1 ? "s" : ""} sélectionnée
					{selectedItems.length > 1 ? "s" : ""}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<span className="sr-only">Ouvrir le menu</span>
							<EllipsisVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-50">
						<DropdownMenuItem onClick={() => handleOpenDialog("IN_PROGRESS")}>
							<LoaderCircle className="h-4 w-4" />
							Marquer en cours
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleOpenDialog("COMPLETED")}>
							<CircleCheck className="h-4 w-4" />
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
							<CircleX className="h-4 w-4" />
							Annuler
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => deleteDialog.open()} variant="destructive">
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SelectionToolbar>

			{/* Confirmation Dialog */}
			<AlertDialog
				open={statusDialog.isOpen}
				onOpenChange={(open) => (open ? statusDialog.open() : statusDialog.close())}
			>
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
									{targetStatus ? CUSTOMIZATION_STATUS_LABELS[targetStatus] : ""}
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
										<LoaderCircle className="mr-2 h-4 w-4 motion-safe:animate-spin" />
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

			{/* Bulk Delete Dialog */}
			<AlertDialog
				open={deleteDialog.isOpen}
				onOpenChange={(open) => (open ? deleteDialog.open() : deleteDialog.close())}
			>
				<AlertDialogContent>
					<form action={handleBulkDelete}>
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer les demandes</AlertDialogTitle>
							<AlertDialogDescription>
								Supprimer{" "}
								<span className="font-semibold">
									{selectedItems.length} demande{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								définitivement ?
								<br />
								<br />
								Cette action est irréversible.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isDeletePending}>
								Annuler
							</AlertDialogCancel>
							<Button
								type="submit"
								variant="destructive"
								disabled={isDeletePending}
								aria-busy={isDeletePending}
							>
								{isDeletePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 motion-safe:animate-spin" />
										Suppression...
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										Supprimer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
