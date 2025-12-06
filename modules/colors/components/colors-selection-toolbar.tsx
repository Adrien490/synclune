"use client";

import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import { useBulkDeleteColors } from "@/modules/colors/hooks/use-bulk-delete-colors";
import { Loader2, MoreVertical, Trash2 } from "lucide-react";
import { useState } from "react";

interface ColorsSelectionToolbarProps {
	colorIds: string[];
}

export function ColorsSelectionToolbar({}: ColorsSelectionToolbarProps) {
	const { selectedItems, clearSelection } = useSelectionContext();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const { action, isPending } = useBulkDeleteColors({
		onSuccess: () => {
			setDeleteDialogOpen(false);
			clearSelection();
		},
	});

	const handleDeleteClick = () => {
		if (selectedItems.length === 0) {
			return;
		}
		setDeleteDialogOpen(true);
	};

	if (selectedItems.length === 0) return null;

	return (
		<>
			<SelectionToolbar>
				<span className="text-sm text-muted-foreground">
					{selectedItems.length} couleur{selectedItems.length > 1 ? "s" : ""}{" "}
					sélectionnée
					{selectedItems.length > 1 ? "s" : ""}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<span className="sr-only">Ouvrir le menu</span>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[200px]">
						<DropdownMenuItem onClick={handleDeleteClick} variant="destructive">
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SelectionToolbar>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<form action={action}>
						<input
							type="hidden"
							name="ids"
							value={JSON.stringify(selectedItems)}
						/>
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer les couleurs</AlertDialogTitle>
							<AlertDialogDescription>
								Es-tu sûr(e) de vouloir supprimer{" "}
								<span className="font-semibold">
									{selectedItems.length} couleur
									{selectedItems.length > 1 ? "s" : ""}
								</span>{" "}
								?
								<br />
								<br />
								<span className="text-destructive font-medium">
									Cette action est irréversible.
								</span>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button
								type="submit"
								variant="destructive"
								disabled={isPending}
							>
								{isPending ? (
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
		</>
	);
}
