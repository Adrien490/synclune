"use client"

import { SelectionToolbar } from "@/shared/components/selection-toolbar"
import { Button } from "@/shared/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { useSelectionContext } from "@/shared/contexts/selection-context"
import { useBulkDeleteTestimonials } from "../../hooks/use-bulk-delete-testimonials"
import { useBulkTogglePublish } from "../../hooks/use-bulk-toggle-publish"
import { Eye, EyeOff, Loader2, MoreVertical, Trash2 } from "lucide-react"
import { useState } from "react"

/**
 * Toolbar de sélection en masse pour les témoignages
 * Permet de publier, dépublier ou supprimer plusieurs témoignages
 */
export function TestimonialsSelectionToolbar() {
	const { selectedItems, clearSelection } = useSelectionContext()
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	const { action: deleteAction, isPending: isDeleting } =
		useBulkDeleteTestimonials({
			onSuccess: () => {
				setDeleteDialogOpen(false)
				clearSelection()
			},
		})

	const {
		handlePublish,
		handleUnpublish,
		isPending: isToggling,
	} = useBulkTogglePublish({
		onSuccess: () => {
			clearSelection()
		},
	})

	const handleDeleteClick = () => {
		if (selectedItems.length === 0) return
		setDeleteDialogOpen(true)
	}

	const handlePublishClick = () => {
		if (selectedItems.length === 0) return
		handlePublish(selectedItems)
	}

	const handleUnpublishClick = () => {
		if (selectedItems.length === 0) return
		handleUnpublish(selectedItems)
	}

	if (selectedItems.length === 0) return null

	const isPending = isDeleting || isToggling

	return (
		<>
			<SelectionToolbar>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0"
							disabled={isPending}
						>
							<span className="sr-only">Ouvrir le menu</span>
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[200px]">
						<DropdownMenuItem
							onClick={handlePublishClick}
							disabled={isPending}
						>
							<Eye className="h-4 w-4" />
							Publier
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={handleUnpublishClick}
							disabled={isPending}
						>
							<EyeOff className="h-4 w-4" />
							Dépublier
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleDeleteClick}
							variant="destructive"
							disabled={isPending}
						>
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
							<AlertDialogTitle>Supprimer les témoignages</AlertDialogTitle>
							<AlertDialogDescription>
								Es-tu sûr(e) de vouloir supprimer{" "}
								<span className="font-semibold">
									{selectedItems.length} témoignage
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
							<AlertDialogCancel type="button" disabled={isDeleting}>
								Annuler
							</AlertDialogCancel>
							<Button
								type="submit"
								variant="destructive"
								disabled={isDeleting}
							>
								{isDeleting ? (
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
	)
}
