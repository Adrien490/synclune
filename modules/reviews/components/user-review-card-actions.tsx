"use client"

import { Edit2, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider"
import { EDIT_REVIEW_DIALOG_ID, DELETE_REVIEW_DIALOG_ID } from "../constants/dialog.constants"
import type { ReviewUser } from "../types/review.types"

interface UserReviewCardActionsProps {
	review: ReviewUser
}

export function UserReviewCardActions({ review }: UserReviewCardActionsProps) {
	const editDialog = useDialog(EDIT_REVIEW_DIALOG_ID)
	const deleteDialog = useAlertDialog(DELETE_REVIEW_DIALOG_ID)

	return (
		<div className="flex items-center gap-2 pt-2" role="group" aria-label="Actions sur l'avis">
			<Button
				variant="outline"
				size="sm"
				onClick={() => editDialog.open({ review })}
			>
				<Edit2 className="size-4 mr-1" aria-hidden="true" />
				Modifier
			</Button>

			<Button
				variant="outline"
				size="sm"
				className="text-destructive hover:text-destructive"
				onClick={() =>
					deleteDialog.open({
						reviewId: review.id,
						productTitle: review.product.title,
					})
				}
			>
				<Trash2 className="size-4 mr-1" aria-hidden="true" />
				Supprimer
			</Button>
		</div>
	)
}
