"use client"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider"
import { useDeleteReview } from "../hooks/use-delete-review"
import { DELETE_REVIEW_DIALOG_ID } from "../constants/dialog.constants"

interface DeleteReviewData {
	reviewId: string
	productTitle: string
	[key: string]: unknown
}

export function DeleteReviewAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteReviewData>(DELETE_REVIEW_DIALOG_ID)

	const { action, isPending } = useDeleteReview({
		onSuccess: () => {
			deleteDialog.close()
		},
	})

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close()
		}
	}

	return (
		<AlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<AlertDialogContent>
				<form action={action}>
					<input
						type="hidden"
						name="id"
						value={deleteDialog.data?.reviewId ?? ""}
					/>

					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cet avis ?</AlertDialogTitle>
						<AlertDialogDescription>
							Cette action est irreversible. Votre avis sur{" "}
							<strong>&quot;{deleteDialog.data?.productTitle}&quot;</strong>{" "}
							sera definitivement supprime.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button" disabled={isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							type="submit"
							disabled={isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</form>
			</AlertDialogContent>
		</AlertDialog>
	)
}
