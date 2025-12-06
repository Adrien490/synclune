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
import { deleteTestimonial } from "@/modules/testimonials/actions/delete-testimonial"
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider"
import { useActionState } from "react"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"

export const DELETE_TESTIMONIAL_DIALOG_ID = "delete-testimonial"

interface DeleteDialogData extends Record<string, unknown> {
	testimonialId?: string
	authorName?: string
}

export function DeleteTestimonialAlertDialog() {
	const { isOpen, close, data } =
		useAlertDialog<DeleteDialogData>(DELETE_TESTIMONIAL_DIALOG_ID)

	const [, deleteAction, isPending] = useActionState(
		withCallbacks(
			deleteTestimonial,
			createToastCallbacks({
				onSuccess: close,
			})
		),
		undefined
	)

	return (
		<AlertDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close()
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Supprimer le témoignage ?</AlertDialogTitle>
					<AlertDialogDescription>
						Êtes-vous sûr de vouloir supprimer le témoignage de{" "}
						<strong>{data?.authorName || "ce client"}</strong> ? Cette action
						est irréversible.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
					<form action={deleteAction}>
						<input type="hidden" name="id" value={data?.testimonialId || ""} />
						<AlertDialogAction type="submit" disabled={isPending}>
							{isPending ? "Suppression..." : "Supprimer"}
						</AlertDialogAction>
					</form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
