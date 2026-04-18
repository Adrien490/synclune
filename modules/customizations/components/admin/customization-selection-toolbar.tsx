"use client";

import { CircleCheck, CircleX, Clock, EllipsisVertical, LoaderCircle, Trash2 } from "lucide-react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { SelectionToolbar } from "@/shared/components/selection-toolbar";
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
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { CUSTOMIZATION_STATUS_LABELS } from "../../constants/status.constants";
import { useBulkDeleteCustomizationRequests } from "../../hooks/use-bulk-delete-customization-requests";
import { useBulkUpdateCustomizationStatus } from "../../hooks/use-bulk-update-customization-status";
import type { CustomizationRequestStatus } from "../../types/customization.types";

interface CustomizationSelectionToolbarProps {
	pageItemIds?: string[];
}

export function CustomizationSelectionToolbar({
	pageItemIds,
}: CustomizationSelectionToolbarProps = {}) {
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
		selectedItems.forEach((id) => formData.append("requestIds", id));
		deleteAction(formData);
	};

	const handleSubmit = (formData: FormData) => {
		if (!targetStatus) return;
		selectedItems.forEach((id) => formData.append("requestIds", id));
		formData.set("status", targetStatus);
		action(formData);
	};

	const sections: ActionMenuSection[] = [
		{
			key: "progress",
			items: [
				{
					key: "in_progress",
					label: "Marquer en cours",
					icon: LoaderCircle,
					onSelect: () => handleOpenDialog("IN_PROGRESS"),
				},
				{
					key: "completed",
					label: "Marquer terminées",
					icon: CircleCheck,
					onSelect: () => handleOpenDialog("COMPLETED"),
				},
			],
		},
		{
			key: "reset",
			items: [
				{
					key: "pending",
					label: "Remettre en attente",
					icon: Clock,
					onSelect: () => handleOpenDialog("PENDING"),
				},
				{
					key: "cancelled",
					label: "Annuler",
					icon: CircleX,
					variant: "destructive",
					onSelect: () => handleOpenDialog("CANCELLED"),
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
					onSelect: () => deleteDialog.open(),
				},
			],
		},
	];

	const label = `${selectedItems.length} demande${selectedItems.length > 1 ? "s" : ""} sélectionnée${selectedItems.length > 1 ? "s" : ""}`;

	return (
		<>
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
