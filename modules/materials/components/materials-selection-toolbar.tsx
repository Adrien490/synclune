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
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useBulkDeleteMaterials } from "@/modules/materials/hooks/use-bulk-delete-materials";
import { useBulkToggleMaterialStatus } from "@/modules/materials/hooks/use-bulk-toggle-material-status";
import { CheckCircle2, Loader2, MoreVertical, Trash2, XCircle } from "lucide-react";
import { useState } from "react";

export function MaterialsSelectionToolbar() {
	const { selectedItems, clearSelection } = useSelectionContext();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [activateDialogOpen, setActivateDialogOpen] = useState(false);
	const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);

	const { action: deleteAction, isPending: isDeletePending } = useBulkDeleteMaterials({
		onSuccess: () => {
			setDeleteDialogOpen(false);
			clearSelection();
		},
	});

	const { action: toggleAction, isPending: isTogglePending } = useBulkToggleMaterialStatus({
		onSuccess: () => {
			setActivateDialogOpen(false);
			setDeactivateDialogOpen(false);
			clearSelection();
		},
	});

	const handleDeleteClick = () => {
		if (selectedItems.length === 0) return;
		setDeleteDialogOpen(true);
	};

	const handleActivateClick = () => {
		if (selectedItems.length === 0) return;
		setActivateDialogOpen(true);
	};

	const handleDeactivateClick = () => {
		if (selectedItems.length === 0) return;
		setDeactivateDialogOpen(true);
	};

	const isPending = isDeletePending || isTogglePending;

	if (selectedItems.length === 0) return null;

	return (
		<>
			<SelectionToolbar>
				<span className="text-sm text-muted-foreground">
					{selectedItems.length} matériau{selectedItems.length > 1 ? "x" : ""}{" "}
					sélectionné
					{selectedItems.length > 1 ? "s" : ""}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<span className="sr-only">Ouvrir le menu</span>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-50">
						<DropdownMenuItem onClick={handleActivateClick}>
							<CheckCircle2 className="h-4 w-4" />
							Activer
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleDeactivateClick}>
							<XCircle className="h-4 w-4" />
							Desactiver
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleDeleteClick} variant="destructive">
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SelectionToolbar>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input
							type="hidden"
							name="ids"
							value={JSON.stringify(selectedItems)}
						/>
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer les materiaux</AlertDialogTitle>
							<AlertDialogDescription>
								Es-tu sûr(e) de vouloir supprimer{" "}
								<span className="font-semibold">
									{selectedItems.length} materiau
									{selectedItems.length > 1 ? "x" : ""}
								</span>{" "}
								?
								<br />
								<br />
								<span className="text-destructive font-medium">
									Cette action est irreversible.
								</span>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button
								type="submit"
								disabled={isPending}
							>
								{isDeletePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

			<AlertDialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
				<AlertDialogContent>
					<form action={toggleAction}>
						<input
							type="hidden"
							name="ids"
							value={JSON.stringify(selectedItems)}
						/>
						<input type="hidden" name="isActive" value="true" />
						<AlertDialogHeader>
							<AlertDialogTitle>Activer les materiaux</AlertDialogTitle>
							<AlertDialogDescription>
								Es-tu sûr(e) de vouloir activer{" "}
								<span className="font-semibold">
									{selectedItems.length} materiau
									{selectedItems.length > 1 ? "x" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Les materiaux actives seront disponibles pour les variantes de produits.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isTogglePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Activation...
									</>
								) : (
									<>
										<CheckCircle2 className="mr-2 h-4 w-4" />
										Activer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
				<AlertDialogContent>
					<form action={toggleAction}>
						<input
							type="hidden"
							name="ids"
							value={JSON.stringify(selectedItems)}
						/>
						<input type="hidden" name="isActive" value="false" />
						<AlertDialogHeader>
							<AlertDialogTitle>Desactiver les materiaux</AlertDialogTitle>
							<AlertDialogDescription>
								Es-tu sûr(e) de vouloir désactiver{" "}
								<span className="font-semibold">
									{selectedItems.length} materiau
									{selectedItems.length > 1 ? "x" : ""}
								</span>{" "}
								?
								<br />
								<br />
								Les materiaux desactives ne seront plus disponibles pour les nouvelles variantes.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isTogglePending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Desactivation...
									</>
								) : (
									<>
										<XCircle className="mr-2 h-4 w-4" />
										Desactiver
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
