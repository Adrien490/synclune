"use client"

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { EDIT_REVIEW_DIALOG_ID } from "../constants/review.constants"
import { UpdateReviewForm } from "./update-review-form"
import type { ReviewUser } from "../types/review.types"

interface EditReviewData {
	review: ReviewUser
	[key: string]: unknown
}

export function EditReviewDialog() {
	const editDialog = useDialog<EditReviewData>(EDIT_REVIEW_DIALOG_ID)

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			editDialog.close()
		}
	}

	return (
		<Dialog open={editDialog.isOpen} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Modifier mon avis</DialogTitle>
					<DialogDescription>
						Modifiez votre avis pour{" "}
						{editDialog.data?.review?.product?.title ?? "ce produit"}
					</DialogDescription>
				</DialogHeader>
				{editDialog.data?.review && (
					<UpdateReviewForm
						review={editDialog.data.review}
						onSuccess={() => editDialog.close()}
						onCancel={() => editDialog.close()}
					/>
				)}
			</DialogContent>
		</Dialog>
	)
}
