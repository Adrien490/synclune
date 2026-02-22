"use client"

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog"
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
		<ResponsiveDialog open={editDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="max-w-lg">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Modifier mon avis</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Modifiez votre avis pour{" "}
						{editDialog.data?.review?.product?.title ?? "ce produit"}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>
				{editDialog.data?.review && (
					<UpdateReviewForm
						review={editDialog.data.review}
						onSuccess={() => editDialog.close()}
						onCancel={() => editDialog.close()}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	)
}
