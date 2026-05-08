"use client";

import {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogTitle,
} from "@/shared/components/ui/responsive-alert-dialog";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useDeleteReview } from "../hooks/use-delete-review";
import { DELETE_REVIEW_DIALOG_ID } from "../constants/review.constants";
import { LoaderCircle } from "lucide-react";

interface DeleteReviewData {
	reviewId: string;
	productTitle: string;
	[key: string]: unknown;
}

export function DeleteReviewAlertDialog() {
	const deleteDialog = useAlertDialog<DeleteReviewData>(DELETE_REVIEW_DIALOG_ID);

	const { action, isPending } = useDeleteReview({
		onSuccess: () => {
			deleteDialog.close();
		},
	});

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			deleteDialog.close();
		}
	};

	return (
		<ResponsiveAlertDialog open={deleteDialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveAlertDialogContent>
				<form action={action}>
					<input type="hidden" name="id" value={deleteDialog.data?.reviewId ?? ""} />

					<ResponsiveAlertDialogHeader>
						<ResponsiveAlertDialogTitle>Supprimer cet avis ?</ResponsiveAlertDialogTitle>
						<ResponsiveAlertDialogDescription>
							Cette action est irreversible. Votre avis sur{" "}
							<strong>&quot;{deleteDialog.data?.productTitle}&quot;</strong> sera definitivement
							supprime.
						</ResponsiveAlertDialogDescription>
					</ResponsiveAlertDialogHeader>
					<ResponsiveAlertDialogFooter>
						<ResponsiveAlertDialogCancel disabled={isPending}>Annuler</ResponsiveAlertDialogCancel>
						<ResponsiveAlertDialogAction
							type="submit"
							disabled={isPending}
							aria-busy={isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isPending && <LoaderCircle className="animate-spin" />}
							{isPending ? "Suppression…" : "Supprimer"}
						</ResponsiveAlertDialogAction>
					</ResponsiveAlertDialogFooter>
				</form>
			</ResponsiveAlertDialogContent>
		</ResponsiveAlertDialog>
	);
}
