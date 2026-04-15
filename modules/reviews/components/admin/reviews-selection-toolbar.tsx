"use client";

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
import { SelectionToolbar } from "@/shared/components/selection-toolbar";
import { useSelectionContext } from "@/shared/contexts/selection-context";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useBulkPublishReviews } from "@/modules/reviews/hooks/use-bulk-publish-reviews";
import { useBulkHideReviews } from "@/modules/reviews/hooks/use-bulk-hide-reviews";
import { useBulkDeleteReviews } from "@/modules/reviews/hooks/use-bulk-delete-reviews";
import {
	CircleCheck,
	EyeOff,
	LoaderCircle,
	EllipsisVertical as MoreVerticalIcon,
	Trash2,
} from "lucide-react";

export function ReviewsSelectionToolbar() {
	const { selectedItems, clearSelection } = useSelectionContext();

	const publishDialog = useDialog("bulk-publish-reviews");
	const hideDialog = useDialog("bulk-hide-reviews");
	const deleteDialog = useDialog("bulk-delete-reviews");

	const { action: publishAction, isPending: isPublishPending } = useBulkPublishReviews({
		onSuccess: () => {
			publishDialog.close();
			clearSelection();
		},
	});

	const { action: hideAction, isPending: isHidePending } = useBulkHideReviews({
		onSuccess: () => {
			hideDialog.close();
			clearSelection();
		},
	});

	const { action: deleteAction, isPending: isDeletePending } = useBulkDeleteReviews({
		onSuccess: () => {
			deleteDialog.close();
			clearSelection();
		},
	});

	const isPending = isPublishPending || isHidePending || isDeletePending;

	if (selectedItems.length === 0) return null;

	return (
		<>
			<SelectionToolbar>
				<span className="text-muted-foreground text-sm">
					{selectedItems.length} avis sélectionné{selectedItems.length > 1 ? "s" : ""}
				</span>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
							<span className="sr-only">Ouvrir le menu</span>
							<MoreVerticalIcon className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-50">
						<DropdownMenuItem onClick={() => publishDialog.open()}>
							<CircleCheck className="h-4 w-4" />
							Publier
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => hideDialog.open()}>
							<EyeOff className="h-4 w-4" />
							Masquer
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => deleteDialog.open()} variant="destructive">
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SelectionToolbar>

			{/* Publish Dialog */}
			<AlertDialog
				open={publishDialog.isOpen}
				onOpenChange={(open) => (open ? publishDialog.open() : publishDialog.close())}
			>
				<AlertDialogContent>
					<form action={publishAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Publier les avis</AlertDialogTitle>
							<AlertDialogDescription>
								Publier <span className="font-semibold">{selectedItems.length} avis</span>{" "}
								sélectionné{selectedItems.length > 1 ? "s" : ""} ?
								<br />
								<br />
								Les avis publiés seront visibles par les clients sur le site.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isPublishPending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Publication...
									</>
								) : (
									<>
										<CircleCheck className="mr-2 h-4 w-4" />
										Publier
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Hide Dialog */}
			<AlertDialog
				open={hideDialog.isOpen}
				onOpenChange={(open) => (open ? hideDialog.open() : hideDialog.close())}
			>
				<AlertDialogContent>
					<form action={hideAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Masquer les avis</AlertDialogTitle>
							<AlertDialogDescription>
								Masquer <span className="font-semibold">{selectedItems.length} avis</span>{" "}
								sélectionné{selectedItems.length > 1 ? "s" : ""} ?
								<br />
								<br />
								Les avis masqués ne seront plus visibles par les clients.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Annuler
							</AlertDialogCancel>
							<Button type="submit" disabled={isPending}>
								{isHidePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
										Masquage...
									</>
								) : (
									<>
										<EyeOff className="mr-2 h-4 w-4" />
										Masquer
									</>
								)}
							</Button>
						</AlertDialogFooter>
					</form>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Dialog */}
			<AlertDialog
				open={deleteDialog.isOpen}
				onOpenChange={(open) => (open ? deleteDialog.open() : deleteDialog.close())}
			>
				<AlertDialogContent>
					<form action={deleteAction}>
						<input type="hidden" name="ids" value={JSON.stringify(selectedItems)} />
						<AlertDialogHeader>
							<AlertDialogTitle>Supprimer les avis</AlertDialogTitle>
							<AlertDialogDescription>
								Supprimer <span className="font-semibold">{selectedItems.length} avis</span>{" "}
								sélectionné{selectedItems.length > 1 ? "s" : ""} ?
								<br />
								<br />
								Cette action est irréversible. Les avis et leurs médias seront supprimés.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel type="button" disabled={isPending}>
								Retour
							</AlertDialogCancel>
							<Button type="submit" variant="destructive" disabled={isPending}>
								{isDeletePending ? (
									<>
										<LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
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
